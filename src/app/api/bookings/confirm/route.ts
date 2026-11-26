// ============================================================
// API Route: POST /api/bookings/confirm
// Validates, re-calculates, checks stock atomically, and
// creates the booking. Supports idempotency via clientRequestId.
// ============================================================

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { validateBooking } from '@/lib/validation';
import { calculatePriceBreakdown } from '@/lib/pricing';
import { checkStock, decrementStock, getExistingBooking } from '@/lib/inventory';
import {
  type BookingRequest,
  type ConfirmResponse,
  PROMO_CODES,
  PromoCodeStatus,
} from '@/lib/types';

// In-memory booking store (for retrieving confirmations)
const bookingStore: Map<string, { booking: BookingRequest; confirmedAt: string }> = new Map();

export async function POST(request: Request) {
  try {
    const body = await request.json() as BookingRequest;

    // ---- Idempotency check ----
    const existingId = getExistingBooking(body.clientRequestId);
    if (existingId) {
      // Return the existing booking — do not charge again
      const breakdown = calculatePriceBreakdown(body);
      const response: ConfirmResponse = {
        success: true,
        bookingId: existingId,
        breakdown,
        promoMessage: 'Booking already confirmed (duplicate request detected).',
      };
      return NextResponse.json(response);
    }

    // ---- Validate everything again (never trust the client) ----
    const errors = validateBooking(body);
    if (errors.length > 0) {
      const response: ConfirmResponse = {
        success: false,
        errors,
      };
      return NextResponse.json(response, { status: 400 });
    }

    // ---- Check stock ----
    const shortages = checkStock(body);
    if (shortages.length > 0) {
      const stockErrors = shortages.map((s) => ({
        field: 'inventory',
        message: `Sorry, ${s.item} is sold out or low stock. Need ${s.needed}, only ${s.available} left.`,
      }));
      const response: ConfirmResponse = {
        success: false,
        errors: stockErrors,
      };
      return NextResponse.json(response, { status: 409 });
    }

    // ---- Generate booking ID ----
    const bookingId = `SU-${uuidv4().slice(0, 8).toUpperCase()}`;

    // ---- Atomic stock decrement ----
    const success = await decrementStock(body, bookingId);
    if (!success) {
      const response: ConfirmResponse = {
        success: false,
        errors: [{
          field: 'inventory',
          message: 'Some items sold out while processing your booking. Please review your selections.',
        }],
      };
      return NextResponse.json(response, { status: 409 });
    }

    // ---- Calculate final price (server authority) ----
    const breakdown = calculatePriceBreakdown(body);

    // ---- Store booking ----
    bookingStore.set(bookingId, {
      booking: body,
      confirmedAt: new Date().toISOString(),
    });

    // ---- Promo message ----
    let promoMessage: string | undefined;
    if (body.promoCode) {
      const code = PROMO_CODES[body.promoCode.toUpperCase()];
      if (code && code.status === PromoCodeStatus.VALID && breakdown.discountCents > 0) {
        promoMessage = `${code.description} — you saved $${(breakdown.discountCents / 100).toFixed(2)}!`;
      }
    }

    const response: ConfirmResponse = {
      success: true,
      bookingId,
      breakdown,
      promoMessage,
    };

    return NextResponse.json(response, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, errors: [{ field: 'request', message: 'Invalid request body.' }] },
      { status: 400 }
    );
  }
}
