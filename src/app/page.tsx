'use client';

import { useReducer, useCallback, useState, useRef } from 'react';
import {
  bookingReducer,
  createInitialState,
  type BookingState,
  type BookingAction,
  type BookingStep,
} from '@/lib/booking-state';
import {
  type BookingRequest,
  type CalculateResponse,
  type ConfirmResponse,
  type InventoryResponse,
} from '@/lib/types';
import { StepTickets } from '@/components/StepTickets';
import { StepAttendees } from '@/components/StepAttendees';
import { StepExtras } from '@/components/StepExtras';
import { StepReview } from '@/components/StepReview';
import { StepPayment } from '@/components/StepPayment';
import { StepConfirmation } from '@/components/StepConfirmation';

const STEPS: BookingStep[] = ['tickets', 'attendees', 'extras', 'review', 'payment', 'confirmation'];
const STEP_LABELS: Record<BookingStep, string> = {
  tickets: 'Tickets',
  attendees: 'Details',
  extras: 'Extras',
  review: 'Review',
  payment: 'Payment',
  confirmation: 'Done',
};

export default function BookingPage() {
  const [state, dispatch] = useReducer(bookingReducer, undefined, createInitialState);
  const [inventory, setInventory] = useState<InventoryResponse | null>(null);
  const fallbackRequestIdRef = useRef<string>('');

  const currentStepIndex = STEPS.indexOf(state.step);

  const buildBookingRequest = useCallback((): BookingRequest => {
    if (!state.clientRequestId && !fallbackRequestIdRef.current) {
      fallbackRequestIdRef.current = `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
    return {
      booker: state.booker,
      attendees: state.attendees,
      promoCode: state.promoCode || undefined,
      clientRequestId: state.clientRequestId || fallbackRequestIdRef.current,
    };
  }, [state.booker, state.attendees, state.promoCode, state.clientRequestId]);

  const calculatePrice = useCallback(async () => {
    dispatch({ type: 'SET_CALCULATING', value: true });
    dispatch({ type: 'CLEAR_ERRORS' });

    try {
      const res = await fetch('/api/bookings/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBookingRequest()),
      });

      const data: CalculateResponse = await res.json();

      if (data.success && data.breakdown) {
        dispatch({ type: 'SET_BREAKDOWN', breakdown: data.breakdown });
        if (data.promoMessage) {
          dispatch({ type: 'SET_PROMO_MESSAGE', message: data.promoMessage });
        }
      } else if (data.errors) {
        dispatch({ type: 'SET_ERRORS', errors: data.errors });
      }
    } catch {
      dispatch({
        type: 'SET_ERRORS',
        errors: [{ field: 'network', message: 'Unable to reach the server. Please check your connection.' }],
      });
    } finally {
      dispatch({ type: 'SET_CALCULATING', value: false });
    }
  }, [buildBookingRequest]);

  const confirmBooking = useCallback(async () => {
    dispatch({ type: 'SET_SUBMITTING', value: true });
    dispatch({ type: 'CLEAR_ERRORS' });

    try {
      const res = await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBookingRequest()),
      });

      const data: ConfirmResponse = await res.json();

      if (data.success && data.bookingId) {
        dispatch({ type: 'SET_BOOKING_ID', bookingId: data.bookingId });
        if (data.breakdown) {
          dispatch({ type: 'SET_BREAKDOWN', breakdown: data.breakdown });
        }
        dispatch({ type: 'SET_STEP', step: 'confirmation' });
      } else if (data.errors) {
        dispatch({ type: 'SET_ERRORS', errors: data.errors });
      }
    } catch {
      dispatch({
        type: 'SET_ERRORS',
        errors: [{ field: 'network', message: 'Unable to reach the server. Please check your connection.' }],
      });
    } finally {
      dispatch({ type: 'SET_SUBMITTING', value: false });
    }
  }, [buildBookingRequest]);

  const goToStep = useCallback((step: BookingStep) => {
    dispatch({ type: 'SET_STEP', step });
  }, []);

  const nextStep = useCallback(() => {
    const idx = STEPS.indexOf(state.step);
    if (idx < STEPS.length - 1) {
      dispatch({ type: 'SET_STEP', step: STEPS[idx + 1] });
    }
  }, [state.step]);

  const prevStep = useCallback(() => {
    const idx = STEPS.indexOf(state.step);
    if (idx > 0) {
      dispatch({ type: 'SET_STEP', step: STEPS[idx - 1] });
    }
  }, [state.step]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--primary-dark)' }}>
      {/* Header */}
      <header className="text-center py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <p
            className="text-sm tracking-widest uppercase mb-2"
            style={{ color: 'var(--gold)' }}
          >
            Radha Krishna Temple &bull; Allen, Texas
          </p>
          <h1
            className="text-3xl md:text-5xl font-bold mb-2"
            style={{ color: 'var(--cream)' }}
          >
            Sharad Utsav 2026
          </h1>
          <p className="text-lg" style={{ color: 'rgba(255,255,255,0.7)' }}>
            November 10 – 14, 2026
          </p>
        </div>
      </header>

      {/* Step Indicator */}
      {state.step !== 'confirmation' && (
        <div className="max-w-2xl mx-auto px-4 mb-6">
          <div className="flex items-center justify-center gap-1 md:gap-2">
            {STEPS.filter((s) => s !== 'confirmation').map((step, i) => (
              <div key={step} className="flex items-center">
                <button
                  onClick={() => i < currentStepIndex ? goToStep(step) : undefined}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                    step === state.step
                      ? 'text-[var(--primary-dark)]'
                      : i < currentStepIndex
                        ? 'cursor-pointer'
                        : 'cursor-default'
                  }`}
                  style={{
                    background: step === state.step ? 'var(--primary)' : 'transparent',
                    color: step === state.step
                      ? 'var(--primary-dark)'
                      : i < currentStepIndex
                        ? 'var(--success)'
                        : 'rgba(255,255,255,0.4)',
                  }}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: i < currentStepIndex
                        ? 'var(--success)'
                        : step === state.step
                          ? 'var(--primary-dark)'
                          : 'rgba(255,255,255,0.15)',
                      color: i < currentStepIndex || step === state.step
                        ? 'var(--white)'
                        : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {i < currentStepIndex ? '✓' : i + 1}
                  </span>
                  <span className="hidden md:inline">{STEP_LABELS[step]}</span>
                </button>
                {i < STEPS.length - 2 && (
                  <div
                    className="w-6 md:w-10 h-px mx-1"
                    style={{
                      background: i < currentStepIndex
                        ? 'var(--success)'
                        : 'rgba(255,255,255,0.15)',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pb-12 animate-fade-in">
        {/* Global Errors */}
        {state.errors.length > 0 && (
          <div
            className="mb-4 p-4 rounded-lg border"
            style={{
              background: 'rgba(239, 31, 31, 0.1)',
              borderColor: 'rgba(239, 31, 31, 0.3)',
            }}
          >
            <p className="font-semibold mb-2" style={{ color: 'var(--error)' }}>
              Please fix the following:
            </p>
            <ul className="list-disc list-inside space-y-1">
              {state.errors.map((err, i) => (
                <li key={i} className="text-sm" style={{ color: 'var(--error)' }}>
                  {err.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {state.step === 'tickets' && (
          <StepTickets
            state={state}
            dispatch={dispatch}
            inventory={inventory}
            setInventory={setInventory}
            onNext={nextStep}
          />
        )}

        {state.step === 'attendees' && (
          <StepAttendees
            state={state}
            dispatch={dispatch}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {state.step === 'extras' && (
          <StepExtras
            state={state}
            dispatch={dispatch}
            inventory={inventory}
            onNext={async () => {
              await calculatePrice();
              nextStep();
            }}
            onBack={prevStep}
          />
        )}

        {state.step === 'review' && (
          <StepReview
            state={state}
            dispatch={dispatch}
            onCalculate={calculatePrice}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {state.step === 'payment' && (
          <StepPayment
            state={state}
            dispatch={dispatch}
            onConfirm={confirmBooking}
            onBack={prevStep}
          />
        )}

        {state.step === 'confirmation' && (
          <StepConfirmation
            state={state}
            dispatch={dispatch}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 px-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
        <p className="text-sm">
          © 2026 Radha Krishna Temple, Allen TX • Sharad Utsav 2026
        </p>
      </footer>
    </div>
  );
}
