'use client';

import { type Dispatch, useState } from 'react';
import {
  type BookingState,
  type BookingAction,
} from '@/lib/booking-state';
import { formatCents } from '@/lib/utils';

interface Props {
  state: BookingState;
  dispatch: Dispatch<BookingAction>;
  onConfirm: () => Promise<void>;
  onBack: () => void;
}

export function StepPayment({ state, dispatch, onConfirm, onBack }: Props) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const breakdown = state.breakdown;

  const handlePay = async () => {
    setPaymentError('');

    // Simulate card validation
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
      setPaymentError('Please enter a valid card number.');
      return;
    }
    if (!expiry || !/^\d{2}\/\d{2}$/.test(expiry)) {
      setPaymentError('Please enter expiry as MM/YY.');
      return;
    }
    if (!cvv || cvv.length < 3) {
      setPaymentError('Please enter a valid CVV.');
      return;
    }
    if (!cardName.trim()) {
      setPaymentError('Please enter the name on the card.');
      return;
    }

    // Simulate payment processing delay
    await onConfirm();
  };

  return (
    <div className="animate-slide-up">
      <div className="card mb-6">
        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--cream)' }}>
          Payment
        </h2>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>
          This is a simulated payment — no real charges will be made.
        </p>

        {/* Amount */}
        {breakdown && (
          <div
            className="p-4 rounded-lg mb-6 text-center"
            style={{ background: 'rgba(201, 155, 36, 0.1)', border: '1px solid rgba(201, 155, 36, 0.3)' }}
          >
            <p className="text-sm" style={{ color: 'var(--gold)' }}>Amount Due</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--primary)' }}>
              {formatCents(breakdown.totalCents)}
            </p>
          </div>
        )}

        {/* Simulated Card Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--gold)' }}>
              Card Number
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="4242 4242 4242 4242"
              maxLength={19}
              value={cardNumber}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                setCardNumber(v);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--gold)' }}>
                Expiry
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="MM/YY"
                maxLength={5}
                value={expiry}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, '');
                  if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2);
                  setExpiry(v.slice(0, 5));
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--gold)' }}>
                CVV
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="123"
                maxLength={4}
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--gold)' }}>
              Name on Card
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Full name as shown on card"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
            />
          </div>
        </div>

        {paymentError && (
          <p className="error-text mt-3">{paymentError}</p>
        )}

        <div
          className="mt-4 p-3 rounded-lg text-center text-xs"
          style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)' }}
        >
          🔒 Simulated payment — no real charges. Use any card number.
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button className="btn-secondary" onClick={onBack} disabled={state.isSubmitting}>
          ← Back
        </button>
        <button
          className="btn-primary"
          disabled={state.isSubmitting}
          onClick={handlePay}
        >
          {state.isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="spinner" />
              Processing...
            </span>
          ) : (
            `Pay ${breakdown ? formatCents(breakdown.totalCents) : ''}`
          )}
        </button>
      </div>
    </div>
  );
}
