'use client';

import { type Dispatch } from 'react';
import {
  type BookingState,
  type BookingAction,
} from '@/lib/booking-state';
import { DAY_LABELS } from '@/lib/types';
import { formatCents } from '@/lib/utils';

interface Props {
  state: BookingState;
  dispatch: Dispatch<BookingAction>;
}

export function StepConfirmation({ state }: Props) {
  const breakdown = state.breakdown;

  return (
    <div className="animate-slide-up text-center">
      {/* Success icon */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background: 'rgba(40, 167, 54, 0.15)' }}
      >
        <span className="text-4xl">✓</span>
      </div>

      <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--cream)' }}>
        Booking Confirmed!
      </h2>
      <p className="text-sm mb-1" style={{ color: 'var(--success)' }}>
        Your booking has been confirmed.
      </p>

      {state.bookingId && (
        <div
          className="inline-block px-4 py-2 rounded-lg mt-3 mb-6"
          style={{ background: 'rgba(201, 155, 36, 0.1)', border: '1px solid rgba(201, 155, 36, 0.3)' }}
        >
          <p className="text-xs" style={{ color: 'var(--gold)' }}>Booking Reference</p>
          <p className="text-xl font-bold font-mono" style={{ color: 'var(--primary)' }}>
            {state.bookingId}
          </p>
        </div>
      )}

      <div className="card text-left mb-6">
        <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--cream)' }}>
          Booking Summary
        </h3>

        {/* Attendees */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--gold)' }}>
            Attendees
          </h4>
          {state.attendees.map((att, i) => (
            <div
              key={i}
              className="py-2 border-b"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <p className="text-sm font-medium">{att.name}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {att.ticketType
                  ? att.ticketType.replace(/_/g, ' ').toLowerCase()
                  : 'Free (under 5)'}
                {att.selectedDays.length > 0 &&
                  ` • ${att.selectedDays.map((d) => DAY_LABELS[d] || d).join(', ')}`}
              </p>
            </div>
          ))}
        </div>

        {/* Price Breakdown */}
        {breakdown && (
          <div>
            <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--gold)' }}>
              Payment
            </h4>
            {breakdown.lineItems.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span>
                  {item.description}
                  {item.quantity > 1 && ` × ${item.quantity}`}
                </span>
                <span>{formatCents(item.totalCents)}</span>
              </div>
            ))}

            {breakdown.discountCents > 0 && (
              <div className="flex justify-between text-sm py-1" style={{ color: 'var(--success)' }}>
                <span>Discount ({breakdown.discountDescription})</span>
                <span>−{formatCents(breakdown.discountCents)}</span>
              </div>
            )}

            <div
              className="flex justify-between text-lg font-bold mt-2 pt-2 border-t"
              style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'var(--primary)' }}
            >
              <span>Total Paid</span>
              <span>{formatCents(breakdown.totalCents)}</span>
            </div>
          </div>
        )}
      </div>

      <div
        className="p-4 rounded-lg mb-6"
        style={{ background: 'rgba(40, 167, 54, 0.08)', border: '1px solid rgba(40, 167, 54, 0.2)' }}
      >
        <p className="text-sm" style={{ color: 'var(--success)' }}>
          📧 A confirmation has been sent to <strong>{state.booker.email}</strong>
        </p>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Please save your booking reference for check-in at the venue.
        </p>
      </div>

      <div
        className="text-center p-4 rounded-lg"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        <p className="text-lg font-bold" style={{ color: 'var(--cream)' }}>
          🎉 See you at Sharad Utsav 2026!
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--gold)' }}>
          Radha Krishna Temple, Allen, Texas
        </p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          November 10 – 14, 2026
        </p>
      </div>
    </div>
  );
}
