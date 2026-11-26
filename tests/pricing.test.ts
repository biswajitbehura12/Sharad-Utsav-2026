// ============================================================
// Tests for pricing logic — the parts where being wrong costs money.
// ============================================================

import { describe, it, expect } from 'vitest';
import { calculatePriceBreakdown } from '../src/lib/pricing';
import {
  type BookingRequest,
  type AttendeeInput,
  TicketType,
  ExtraType,
  FESTIVAL_DAYS,
} from '../src/lib/types';

function makeBooking(
  attendees: AttendeeInput[],
  promoCode?: string
): BookingRequest {
  return {
    booker: { name: 'Test Booker', email: 'test@test.com', phone: '5551234567', age: 30 },
    attendees,
    promoCode,
    clientRequestId: 'test-' + Math.random(),
  };
}

function makeAdultDayPass(name: string, days: string[]): AttendeeInput {
  return {
    name,
    age: 30,
    email: 'adult@test.com',
    phone: '5551234567',
    ticketType: TicketType.DAY_PASS_ADULT,
    selectedDays: days as typeof FESTIVAL_DAYS[number][],
    extras: [],
  };
}

function makeChildDayPass(name: string, days: string[]): AttendeeInput {
  return {
    name,
    age: 8,
    ticketType: TicketType.DAY_PASS_CHILD,
    selectedDays: days as typeof FESTIVAL_DAYS[number][],
    extras: [],
  };
}

describe('Price Calculation', () => {
  describe('Day Pass pricing', () => {
    it('charges $15/day for adult day pass', () => {
      const booking = makeBooking([
        makeAdultDayPass('Alice', ['2026-11-10']),
      ]);
      const result = calculatePriceBreakdown(booking);
      expect(result.subtotalCents).toBe(1500);
      expect(result.totalCents).toBe(1500);
    });

    it('charges $15/day x number of days for adult', () => {
      const booking = makeBooking([
        makeAdultDayPass('Alice', ['2026-11-10', '2026-11-11', '2026-11-12']),
      ]);
      const result = calculatePriceBreakdown(booking);
      expect(result.subtotalCents).toBe(4500); // $15 × 3 = $45
    });

    it('charges $8/day for child day pass', () => {
      const booking = makeBooking([
        makeChildDayPass('Bobby', ['2026-11-10', '2026-11-11']),
      ]);
      const result = calculatePriceBreakdown(booking);
      expect(result.subtotalCents).toBe(1600); // $8 × 2 = $16
    });

    it('handles multiple attendees correctly', () => {
      const booking = makeBooking([
        makeAdultDayPass('Alice', ['2026-11-10']),
        makeChildDayPass('Bobby', ['2026-11-10']),
      ]);
      const result = calculatePriceBreakdown(booking);
      expect(result.subtotalCents).toBe(2300); // $15 + $8 = $23
    });
  });

  describe('All-Day Pass pricing', () => {
    it('charges $60 flat for adult all-day pass', () => {
      const booking = makeBooking([{
        name: 'Alice',
        age: 30,
        email: 'alice@test.com',
        phone: '5551234567',
        ticketType: TicketType.ALL_DAY_ADULT,
        selectedDays: [...FESTIVAL_DAYS],
        extras: [],
      }]);
      const result = calculatePriceBreakdown(booking);
      expect(result.subtotalCents).toBe(6000);
    });

    it('charges $30 flat for child all-day pass', () => {
      const booking = makeBooking([{
        name: 'Bobby',
        age: 8,
        ticketType: TicketType.ALL_DAY_CHILD,
        selectedDays: [...FESTIVAL_DAYS],
        extras: [],
      }]);
      const result = calculatePriceBreakdown(booking);
      expect(result.subtotalCents).toBe(3000);
    });
  });

  describe('Family Pass pricing', () => {
    it('charges $40 flat for a family pass (once per group)', () => {
      const day = '2026-11-10' as typeof FESTIVAL_DAYS[number];
      const booking = makeBooking([
        { name: 'Dad', age: 35, email: 'd@t.com', phone: '5551234567', ticketType: TicketType.FAMILY_PASS, selectedDays: [day], extras: [] },
        { name: 'Mom', age: 33, email: 'm@t.com', phone: '5551234567', ticketType: TicketType.FAMILY_PASS, selectedDays: [day], extras: [] },
        { name: 'Kid1', age: 8, ticketType: TicketType.FAMILY_PASS, selectedDays: [day], extras: [] },
        { name: 'Kid2', age: 6, ticketType: TicketType.FAMILY_PASS, selectedDays: [day], extras: [] },
      ]);
      const result = calculatePriceBreakdown(booking);
      // Family pass should only be charged ONCE ($40), not 4 times
      expect(result.subtotalCents).toBe(4000);
    });
  });

  describe('Extras pricing', () => {
    it('charges $5 per pair of dandiya sticks', () => {
      const booking = makeBooking([{
        ...makeAdultDayPass('Alice', ['2026-11-10']),
        extras: [{ type: ExtraType.DANDIYA_STICKS, quantity: 3 }],
      }]);
      const result = calculatePriceBreakdown(booking);
      // $15 (ticket) + $15 (3 × $5 sticks) = $30
      expect(result.subtotalCents).toBe(3000);
    });

    it('charges $12 per dinner plate per day', () => {
      const booking = makeBooking([{
        ...makeAdultDayPass('Alice', ['2026-11-10', '2026-11-11']),
        extras: [
          { type: ExtraType.DINNER_PLATE, days: ['2026-11-10', '2026-11-11'] as typeof FESTIVAL_DAYS[number][] },
        ],
      }]);
      const result = calculatePriceBreakdown(booking);
      // $15×2 (ticket) + $12×2 (dinner) = $54
      expect(result.subtotalCents).toBe(5400);
    });

    it('charges $20 per garba workshop session', () => {
      const booking = makeBooking([{
        ...makeAdultDayPass('Alice', ['2026-11-11', '2026-11-13']),
        extras: [
          { type: ExtraType.GARBA_WORKSHOP, days: ['2026-11-11', '2026-11-13'] as typeof FESTIVAL_DAYS[number][] },
        ],
      }]);
      const result = calculatePriceBreakdown(booking);
      // $15×2 (ticket) + $20×2 (workshop) = $70
      expect(result.subtotalCents).toBe(7000);
    });
  });

  describe('Promo codes', () => {
    it('SEVA10: 10% off the whole booking', () => {
      const booking = makeBooking(
        [makeAdultDayPass('Alice', ['2026-11-10'])],
        'SEVA10'
      );
      const result = calculatePriceBreakdown(booking);
      expect(result.subtotalCents).toBe(1500);
      expect(result.discountCents).toBe(150); // 10% of $15
      expect(result.totalCents).toBe(1350);
    });

    it('FLAT20: $20 off the whole booking', () => {
      const booking = makeBooking(
        [makeAdultDayPass('Alice', ['2026-11-10', '2026-11-11', '2026-11-12'])],
        'FLAT20'
      );
      const result = calculatePriceBreakdown(booking);
      expect(result.subtotalCents).toBe(4500);
      expect(result.discountCents).toBe(2000); // $20 off
      expect(result.totalCents).toBe(2500);
    });

    it('FLAT20: does not go below zero', () => {
      const booking = makeBooking(
        [makeChildDayPass('Bobby', ['2026-11-10'])],
        'FLAT20'
      );
      const result = calculatePriceBreakdown(booking);
      expect(result.subtotalCents).toBe(800); // $8
      expect(result.discountCents).toBe(800); // Capped at subtotal
      expect(result.totalCents).toBe(0);
    });

    it('KIDSFREE: makes child tickets free', () => {
      const booking = makeBooking([
        makeAdultDayPass('Alice', ['2026-11-10']),
        makeChildDayPass('Bobby', ['2026-11-10']),
      ], 'KIDSFREE');
      const result = calculatePriceBreakdown(booking);
      expect(result.subtotalCents).toBe(2300); // $15 + $8
      expect(result.discountCents).toBe(800);  // $8 child ticket free
      expect(result.totalCents).toBe(1500);    // Only adult pays
    });

    it('KIDSFREE: no discount when no child tickets', () => {
      const booking = makeBooking(
        [makeAdultDayPass('Alice', ['2026-11-10'])],
        'KIDSFREE'
      );
      const result = calculatePriceBreakdown(booking);
      expect(result.discountCents).toBe(0);
      expect(result.totalCents).toBe(1500);
    });

    it('expired/maxed out codes do not apply any discount', () => {
      const booking1 = makeBooking(
        [makeAdultDayPass('Alice', ['2026-11-10'])],
        'EXPIRED5'
      );
      const result1 = calculatePriceBreakdown(booking1);
      expect(result1.discountCents).toBe(0);

      const booking2 = makeBooking(
        [makeAdultDayPass('Alice', ['2026-11-10'])],
        'MAXEDOUT'
      );
      const result2 = calculatePriceBreakdown(booking2);
      expect(result2.discountCents).toBe(0);
    });

    it('unknown promo codes do not apply any discount', () => {
      const booking = makeBooking(
        [makeAdultDayPass('Alice', ['2026-11-10'])],
        'FAKECODE'
      );
      const result = calculatePriceBreakdown(booking);
      expect(result.discountCents).toBe(0);
    });
  });

  describe('Money precision — no floating point errors', () => {
    it('never produces fractional cents', () => {
      // 10% of $15 = $1.50 = 150 cents — exact
      const booking = makeBooking(
        [makeAdultDayPass('Alice', ['2026-11-10'])],
        'SEVA10'
      );
      const result = calculatePriceBreakdown(booking);
      expect(Number.isInteger(result.subtotalCents)).toBe(true);
      expect(Number.isInteger(result.discountCents)).toBe(true);
      expect(Number.isInteger(result.totalCents)).toBe(true);
    });

    it('handles complex total without float errors', () => {
      // 2 adults × 3 days ($15×6 = $90) + 1 child × 2 days ($8×2 = $16)
      // + 2 dinner plates ($12×2 = $24) + 1 dandiya ($5)
      // Total = $135, 10% off = $13.50 → 1350 cents
      const booking = makeBooking([
        {
          ...makeAdultDayPass('Alice', ['2026-11-10', '2026-11-11', '2026-11-12']),
          extras: [{ type: ExtraType.DINNER_PLATE, days: ['2026-11-10', '2026-11-11'] as typeof FESTIVAL_DAYS[number][] }],
        },
        {
          ...makeAdultDayPass('Bob', ['2026-11-10', '2026-11-11', '2026-11-12']),
          extras: [{ type: ExtraType.DANDIYA_STICKS, quantity: 1 }],
        },
        makeChildDayPass('Charlie', ['2026-11-10', '2026-11-11']),
      ], 'SEVA10');

      const result = calculatePriceBreakdown(booking);
      // $45 + $24 + $45 + $5 + $16 = $135 = 13500 cents
      expect(result.subtotalCents).toBe(13500);
      expect(result.discountCents).toBe(1350);
      expect(result.totalCents).toBe(12150);
      expect(Number.isInteger(result.totalCents)).toBe(true);
    });
  });

  describe('Toddlers (under 5)', () => {
    it('toddlers are free — no ticket line item', () => {
      const booking = makeBooking([{
        name: 'Baby',
        age: 3,
        ticketType: null,
        selectedDays: [],
        extras: [],
      }]);
      const result = calculatePriceBreakdown(booking);
      expect(result.subtotalCents).toBe(0);
      expect(result.lineItems.length).toBe(0);
    });

    it('toddler extras are still charged', () => {
      const booking = makeBooking([{
        name: 'Baby',
        age: 3,
        ticketType: null,
        selectedDays: [],
        extras: [
          { type: ExtraType.DINNER_PLATE, days: ['2026-11-10'] as typeof FESTIVAL_DAYS[number][] },
        ],
      }]);
      const result = calculatePriceBreakdown(booking);
      expect(result.subtotalCents).toBe(1200); // $12 dinner plate
    });
  });
});
