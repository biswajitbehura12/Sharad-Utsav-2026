'use client';

import { type Dispatch } from 'react';
import {
  type BookingState,
  type BookingAction,
} from '@/lib/booking-state';
import { ageCategory, AgeCategory } from '@/lib/types';

interface Props {
  state: BookingState;
  dispatch: Dispatch<BookingAction>;
  onNext: () => void;
  onBack: () => void;
}

export function StepAttendees({ state, dispatch, onNext, onBack }: Props) {
  // Client-side validation before proceeding
  const validate = (): boolean => {
    const errors: Array<{ field: string; message: string }> = [];

    // Validate booker
    if (!state.booker.name.trim()) {
      errors.push({ field: 'booker.name', message: 'Your name is required.' });
    }
    if (!state.booker.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.booker.email)) {
      errors.push({ field: 'booker.email', message: 'A valid email is required.' });
    }
    if (!state.booker.phone || state.booker.phone.trim().length < 7) {
      errors.push({ field: 'booker.phone', message: 'A valid phone number is required.' });
    }
    if (state.booker.age < 18) {
      errors.push({ field: 'booker.age', message: 'You must be at least 18 to make a booking.' });
    }

    // Validate attendees
    state.attendees.forEach((att, i) => {
      if (!att.name.trim()) {
        errors.push({ field: `attendees[${i}].name`, message: `Person ${i + 1}: Name is required.` });
      }
      const cat = ageCategory(att.age);
      if (cat === AgeCategory.ADULT || cat === AgeCategory.CHILD) {
        if (att.ticketType && att.selectedDays.length === 0) {
          errors.push({ field: `attendees[${i}].days`, message: `Person ${i + 1}: Please select at least one day.` });
        }
      }
      // Adults need email/phone
      if (cat === AgeCategory.ADULT) {
        if (!att.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(att.email)) {
          errors.push({ field: `attendees[${i}].email`, message: `Person ${i + 1}: Email is required for adults.` });
        }
        if (!att.phone || att.phone.trim().length < 7) {
          errors.push({ field: `attendees[${i}].phone`, message: `Person ${i + 1}: Phone is required for adults.` });
        }
      }
    });

    if (errors.length > 0) {
      dispatch({ type: 'SET_ERRORS', errors });
      return false;
    }
    dispatch({ type: 'CLEAR_ERRORS' });
    return true;
  };

  return (
    <div className="animate-slide-up">
      {/* Booker Info */}
      <div className="card mb-6">
        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--cream)' }}>
          Your Details
        </h2>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>
          We&apos;ll send the confirmation to this email.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--gold)' }}>
              Your Name *
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Full name"
              value={state.booker.name}
              onChange={(e) => dispatch({ type: 'SET_BOOKER', booker: { name: e.target.value } })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--gold)' }}>
              Your Age *
            </label>
            <input
              type="number"
              className="input-field"
              placeholder="Must be 18+"
              min="18"
              max="150"
              value={state.booker.age || ''}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                dispatch({ type: 'SET_BOOKER', booker: { age: isNaN(val) ? 0 : val } });
              }}
            />
            {state.booker.age > 0 && state.booker.age < 18 && (
              <p className="error-text">Must be at least 18 to book.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--gold)' }}>
              Email *
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={state.booker.email}
              onChange={(e) => dispatch({ type: 'SET_BOOKER', booker: { email: e.target.value } })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--gold)' }}>
              Phone *
            </label>
            <input
              type="tel"
              className="input-field"
              placeholder="+1 (555) 123-4567"
              value={state.booker.phone}
              onChange={(e) => dispatch({ type: 'SET_BOOKER', booker: { phone: e.target.value } })}
            />
          </div>
        </div>
      </div>

      {/* Attendee Details */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--cream)' }}>
          Attendee Details
        </h2>
        <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Contact details for each attendee. Adults need email and phone for check-in.
        </p>

        {state.attendees.map((att, i) => {
          const cat = att.age > 0 ? ageCategory(att.age) : null;
          const isAdult = cat === AgeCategory.ADULT;
          const isToddler = cat === AgeCategory.TODDLER;

          return (
            <div
              key={i}
              className="p-4 rounded-lg mb-3 border"
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium" style={{ color: 'var(--gold)' }}>
                  {att.name || `Person ${i + 1}`}
                  {cat && (
                    <span className="ml-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      ({isToddler ? 'Under 5 — Free' : isAdult ? 'Adult' : 'Child'})
                    </span>
                  )}
                </h4>
              </div>

              {isAdult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="email@example.com"
                      value={att.email || ''}
                      onChange={(e) =>
                        dispatch({
                          type: 'UPDATE_ATTENDEE',
                          index: i,
                          data: { email: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      Phone *
                    </label>
                    <input
                      type="tel"
                      className="input-field"
                      placeholder="+1 (555) 123-4567"
                      value={att.phone || ''}
                      onChange={(e) =>
                        dispatch({
                          type: 'UPDATE_ATTENDEE',
                          index: i,
                          data: { phone: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {!isAdult && !isToddler && cat && (
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  No email or phone needed for children. Name and age are recorded for check-in.
                </p>
              )}

              {isToddler && (
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Free entry. Name recorded for headcount purposes.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button className="btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button
          className="btn-primary"
          onClick={() => {
            if (validate()) onNext();
          }}
        >
          Next: Add-ons →
        </button>
      </div>
    </div>
  );
}
