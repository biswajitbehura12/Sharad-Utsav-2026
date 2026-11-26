'use client';

import { useEffect, type Dispatch } from 'react';
import {
  type BookingState,
  type BookingAction,
} from '@/lib/booking-state';
import {
  type InventoryResponse,
  type FestivalDay,
  TicketType,
  FESTIVAL_DAYS,
  DAY_LABELS,
  TICKET_LABELS,
  ageCategory,
  AgeCategory,
} from '@/lib/types';
import { formatCents } from '@/lib/utils';

interface Props {
  state: BookingState;
  dispatch: Dispatch<BookingAction>;
  inventory: InventoryResponse | null;
  setInventory: (inv: InventoryResponse) => void;
  onNext: () => void;
}

export function StepTickets({ state, dispatch, inventory, setInventory, onNext }: Props) {
  // Fetch inventory on mount
  useEffect(() => {
    if (!inventory) {
      fetch('/api/inventory')
        .then((r) => r.json())
        .then((data: InventoryResponse) => setInventory(data))
        .catch(() => {});
    }
  }, [inventory, setInventory]);

  const canProceed = state.attendees.some(
    (a) => a.ticketType !== null || ageCategory(a.age) === AgeCategory.TODDLER
  );

  return (
    <div className="animate-slide-up">
      <div className="card mb-6">
        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--cream)' }}>
          Who&apos;s Coming?
        </h2>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Add everyone in your group, then pick their ticket types and days.
        </p>

        {state.attendees.map((att, i) => (
          <AttendeeTicketCard
            key={i}
            index={i}
            attendee={att}
            inventory={inventory}
            dispatch={dispatch}
            canRemove={state.attendees.length > 1}
          />
        ))}

        <button
          className="btn-secondary w-full mt-4"
          onClick={() => dispatch({ type: 'ADD_ATTENDEE' })}
        >
          + Add Another Person
        </button>
      </div>

      <div className="flex justify-end">
        <button
          className="btn-primary"
          disabled={!canProceed}
          onClick={onNext}
        >
          Next: Attendee Details →
        </button>
      </div>
    </div>
  );
}

function AttendeeTicketCard({
  index,
  attendee,
  inventory,
  dispatch,
  canRemove,
}: {
  index: number;
  attendee: BookingState['attendees'][number];
  inventory: InventoryResponse | null;
  dispatch: Dispatch<BookingAction>;
  canRemove: boolean;
}) {
  const cat = attendee.age > 0 ? ageCategory(attendee.age) : null;
  const stock = inventory?.items ?? {};

  const getTicketOptions = () => {
    if (!cat) return [];
    if (cat === AgeCategory.TODDLER) return [];
    if (cat === AgeCategory.CHILD) {
      return [
        { type: TicketType.DAY_PASS_CHILD, soldOut: (stock[TicketType.DAY_PASS_CHILD] ?? 999) <= 0 },
        { type: TicketType.ALL_DAY_CHILD, soldOut: (stock[TicketType.ALL_DAY_CHILD] ?? 999) <= 0 },
        { type: TicketType.FAMILY_PASS, soldOut: (stock[TicketType.FAMILY_PASS] ?? 999) <= 0 },
      ];
    }
    // Adult
    return [
      { type: TicketType.DAY_PASS_ADULT, soldOut: (stock[TicketType.DAY_PASS_ADULT] ?? 999) <= 0 },
      { type: TicketType.ALL_DAY_ADULT, soldOut: (stock[TicketType.ALL_DAY_ADULT] ?? 999) <= 0 },
      { type: TicketType.FAMILY_PASS, soldOut: (stock[TicketType.FAMILY_PASS] ?? 999) <= 0 },
    ];
  };

  const ticketOptions = getTicketOptions();
  const isAllDay = attendee.ticketType === TicketType.ALL_DAY_ADULT || attendee.ticketType === TicketType.ALL_DAY_CHILD;
  const isFamilyPass = attendee.ticketType === TicketType.FAMILY_PASS;

  return (
    <div className="cream-card mb-4 animate-fade-in">
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-lg font-semibold">Person {index + 1}</h4>
        {canRemove && (
          <button
            className="text-sm px-2 py-1 rounded"
            style={{ color: 'var(--error)' }}
            onClick={() => dispatch({ type: 'REMOVE_ATTENDEE', index })}
          >
            Remove
          </button>
        )}
      </div>

      {/* Name & Age row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--heading)' }}>
            Name
          </label>
          <input
            type="text"
            className="input-field-cream"
            placeholder="Full name"
            value={attendee.name}
            onChange={(e) =>
              dispatch({
                type: 'UPDATE_ATTENDEE',
                index,
                data: { name: e.target.value },
              })
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--heading)' }}>
            Age
          </label>
          <input
            type="number"
            className="input-field-cream"
            placeholder="Age"
            min="0"
            max="150"
            value={attendee.age || ''}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              dispatch({
                type: 'UPDATE_ATTENDEE',
                index,
                data: { age: isNaN(val) ? 0 : val },
              });
            }}
          />
        </div>
      </div>

      {/* Age info */}
      {cat === AgeCategory.TODDLER && attendee.age > 0 && (
        <div className="p-3 rounded-lg mb-4" style={{ background: 'rgba(40, 167, 54, 0.1)' }}>
          <p className="text-sm" style={{ color: 'var(--success)' }}>
            🎉 Children under 5 enter free! No ticket needed.
          </p>
        </div>
      )}

      {/* Ticket type selection */}
      {cat && cat !== AgeCategory.TODDLER && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--heading)' }}>
            Ticket Type
          </label>
          <div className="space-y-2">
            {ticketOptions.map(({ type, soldOut }) => (
              <label
                key={type}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  attendee.ticketType === type
                    ? 'border-[var(--primary)]'
                    : soldOut
                      ? 'opacity-50 cursor-not-allowed'
                      : 'border-transparent hover:border-[var(--gold)]'
                }`}
                style={{
                  background: attendee.ticketType === type
                    ? 'rgba(201, 155, 36, 0.1)'
                    : 'rgba(0,0,0,0.03)',
                }}
              >
                <input
                  type="radio"
                  name={`ticket-${index}`}
                  className="sr-only"
                  disabled={soldOut}
                  checked={attendee.ticketType === type}
                  onChange={() => dispatch({ type: 'SET_ATTENDEE_TICKET', index, ticketType: type })}
                />
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: attendee.ticketType === type ? 'var(--primary)' : 'var(--gold)',
                  }}
                >
                  {attendee.ticketType === type && (
                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm" style={{ color: 'var(--heading)' }}>
                      {TICKET_LABELS[type]}
                    </span>
                    {soldOut ? (
                      <span className="badge-sold-out">Sold Out</span>
                    ) : (
                      <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                        {formatCents(
                          type === TicketType.DAY_PASS_ADULT ? 1500 :
                          type === TicketType.DAY_PASS_CHILD ? 800 :
                          type === TicketType.ALL_DAY_ADULT ? 6000 :
                          type === TicketType.ALL_DAY_CHILD ? 3000 :
                          4000
                        )}
                        {(type === TicketType.DAY_PASS_ADULT || type === TicketType.DAY_PASS_CHILD) && '/day'}
                      </span>
                    )}
                  </div>
                  {type === TicketType.FAMILY_PASS && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--primary-text)' }}>
                      Covers 2 adults + 2 children for one day
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Day selection */}
      {attendee.ticketType && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--heading)' }}>
            {isAllDay ? 'Days Included (All 5 days)' : isFamilyPass ? 'Select Day' : 'Select Days'}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {FESTIVAL_DAYS.map((day) => {
              const selected = attendee.selectedDays.includes(day);
              const disabled = isAllDay; // Can't change all-day pass days

              return (
                <button
                  key={day}
                  disabled={disabled}
                  onClick={() => dispatch({ type: 'TOGGLE_ATTENDEE_DAY', index, day: day as FestivalDay })}
                  className={`p-2 rounded-lg text-sm font-medium border transition-all ${
                    selected
                      ? 'border-[var(--primary)]'
                      : 'border-transparent'
                  } ${disabled ? 'opacity-60' : 'hover:border-[var(--gold)]'}`}
                  style={{
                    background: selected
                      ? 'rgba(201, 155, 36, 0.15)'
                      : 'rgba(0,0,0,0.05)',
                    color: selected ? 'var(--primary)' : 'var(--primary-text)',
                  }}
                >
                  {DAY_LABELS[day]}
                  {selected && ' ✓'}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
