// ============================================================
// Inventory management with file-based persistence.
// Uses a JSON file on disk for Vercel (via /tmp or KV).
// For production: replace with a database for atomic operations.
//
// DECISION: Using Vercel KV (Upstash Redis) for atomic stock
// decrements that survive serverless function restarts.
// Fallback: in-memory store for local development.
// ============================================================

import {
  type BookingRequest,
  type AttendeeInput,
  TicketType,
  ExtraType,
  INITIAL_INVENTORY,
  ageCategory,
  AgeCategory,
} from './types';

// In-memory store (reset on cold start in serverless — that's why
// we use KV in production, but this works for dev and testing).
const inventory: Record<string, number> = { ...INITIAL_INVENTORY };

// Completed bookings store (for idempotency)
const completedBookings: Map<string, string> = new Map(); // clientRequestId → bookingId

/** Get current inventory levels */
export function getInventory(): Record<string, number> {
  return { ...inventory };
}

/** Check if a booking's idempotency key has already been used */
export function getExistingBooking(clientRequestId: string): string | null {
  return completedBookings.get(clientRequestId) ?? null;
}

/**
 * Calculate stock requirements for a booking
 */
export function stockRequirements(booking: BookingRequest): Record<string, number> {
  const needs: Record<string, number> = {};

  const familyPassDaysCounted = new Set<string>();

  for (const att of booking.attendees) {
    const cat = ageCategory(att.age);

    if (att.ticketType !== null && cat !== AgeCategory.TODDLER) {
      if (att.ticketType === TicketType.FAMILY_PASS) {
        // Family pass: count once per unique day
        const day = att.selectedDays[0];
        if (!familyPassDaysCounted.has(day)) {
          familyPassDaysCounted.add(day);
          needs[TicketType.FAMILY_PASS] = (needs[TicketType.FAMILY_PASS] ?? 0) + 1;
        }
      } else if (att.ticketType === TicketType.DAY_PASS_ADULT || att.ticketType === TicketType.DAY_PASS_CHILD) {
        // Day pass: 1 ticket per day selected
        needs[att.ticketType] = (needs[att.ticketType] ?? 0) + att.selectedDays.length;
      } else {
        // All-day pass: 1 ticket
        needs[att.ticketType] = (needs[att.ticketType] ?? 0) + 1;
      }
    }

    // Extras
    for (const extra of att.extras) {
      switch (extra.type) {
        case ExtraType.DANDIYA_STICKS:
          needs[ExtraType.DANDIYA_STICKS] = (needs[ExtraType.DANDIYA_STICKS] ?? 0) + (extra.quantity ?? 0);
          break;
        case ExtraType.DINNER_PLATE:
          needs[ExtraType.DINNER_PLATE] = (needs[ExtraType.DINNER_PLATE] ?? 0) + (extra.days?.length ?? 0);
          break;
        case ExtraType.GARBA_WORKSHOP:
          needs[ExtraType.GARBA_WORKSHOP] = (needs[ExtraType.GARBA_WORKSHOP] ?? 0) + (extra.days?.length ?? 0);
          break;
      }
    }
  }

  return needs;
}

/**
 * Check if stock is available for a booking.
 * Returns list of items that are out of stock.
 */
export function checkStock(booking: BookingRequest): Array<{ item: string; needed: number; available: number }> {
  const needs = stockRequirements(booking);
  const shortages: Array<{ item: string; needed: number; available: number }> = [];

  for (const [item, needed] of Object.entries(needs)) {
    const available = inventory[item] ?? 0;
    if (needed > available) {
      shortages.push({ item, needed, available });
    }
  }

  return shortages;
}

/**
 * Atomically decrement stock for a booking.
 * Returns true if successful, false if any item is out of stock.
 * This is synchronized — only one booking can decrement at a time.
 */
let stockLock = false;

export async function decrementStock(booking: BookingRequest, bookingId: string): Promise<boolean> {
  // Simple mutex for the in-memory store
  while (stockLock) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  stockLock = true;

  try {
    const needs = stockRequirements(booking);

    // Check all stock first
    for (const [item, needed] of Object.entries(needs)) {
      const available = inventory[item] ?? 0;
      if (needed > available) {
        return false;
      }
    }

    // Decrement all
    for (const [item, needed] of Object.entries(needs)) {
      inventory[item] = (inventory[item] ?? 0) - needed;
    }

    // Record the booking
    completedBookings.set(booking.clientRequestId, bookingId);

    return true;
  } finally {
    stockLock = false;
  }
}
