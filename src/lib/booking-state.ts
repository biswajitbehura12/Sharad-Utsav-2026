// ============================================================
// Booking state machine — a reducer-based state manager
// that keeps all booking flow state in one place.
// ============================================================

import {
  type AttendeeInput,
  type BookerInfo,
  type PriceBreakdown,
  type ValidationError,
  type FestivalDay,
  type AttendeeExtra,
  TicketType,
  ExtraType,
  FESTIVAL_DAYS,
  AgeCategory,
  ageCategory,
} from '@/lib/types';

/** Steps in the booking flow */
export type BookingStep = 'tickets' | 'attendees' | 'extras' | 'review' | 'payment' | 'confirmation';

export interface BookingState {
  step: BookingStep;
  booker: BookerInfo;
  attendees: AttendeeInput[];
  promoCode: string;
  promoMessage: string;
  clientRequestId: string;
  breakdown: PriceBreakdown | null;
  errors: ValidationError[];
  bookingId: string | null;
  isSubmitting: boolean;
  isCalculating: boolean;
}

export type BookingAction =
  | { type: 'SET_STEP'; step: BookingStep }
  | { type: 'SET_BOOKER'; booker: Partial<BookerInfo> }
  | { type: 'ADD_ATTENDEE' }
  | { type: 'REMOVE_ATTENDEE'; index: number }
  | { type: 'UPDATE_ATTENDEE'; index: number; data: Partial<AttendeeInput> }
  | { type: 'SET_ATTENDEE_TICKET'; index: number; ticketType: TicketType | null }
  | { type: 'TOGGLE_ATTENDEE_DAY'; index: number; day: FestivalDay }
  | { type: 'SET_ATTENDEE_EXTRA'; index: number; extra: AttendeeExtra }
  | { type: 'REMOVE_ATTENDEE_EXTRA'; index: number; extraType: ExtraType }
  | { type: 'SET_PROMO'; code: string }
  | { type: 'SET_PROMO_MESSAGE'; message: string }
  | { type: 'SET_BREAKDOWN'; breakdown: PriceBreakdown }
  | { type: 'SET_ERRORS'; errors: ValidationError[] }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_BOOKING_ID'; bookingId: string }
  | { type: 'SET_SUBMITTING'; value: boolean }
  | { type: 'SET_CALCULATING'; value: boolean }
  | { type: 'RESET' };

export function createInitialState(): BookingState {
  return {
    step: 'tickets',
    booker: { name: '', email: '', phone: '', age: 0 },
    attendees: [createEmptyAttendee()],
    promoCode: '',
    promoMessage: '',
    clientRequestId: '',
    breakdown: null,
    errors: [],
    bookingId: null,
    isSubmitting: false,
    isCalculating: false,
  };
}

export function createEmptyAttendee(): AttendeeInput {
  return {
    name: '',
    age: 0,
    email: '',
    phone: '',
    ticketType: null,
    selectedDays: [],
    extras: [],
  };
}

function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step, errors: [] };

    case 'SET_BOOKER':
      return { ...state, booker: { ...state.booker, ...action.booker } };

    case 'ADD_ATTENDEE':
      return { ...state, attendees: [...state.attendees, createEmptyAttendee()] };

    case 'REMOVE_ATTENDEE': {
      if (state.attendees.length <= 1) return state;
      const attendees = state.attendees.filter((_, i) => i !== action.index);
      return { ...state, attendees };
    }

    case 'UPDATE_ATTENDEE': {
      const attendees = [...state.attendees];
      attendees[action.index] = { ...attendees[action.index], ...action.data };

      // Auto-set ticket type based on age
      const att = attendees[action.index];
      if (action.data.age !== undefined) {
        const cat = ageCategory(action.data.age);
        if (cat === AgeCategory.TODDLER) {
          att.ticketType = null;
          att.selectedDays = [];
        } else if (cat === AgeCategory.CHILD) {
          // If currently on adult ticket, switch to child equivalent
          if (att.ticketType === TicketType.DAY_PASS_ADULT) {
            att.ticketType = TicketType.DAY_PASS_CHILD;
          } else if (att.ticketType === TicketType.ALL_DAY_ADULT) {
            att.ticketType = TicketType.ALL_DAY_CHILD;
          }
        } else {
          // Adult — if currently on child ticket, switch to adult equivalent
          if (att.ticketType === TicketType.DAY_PASS_CHILD) {
            att.ticketType = TicketType.DAY_PASS_ADULT;
          } else if (att.ticketType === TicketType.ALL_DAY_CHILD) {
            att.ticketType = TicketType.ALL_DAY_ADULT;
          }
        }
      }

      return { ...state, attendees };
    }

    case 'SET_ATTENDEE_TICKET': {
      const attendees = [...state.attendees];
      const att = { ...attendees[action.index] };
      att.ticketType = action.ticketType;

      // Auto-set days for all-day passes
      if (action.ticketType === TicketType.ALL_DAY_ADULT || action.ticketType === TicketType.ALL_DAY_CHILD) {
        att.selectedDays = [...FESTIVAL_DAYS];
      } else if (action.ticketType === TicketType.FAMILY_PASS) {
        // Family pass: keep existing day selection but limit to 1
        att.selectedDays = att.selectedDays.length > 0 ? [att.selectedDays[0]] : [];
      } else if (action.ticketType === null) {
        att.selectedDays = [];
      }

      attendees[action.index] = att;
      return { ...state, attendees };
    }

    case 'TOGGLE_ATTENDEE_DAY': {
      const attendees = [...state.attendees];
      const att = { ...attendees[action.index] };

      // For all-day pass, days cannot be changed
      if (att.ticketType === TicketType.ALL_DAY_ADULT || att.ticketType === TicketType.ALL_DAY_CHILD) {
        return state;
      }

      // For family pass, only 1 day allowed
      if (att.ticketType === TicketType.FAMILY_PASS) {
        att.selectedDays = [action.day];
      } else {
        // Toggle day for day passes
        const idx = att.selectedDays.indexOf(action.day);
        if (idx >= 0) {
          att.selectedDays = att.selectedDays.filter((d) => d !== action.day);
        } else {
          att.selectedDays = [...att.selectedDays, action.day];
        }
      }

      // Remove extras for days no longer selected
      att.extras = att.extras.map((extra) => {
        if (extra.days) {
          return { ...extra, days: extra.days.filter((d) => att.selectedDays.includes(d)) };
        }
        return extra;
      });

      attendees[action.index] = att;
      return { ...state, attendees };
    }

    case 'SET_ATTENDEE_EXTRA': {
      const attendees = [...state.attendees];
      const att = { ...attendees[action.index] };
      const existingIdx = att.extras.findIndex((e) => e.type === action.extra.type);
      if (existingIdx >= 0) {
        att.extras = [...att.extras];
        att.extras[existingIdx] = action.extra;
      } else {
        att.extras = [...att.extras, action.extra];
      }
      attendees[action.index] = att;
      return { ...state, attendees };
    }

    case 'REMOVE_ATTENDEE_EXTRA': {
      const attendees = [...state.attendees];
      const att = { ...attendees[action.index] };
      att.extras = att.extras.filter((e) => e.type !== action.extraType);
      attendees[action.index] = att;
      return { ...state, attendees };
    }

    case 'SET_PROMO':
      return { ...state, promoCode: action.code };

    case 'SET_PROMO_MESSAGE':
      return { ...state, promoMessage: action.message };

    case 'SET_BREAKDOWN':
      return { ...state, breakdown: action.breakdown };

    case 'SET_ERRORS':
      return { ...state, errors: action.errors };

    case 'CLEAR_ERRORS':
      return { ...state, errors: [] };

    case 'SET_BOOKING_ID':
      return { ...state, bookingId: action.bookingId };

    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.value };

    case 'SET_CALCULATING':
      return { ...state, isCalculating: action.value };

    case 'RESET':
      return createInitialState();

    default:
      return state;
  }
}
