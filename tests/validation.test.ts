// ============================================================
// Tests for validation logic — age rules and ticket matching.
// ============================================================

import { describe, it, expect } from 'vitest';
import { validateBooking } from '../src/lib/validation';
import {
  type BookingRequest,
  type AttendeeInput,
  TicketType,
  FESTIVAL_DAYS,
} from '../src/lib/types';

function makeBooking(
  attendees: AttendeeInput[],
  bookerAge = 30,
  promoCode?: string
): BookingRequest {
  return {
    booker: { name: 'Test Booker', email: 'test@test.com', phone: '5551234567', age: bookerAge },
    attendees,
    promoCode,
    clientRequestId: 'test-' + Math.random(),
  };
}

describe('Validation — Age Rules', () => {
  describe('Booker age', () => {
    it('rejects booker under 18', () => {
      const booking = makeBooking([{
        name: 'Teen',
        age: 16,
        email: 'teen@test.com',
        phone: '5551234567',
        ticketType: TicketType.DAY_PASS_ADULT,
        selectedDays: ['2026-11-10'],
        extras: [],
      }], 16);
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.field === 'booker.age')).toBe(true);
    });

    it('accepts booker who is exactly 18', () => {
      const booking = makeBooking([{
        name: 'Adult',
        age: 18,
        email: 'adult@test.com',
        phone: '5551234567',
        ticketType: TicketType.DAY_PASS_ADULT,
        selectedDays: ['2026-11-10'],
        extras: [],
      }], 18);
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.field === 'booker.age')).toBe(false);
    });
  });

  describe('Age → ticket type matching', () => {
    it('rejects adult ticket for a 7-year-old', () => {
      const booking = makeBooking([{
        name: 'Child',
        age: 7,
        ticketType: TicketType.DAY_PASS_ADULT,
        selectedDays: ['2026-11-10'],
        extras: [],
      }]);
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.message.includes('child ticket') || e.message.includes('Child') || e.message.includes('5–11'))).toBe(true);
    });

    it('rejects child ticket for a 15-year-old', () => {
      const booking = makeBooking([{
        name: 'Teen',
        age: 15,
        email: 'teen@test.com',
        phone: '5551234567',
        ticketType: TicketType.DAY_PASS_CHILD,
        selectedDays: ['2026-11-10'],
        extras: [],
      }]);
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.message.includes('adult ticket') || e.message.includes('Adult') || e.message.includes('12 and above'))).toBe(true);
    });

    it('rejects ticket for toddler (under 5)', () => {
      const booking = makeBooking([{
        name: 'Baby',
        age: 3,
        ticketType: TicketType.DAY_PASS_CHILD,
        selectedDays: ['2026-11-10'],
        extras: [],
      }]);
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.message.includes('under 5') || e.message.includes('free'))).toBe(true);
    });

    it('accepts child ticket for 5-year-old', () => {
      const booking = makeBooking([{
        name: 'Child',
        age: 5,
        ticketType: TicketType.DAY_PASS_CHILD,
        selectedDays: ['2026-11-10'],
        extras: [],
      }]);
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.field.includes('ticketType'))).toBe(false);
    });

    it('accepts child ticket for 11-year-old', () => {
      const booking = makeBooking([{
        name: 'Child',
        age: 11,
        ticketType: TicketType.DAY_PASS_CHILD,
        selectedDays: ['2026-11-10'],
        extras: [],
      }]);
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.field.includes('ticketType'))).toBe(false);
    });

    it('accepts adult ticket for 12-year-old', () => {
      const booking = makeBooking([{
        name: 'Teen',
        age: 12,
        email: 'teen@test.com',
        phone: '5551234567',
        ticketType: TicketType.DAY_PASS_ADULT,
        selectedDays: ['2026-11-10'],
        extras: [],
      }]);
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.field.includes('ticketType'))).toBe(false);
    });

    it('accepts family pass for both adults and children', () => {
      const day = '2026-11-10' as typeof FESTIVAL_DAYS[number];
      const booking = makeBooking([
        { name: 'Dad', age: 35, email: 'd@t.com', phone: '5551234567', ticketType: TicketType.FAMILY_PASS, selectedDays: [day], extras: [] },
        { name: 'Mom', age: 33, email: 'm@t.com', phone: '5551234567', ticketType: TicketType.FAMILY_PASS, selectedDays: [day], extras: [] },
        { name: 'Kid1', age: 8, ticketType: TicketType.FAMILY_PASS, selectedDays: [day], extras: [] },
        { name: 'Kid2', age: 6, ticketType: TicketType.FAMILY_PASS, selectedDays: [day], extras: [] },
      ]);
      const errors = validateBooking(booking);
      const ticketErrors = errors.filter((e) => e.field.includes('ticketType'));
      expect(ticketErrors.length).toBe(0);
    });
  });

  describe('Invalid ages', () => {
    it('rejects negative age', () => {
      const booking = makeBooking([{
        name: 'Invalid',
        age: -5,
        ticketType: TicketType.DAY_PASS_ADULT,
        selectedDays: ['2026-11-10'],
        extras: [],
      }]);
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.message.includes('valid age'))).toBe(true);
    });

    it('rejects age over 150', () => {
      const booking = makeBooking([{
        name: 'Invalid',
        age: 200,
        email: 'old@test.com',
        phone: '5551234567',
        ticketType: TicketType.DAY_PASS_ADULT,
        selectedDays: ['2026-11-10'],
        extras: [],
      }]);
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.message.includes('valid age'))).toBe(true);
    });

    it('rejects non-integer age', () => {
      const booking = makeBooking([{
        name: 'Invalid',
        age: 7.5,
        ticketType: TicketType.DAY_PASS_CHILD,
        selectedDays: ['2026-11-10'],
        extras: [],
      }]);
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.message.includes('valid age'))).toBe(true);
    });
  });

  describe('Day selection', () => {
    it('rejects day pass with no days selected', () => {
      const booking = makeBooking([{
        name: 'Alice',
        age: 30,
        email: 'a@t.com',
        phone: '5551234567',
        ticketType: TicketType.DAY_PASS_ADULT,
        selectedDays: [],
        extras: [],
      }]);
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.message.includes('at least one day'))).toBe(true);
    });

    it('rejects family pass with more than 1 day', () => {
      const booking = makeBooking([{
        name: 'Dad',
        age: 35,
        email: 'd@t.com',
        phone: '5551234567',
        ticketType: TicketType.FAMILY_PASS,
        selectedDays: ['2026-11-10', '2026-11-11'] as typeof FESTIVAL_DAYS[number][],
        extras: [],
      }]);
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.message.includes('single day') || e.message.includes('exactly one'))).toBe(true);
    });
  });

  describe('Promo code validation', () => {
    it('rejects unknown promo code', () => {
      const booking = makeBooking([{
        name: 'Alice',
        age: 30,
        email: 'a@t.com',
        phone: '5551234567',
        ticketType: TicketType.DAY_PASS_ADULT,
        selectedDays: ['2026-11-10'],
        extras: [],
      }], 30, 'FAKECODE');
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.field === 'promoCode')).toBe(true);
    });

    it('rejects expired promo code', () => {
      const booking = makeBooking([{
        name: 'Alice',
        age: 30,
        email: 'a@t.com',
        phone: '5551234567',
        ticketType: TicketType.DAY_PASS_ADULT,
        selectedDays: ['2026-11-10'],
        extras: [],
      }], 30, 'EXPIRED5');
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.message.includes('expired'))).toBe(true);
    });

    it('rejects maxed-out promo code', () => {
      const booking = makeBooking([{
        name: 'Alice',
        age: 30,
        email: 'a@t.com',
        phone: '5551234567',
        ticketType: TicketType.DAY_PASS_ADULT,
        selectedDays: ['2026-11-10'],
        extras: [],
      }], 30, 'MAXEDOUT');
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.message.includes('maximum'))).toBe(true);
    });

    it('accepts valid promo code SEVA10', () => {
      const booking = makeBooking([{
        name: 'Alice',
        age: 30,
        email: 'a@t.com',
        phone: '5551234567',
        ticketType: TicketType.DAY_PASS_ADULT,
        selectedDays: ['2026-11-10'],
        extras: [],
      }], 30, 'SEVA10');
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.field === 'promoCode')).toBe(false);
    });
  });

  describe('Required fields', () => {
    it('requires at least one attendee', () => {
      const booking = makeBooking([]);
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.field === 'attendees')).toBe(true);
    });

    it('requires attendee name', () => {
      const booking = makeBooking([{
        name: '',
        age: 30,
        email: 'a@t.com',
        phone: '5551234567',
        ticketType: TicketType.DAY_PASS_ADULT,
        selectedDays: ['2026-11-10'],
        extras: [],
      }]);
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.message.includes('name'))).toBe(true);
    });

    it('requires email for adults', () => {
      const booking = makeBooking([{
        name: 'Alice',
        age: 30,
        ticketType: TicketType.DAY_PASS_ADULT,
        selectedDays: ['2026-11-10'],
        extras: [],
      }]);
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.message.includes('email'))).toBe(true);
    });

    it('does not require email for children', () => {
      const booking = makeBooking([{
        name: 'Bobby',
        age: 8,
        ticketType: TicketType.DAY_PASS_CHILD,
        selectedDays: ['2026-11-10'],
        extras: [],
      }]);
      const errors = validateBooking(booking);
      expect(errors.some((e) => e.field.includes('email'))).toBe(false);
    });
  });
});
