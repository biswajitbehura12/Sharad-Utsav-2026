'use client';

import { type Dispatch, useEffect } from 'react';
import {
  type BookingState,
  type BookingAction,
} from '@/lib/booking-state';
import { formatCents } from '@/lib/utils';

interface Props {
  state: BookingState;
  dispatch: Dispatch<BookingAction>;
  onCalculate: () => Promise<void>;
  onNext: () => void;
  onBack: () => void;
}

export function StepReview({ state, dispatch, onCalculate, onNext, onBack }: Props) {
  // Re-calculate on mount to ensure fresh prices
  useEffect(() => {
    onCalculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const breakdown = state.breakdown;

  return (
    <div className="animate-slide-up">
      <div className="card mb-6">
        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--cream)' }}>
          Review Your Booking
        </h2>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Please check everything before proceeding to payment.
        </p>

        {/* Booker Info */}
        <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--gold)' }}>
            Booking Contact
          </h3>
          <p className="text-sm">{state.booker.name}</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {state.booker.email} • {state.booker.phone}
          </p>
        </div>

        {/* Attendees summary */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--gold)' }}>
            Attendees ({state.attendees.length})
          </h3>
          {state.attendees.map((att, i) => (
            <div
              key={i}
              className="flex justify-between items-center py-2 border-b"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <div>
                <span className="text-sm font-medium">{att.name || `Person ${i + 1}`}</span>
                <span className="text-xs ml-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Age {att.age}
                </span>
              </div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {att.ticketType ? att.ticketType.replace(/_/g, ' ').toLowerCase() : 'Free (under 5)'}
                {att.selectedDays.length > 0 && ` • ${att.selectedDays.length} day(s)`}
              </div>
            </div>
          ))}
        </div>

        {/* Line Items */}
        {breakdown && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--gold)' }}>
              Price Breakdown
            </h3>

            <div className="space-y-2">
              {breakdown.lineItems.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-1.5 text-sm"
                >
                  <div>
                    <span>{item.description}</span>
                    <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      ({item.attendeeName})
                    </span>
                    {item.quantity > 1 && (
                      <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        × {item.quantity}
                      </span>
                    )}
                  </div>
                  <span className="font-medium">{formatCents(item.totalCents)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
              <div className="flex justify-between text-sm mb-1">
                <span>Subtotal</span>
                <span>{formatCents(breakdown.subtotalCents)}</span>
              </div>

              {breakdown.discountCents > 0 && (
                <div className="flex justify-between text-sm mb-1" style={{ color: 'var(--success)' }}>
                  <span>{breakdown.discountDescription}</span>
                  <span>−{formatCents(breakdown.discountCents)}</span>
                </div>
              )}

              <div
                className="flex justify-between text-lg font-bold mt-2 pt-2 border-t"
                style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'var(--cream)' }}
              >
                <span>Total</span>
                <span style={{ color: 'var(--primary)' }}>{formatCents(breakdown.totalCents)}</span>
              </div>
            </div>
          </div>
        )}

        {state.promoMessage && (
          <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(40, 167, 54, 0.1)' }}>
            <p className="text-sm success-text">{state.promoMessage}</p>
          </div>
        )}

        {state.isCalculating && (
          <div className="text-center py-8">
            <div className="spinner mx-auto mb-2" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Calculating...</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button className="btn-secondary" onClick={onBack}>
          ← Make Changes
        </button>
        <button
          className="btn-primary"
          disabled={!breakdown || state.isCalculating || state.errors.length > 0}
          onClick={onNext}
        >
          Proceed to Payment →
        </button>
      </div>
    </div>
  );
}
