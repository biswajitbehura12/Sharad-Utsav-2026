// ============================================================
// API Route: POST /api/bookings/calculate
// Validates and calculates price without committing a booking.
// ============================================================

import { NextResponse } from 'next/server';
import { validateBooking } from '@/lib/validation';
import { calculatePriceBreakdown } from '@/lib/pricing';
import { checkStock } from '@/lib/inventory';
import {
  type BookingRequest,
  type CalculateResponse,
  PROMO_CODES,
  PromoCodeStatus,
} from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json() as BookingRequest;

    // Validate
    const errors = validateBooking(body);
    if (errors.length > 0) {
      const response: CalculateResponse = {
        success: false,
        errors,
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check stock (informational — not locked)
    const shortages = checkStock(body);
    if (shortages.length > 0) {
      const stockErrors = shortages.map((s) => ({
        field: 'inventory',
        message: `Not enough ${s.item}: need ${s.needed}, only ${s.available} remaining.`,
      }));
      const response: CalculateResponse = {
        success: false,
        errors: stockErrors,
      };
      return NextResponse.json(response, { status: 409 });
    }

    // Calculate price
    const breakdown = calculatePriceBreakdown(body);

    // Promo message
    let promoMessage: string | undefined;
    if (body.promoCode) {
      const code = PROMO_CODES[body.promoCode.toUpperCase()];
      if (code && code.status === PromoCodeStatus.VALID) {
        if (breakdown.discountCents > 0) {
          promoMessage = `✓ ${code.description} — you save $${(breakdown.discountCents / 100).toFixed(2)}`;
        } else {
          promoMessage = `✓ Code applied but no discount applicable to this booking.`;
        }
      }
    }

    const response: CalculateResponse = {
      success: true,
      breakdown,
      promoMessage,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { success: false, errors: [{ field: 'request', message: 'Invalid request body.' }] },
      { status: 400 }
    );
  }
}
