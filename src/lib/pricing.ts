// ============================================================
// Server-side price calculation engine.
// All amounts in integer cents. No floats anywhere.
// ============================================================

import {
  type AttendeeInput,
  type BookingRequest,
  type LineItem,
  type PriceBreakdown,
  type FestivalDay,
  TicketType,
  ExtraType,
  TICKET_PRICES,
  EXTRA_PRICES,
  FESTIVAL_DAYS,
  PROMO_CODES,
  PromoCodeStatus,
} from './types';

/** Compute the price for one attendee's ticket */
function ticketPrice(attendee: AttendeeInput): LineItem | null {
  const { ticketType, selectedDays, name } = attendee;

  if (ticketType === null) {
    // Toddler — free, no ticket
    return null;
  }

  switch (ticketType) {
    case TicketType.DAY_PASS_ADULT:
    case TicketType.DAY_PASS_CHILD: {
      const dayCount = selectedDays.length;
      const unitPrice = TICKET_PRICES[ticketType];
      return {
        description: ticketType === TicketType.DAY_PASS_ADULT
          ? 'Day Pass – Adult'
          : 'Day Pass – Child',
        attendeeName: name,
        unitPriceCents: unitPrice,
        quantity: dayCount,
        totalCents: unitPrice * dayCount,
      };
    }

    case TicketType.ALL_DAY_ADULT:
    case TicketType.ALL_DAY_CHILD: {
      const unitPrice = TICKET_PRICES[ticketType];
      return {
        description: ticketType === TicketType.ALL_DAY_ADULT
          ? 'All-Day Pass – Adult'
          : 'All-Day Pass – Child',
        attendeeName: name,
        unitPriceCents: unitPrice,
        quantity: 1,
        totalCents: unitPrice,
      };
    }

    case TicketType.FAMILY_PASS: {
      const unitPrice = TICKET_PRICES[TicketType.FAMILY_PASS];
      return {
        description: 'Family Pass (2 adults + 2 children, 1 day)',
        attendeeName: name,
        unitPriceCents: unitPrice,
        quantity: 1,
        totalCents: unitPrice,
      };
    }

    default:
      return null;
  }
}

/** Compute the price for one attendee's extras */
function extraPrices(attendee: AttendeeInput): LineItem[] {
  const items: LineItem[] = [];

  for (const extra of attendee.extras) {
    switch (extra.type) {
      case ExtraType.DANDIYA_STICKS: {
        const qty = extra.quantity ?? 0;
        if (qty > 0) {
          items.push({
            description: 'Dandiya Sticks (pair)',
            attendeeName: attendee.name,
            unitPriceCents: EXTRA_PRICES[ExtraType.DANDIYA_STICKS],
            quantity: qty,
            totalCents: EXTRA_PRICES[ExtraType.DANDIYA_STICKS] * qty,
          });
        }
        break;
      }

      case ExtraType.DINNER_PLATE: {
        const days = extra.days ?? [];
        if (days.length > 0) {
          items.push({
            description: 'Dinner Plate',
            attendeeName: attendee.name,
            unitPriceCents: EXTRA_PRICES[ExtraType.DINNER_PLATE],
            quantity: days.length,
            totalCents: EXTRA_PRICES[ExtraType.DINNER_PLATE] * days.length,
          });
        }
        break;
      }

      case ExtraType.GARBA_WORKSHOP: {
        const days = extra.days ?? [];
        if (days.length > 0) {
          items.push({
            description: 'Garba Workshop',
            attendeeName: attendee.name,
            unitPriceCents: EXTRA_PRICES[ExtraType.GARBA_WORKSHOP],
            quantity: days.length,
            totalCents: EXTRA_PRICES[ExtraType.GARBA_WORKSHOP] * days.length,
          });
        }
        break;
      }
    }
  }

  return items;
}

/**
 * Identify which line items are "child ticket" items for KIDSFREE promo
 */
function isChildTicketItem(item: LineItem): boolean {
  return (
    item.description === 'Day Pass – Child' ||
    item.description === 'All-Day Pass – Child'
  );
}

/**
 * Calculate the full price breakdown for a booking.
 * This is the single source of truth for pricing — called by both
 * the calculate and confirm endpoints.
 */
export function calculatePriceBreakdown(booking: BookingRequest): PriceBreakdown {
  const lineItems: LineItem[] = [];

  // --- Deduplicate Family Pass ---
  // Family pass should only be charged once per group sharing the same day,
  // not per attendee. We track which family pass groups we've already added.
  const familyPassDaysCharged = new Set<string>();

  for (const attendee of booking.attendees) {
    // Ticket line item
    const ticket = ticketPrice(attendee);
    if (ticket) {
      // For Family Pass, only charge once per unique day
      if (attendee.ticketType === TicketType.FAMILY_PASS) {
        const day = attendee.selectedDays[0]; // Family pass = 1 day
        if (!familyPassDaysCharged.has(day)) {
          familyPassDaysCharged.add(day);
          lineItems.push(ticket);
        }
        // Skip duplicate family pass charges for other members of the same family pass
      } else {
        lineItems.push(ticket);
      }
    }

    // Extras
    const extras = extraPrices(attendee);
    lineItems.push(...extras);
  }

  // Subtotal
  const subtotalCents = lineItems.reduce((sum, item) => sum + item.totalCents, 0);

  // --- Apply promo code ---
  let discountCents = 0;
  let discountDescription: string | undefined;

  if (booking.promoCode) {
    const code = PROMO_CODES[booking.promoCode.toUpperCase()];
    if (code && code.status === PromoCodeStatus.VALID) {
      switch (code.type) {
        case 'PERCENT':
          discountCents = Math.round(subtotalCents * code.value / 100);
          discountDescription = `${code.code}: ${code.value}% off`;
          break;

        case 'FLAT':
          discountCents = Math.min(code.value, subtotalCents); // Don't go negative
          discountDescription = `${code.code}: $${(code.value / 100).toFixed(2)} off`;
          break;

        case 'KIDS_FREE': {
          const childTotal = lineItems
            .filter(isChildTicketItem)
            .reduce((sum, item) => sum + item.totalCents, 0);
          discountCents = childTotal;
          discountDescription = childTotal > 0
            ? `${code.code}: Child tickets free`
            : `${code.code}: Applied (no child tickets in this booking)`;
          break;
        }
      }
    }
  }

  const totalCents = Math.max(0, subtotalCents - discountCents);

  return {
    lineItems,
    subtotalCents,
    discountCents,
    discountDescription: discountCents > 0 ? discountDescription : undefined,
    totalCents,
  };
}

/**
 * Format cents to dollar string for display
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
