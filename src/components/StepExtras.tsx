'use client';

import { type Dispatch } from 'react';
import {
  type BookingState,
  type BookingAction,
} from '@/lib/booking-state';
import {
  type InventoryResponse,
  type FestivalDay,
  ExtraType,
  GARBA_WORKSHOP_DAYS,
  DAY_LABELS,
  EXTRA_PRICES,
  ageCategory,
  AgeCategory,
} from '@/lib/types';
import { formatCents } from '@/lib/utils';

interface Props {
  state: BookingState;
  dispatch: Dispatch<BookingAction>;
  inventory: InventoryResponse | null;
  onNext: () => Promise<void>;
  onBack: () => void;
}

export function StepExtras({ state, dispatch, inventory, onNext, onBack }: Props) {
  const stock = inventory?.items ?? {};
  const workshopRemaining = stock[ExtraType.GARBA_WORKSHOP] ?? 0;
  const dandiyaRemaining = stock[ExtraType.DANDIYA_STICKS] ?? 999;

  return (
    <div className="animate-slide-up">
      <div className="card mb-6">
        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--cream)' }}>
          Add-ons & Extras
        </h2>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Dandiya sticks, dinner plates, and workshop registrations.
        </p>

        {state.attendees.map((att, i) => {
          const cat = att.age > 0 ? ageCategory(att.age) : null;
          const attendingDays = att.selectedDays;

          // Which workshop days is this person attending?
          const workshopDaysAvailable = attendingDays.filter((d) =>
            GARBA_WORKSHOP_DAYS.includes(d as FestivalDay)
          );

          const currentDandiya = att.extras.find((e) => e.type === ExtraType.DANDIYA_STICKS);
          const currentDinner = att.extras.find((e) => e.type === ExtraType.DINNER_PLATE);
          const currentWorkshop = att.extras.find((e) => e.type === ExtraType.GARBA_WORKSHOP);

          return (
            <div
              key={i}
              className="p-4 rounded-lg mb-4 border"
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <h4 className="font-medium mb-3" style={{ color: 'var(--gold)' }}>
                {att.name || `Person ${i + 1}`}
                <span className="text-xs ml-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {attendingDays.length > 0
                    ? `Attending ${attendingDays.length} day${attendingDays.length !== 1 ? 's' : ''}`
                    : cat === AgeCategory.TODDLER
                      ? 'Free entry'
                      : 'No days selected'}
                </span>
              </h4>

              {/* Dandiya Sticks */}
              <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div>
                  <span className="text-sm font-medium">🪘 Dandiya Sticks (pair)</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--gold)' }}>
                    {formatCents(EXTRA_PRICES[ExtraType.DANDIYA_STICKS])}/pair
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--white)' }}
                    onClick={() => {
                      const qty = (currentDandiya?.quantity ?? 0) - 1;
                      if (qty <= 0) {
                        dispatch({ type: 'REMOVE_ATTENDEE_EXTRA', index: i, extraType: ExtraType.DANDIYA_STICKS });
                      } else {
                        dispatch({
                          type: 'SET_ATTENDEE_EXTRA',
                          index: i,
                          extra: { type: ExtraType.DANDIYA_STICKS, quantity: qty },
                        });
                      }
                    }}
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-medium">
                    {currentDandiya?.quantity ?? 0}
                  </span>
                  <button
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'var(--primary)', color: 'var(--primary-dark)' }}
                    disabled={dandiyaRemaining <= 0}
                    onClick={() => {
                      const qty = (currentDandiya?.quantity ?? 0) + 1;
                      dispatch({
                        type: 'SET_ATTENDEE_EXTRA',
                        index: i,
                        extra: { type: ExtraType.DANDIYA_STICKS, quantity: qty },
                      });
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Dinner Plates */}
              {attendingDays.length > 0 && (
                <div className="py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      🍽️ Dinner Plate
                      <span className="text-xs ml-2" style={{ color: 'var(--gold)' }}>
                        {formatCents(EXTRA_PRICES[ExtraType.DINNER_PLATE])}/day
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attendingDays.map((day) => {
                      const selected = currentDinner?.days?.includes(day) ?? false;
                      return (
                        <button
                          key={day}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            selected ? 'border-[var(--primary)]' : 'border-transparent'
                          }`}
                          style={{
                            background: selected ? 'rgba(201, 155, 36, 0.15)' : 'rgba(255,255,255,0.08)',
                            color: selected ? 'var(--primary)' : 'rgba(255,255,255,0.6)',
                          }}
                          onClick={() => {
                            const days = currentDinner?.days ? [...currentDinner.days] : [];
                            const idx = days.indexOf(day);
                            if (idx >= 0) {
                              days.splice(idx, 1);
                            } else {
                              days.push(day);
                            }
                            if (days.length === 0) {
                              dispatch({ type: 'REMOVE_ATTENDEE_EXTRA', index: i, extraType: ExtraType.DINNER_PLATE });
                            } else {
                              dispatch({
                                type: 'SET_ATTENDEE_EXTRA',
                                index: i,
                                extra: { type: ExtraType.DINNER_PLATE, days },
                              });
                            }
                          }}
                        >
                          {DAY_LABELS[day]} {selected ? '✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Toddler dinner plates (they don't have selectedDays but parents may want dinner for them) */}
              {cat === AgeCategory.TODDLER && (
                <div className="py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Dinner plates available for toddlers (select days):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14'] as FestivalDay[]).map((day) => {
                      const selected = currentDinner?.days?.includes(day) ?? false;
                      return (
                        <button
                          key={day}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            selected ? 'border-[var(--primary)]' : 'border-transparent'
                          }`}
                          style={{
                            background: selected ? 'rgba(201, 155, 36, 0.15)' : 'rgba(255,255,255,0.08)',
                            color: selected ? 'var(--primary)' : 'rgba(255,255,255,0.6)',
                          }}
                          onClick={() => {
                            const days = currentDinner?.days ? [...currentDinner.days] : [];
                            const idx = days.indexOf(day);
                            if (idx >= 0) {
                              days.splice(idx, 1);
                            } else {
                              days.push(day);
                            }
                            if (days.length === 0) {
                              dispatch({ type: 'REMOVE_ATTENDEE_EXTRA', index: i, extraType: ExtraType.DINNER_PLATE });
                            } else {
                              dispatch({
                                type: 'SET_ATTENDEE_EXTRA',
                                index: i,
                                extra: { type: ExtraType.DINNER_PLATE, days },
                              });
                            }
                          }}
                        >
                          {DAY_LABELS[day]} {selected ? '✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Garba Workshop */}
              {workshopDaysAvailable.length > 0 && cat !== AgeCategory.TODDLER && (
                <div className="py-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      💃 Garba Workshop
                      <span className="text-xs ml-2" style={{ color: 'var(--gold)' }}>
                        {formatCents(EXTRA_PRICES[ExtraType.GARBA_WORKSHOP])}/session
                      </span>
                    </span>
                    {workshopRemaining <= 5 && workshopRemaining > 0 && (
                      <span className="text-xs" style={{ color: 'var(--error)' }}>
                        Only {workshopRemaining} spots left!
                      </span>
                    )}
                    {workshopRemaining <= 0 && (
                      <span className="badge-sold-out">Sold Out</span>
                    )}
                  </div>
                  {workshopRemaining > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {workshopDaysAvailable.map((day) => {
                        const selected = currentWorkshop?.days?.includes(day) ?? false;
                        return (
                          <button
                            key={day}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              selected ? 'border-[var(--primary)]' : 'border-transparent'
                            }`}
                            style={{
                              background: selected ? 'rgba(201, 155, 36, 0.15)' : 'rgba(255,255,255,0.08)',
                              color: selected ? 'var(--primary)' : 'rgba(255,255,255,0.6)',
                            }}
                            onClick={() => {
                              const days = currentWorkshop?.days ? [...currentWorkshop.days] : [];
                              const idx = days.indexOf(day);
                              if (idx >= 0) {
                                days.splice(idx, 1);
                              } else {
                                days.push(day);
                              }
                              if (days.length === 0) {
                                dispatch({ type: 'REMOVE_ATTENDEE_EXTRA', index: i, extraType: ExtraType.GARBA_WORKSHOP });
                              } else {
                                dispatch({
                                  type: 'SET_ATTENDEE_EXTRA',
                                  index: i,
                                  extra: { type: ExtraType.GARBA_WORKSHOP, days },
                                });
                              }
                            }}
                          >
                            {DAY_LABELS[day]} {selected ? '✓' : ''}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Promo Code */}
      <div className="card mb-6">
        <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--cream)' }}>
          Promo Code
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            className="input-field flex-1"
            placeholder="Enter promo code"
            value={state.promoCode}
            onChange={(e) => dispatch({ type: 'SET_PROMO', code: e.target.value.toUpperCase() })}
          />
        </div>
        {state.promoMessage && (
          <p className="text-sm mt-2 success-text">{state.promoMessage}</p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button className="btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button
          className="btn-primary"
          disabled={state.isCalculating}
          onClick={onNext}
        >
          {state.isCalculating ? (
            <span className="flex items-center gap-2">
              <span className="spinner" />
              Calculating...
            </span>
          ) : (
            'Review Order →'
          )}
        </button>
      </div>
    </div>
  );
}
