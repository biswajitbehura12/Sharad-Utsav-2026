// ============================================================
// Domain types for Sharad Utsav 2026 ticketing
// All money values are in integer cents (USD).
// ============================================================

/** The five festival days — a closed set, not arbitrary dates. */
export const FESTIVAL_DAYS = [
  '2026-11-10',
  '2026-11-11',
  '2026-11-12',
  '2026-11-13',
  '2026-11-14',
] as const;

export type FestivalDay = (typeof FESTIVAL_DAYS)[number];

/** Days on which the Garba Workshop runs. */
export const GARBA_WORKSHOP_DAYS: readonly FestivalDay[] = ['2026-11-11', '2026-11-13'];

// ---- Ticket types ----

export enum TicketType {
  DAY_PASS_ADULT = 'DAY_PASS_ADULT',
  DAY_PASS_CHILD = 'DAY_PASS_CHILD',
  ALL_DAY_ADULT = 'ALL_DAY_ADULT',
  ALL_DAY_CHILD = 'ALL_DAY_CHILD',
  FAMILY_PASS = 'FAMILY_PASS',
}

export enum ExtraType {
  DANDIYA_STICKS = 'DANDIYA_STICKS',
  DINNER_PLATE = 'DINNER_PLATE',
  GARBA_WORKSHOP = 'GARBA_WORKSHOP',
}

// ---- Age categories ----

export enum AgeCategory {
  TODDLER = 'TODDLER',   // under 5 — free, no ticket
  CHILD = 'CHILD',        // 5–11
  ADULT = 'ADULT',        // 12+
}

export function ageCategory(age: number): AgeCategory {
  if (age < 5) return AgeCategory.TODDLER;
  if (age < 12) return AgeCategory.CHILD;
  return AgeCategory.ADULT;
}

// ---- Pricing (all in cents) ----

export const TICKET_PRICES: Record<TicketType, number> = {
  [TicketType.DAY_PASS_ADULT]: 1500,   // $15 per person per day
  [TicketType.DAY_PASS_CHILD]: 800,    // $8 per person per day
  [TicketType.ALL_DAY_ADULT]: 6000,    // $60 flat
  [TicketType.ALL_DAY_CHILD]: 3000,    // $30 flat
  [TicketType.FAMILY_PASS]: 4000,      // $40 flat — 2 adults + 2 children, 1 day
};

export const EXTRA_PRICES: Record<ExtraType, number> = {
  [ExtraType.DANDIYA_STICKS]: 500,     // $5 each
  [ExtraType.DINNER_PLATE]: 1200,      // $12 per person per day
  [ExtraType.GARBA_WORKSHOP]: 2000,    // $20 each
};

// ---- Inventory ----

export const INITIAL_INVENTORY: Record<string, number> = {
  [TicketType.DAY_PASS_ADULT]: 380,
  [TicketType.DAY_PASS_CHILD]: 260,
  [TicketType.ALL_DAY_ADULT]: 0,
  [TicketType.ALL_DAY_CHILD]: 140,
  [TicketType.FAMILY_PASS]: 95,
  [ExtraType.DANDIYA_STICKS]: 900,
  [ExtraType.DINNER_PLATE]: 1700,
  [ExtraType.GARBA_WORKSHOP]: 2,
};

// ---- Promo codes ----

export enum PromoCodeStatus {
  VALID = 'VALID',
  EXPIRED = 'EXPIRED',
  MAXED_OUT = 'MAXED_OUT',
  NOT_FOUND = 'NOT_FOUND',
}

export interface PromoCodeDef {
  code: string;
  status: PromoCodeStatus;
  type: 'PERCENT' | 'FLAT' | 'KIDS_FREE';
  /** Percentage off (0–100) for PERCENT, or cents off for FLAT. */
  value: number;
  description: string;
}

export const PROMO_CODES: Record<string, PromoCodeDef> = {
  SEVA10: {
    code: 'SEVA10',
    status: PromoCodeStatus.VALID,
    type: 'PERCENT',
    value: 10,
    description: '10% off the whole booking',
  },
  FLAT20: {
    code: 'FLAT20',
    status: PromoCodeStatus.VALID,
    type: 'FLAT',
    value: 2000,
    description: '$20 off the whole booking',
  },
  KIDSFREE: {
    code: 'KIDSFREE',
    status: PromoCodeStatus.VALID,
    type: 'KIDS_FREE',
    value: 0,
    description: 'Child tickets are free',
  },
  EXPIRED5: {
    code: 'EXPIRED5',
    status: PromoCodeStatus.EXPIRED,
    type: 'PERCENT',
    value: 5,
    description: 'This code has expired',
  },
  MAXEDOUT: {
    code: 'MAXEDOUT',
    status: PromoCodeStatus.MAXED_OUT,
    type: 'PERCENT',
    value: 10,
    description: 'This code has already been used the maximum number of times',
  },
};

// ---- Attendee extras ----

export interface AttendeeExtra {
  type: ExtraType;
  /** For DANDIYA_STICKS: quantity. For DINNER_PLATE: array of days. For GARBA_WORKSHOP: array of days. */
  quantity?: number;
  days?: FestivalDay[];
}

// ---- Attendee ----

export interface AttendeeInput {
  name: string;
  age: number;
  /** Required for adults (12+). */
  email?: string;
  /** Required for adults (12+). */
  phone?: string;
  ticketType: TicketType | null; // null for toddlers (under 5)
  selectedDays: FestivalDay[];
  extras: AttendeeExtra[];
}

// ---- Booking ----

export interface BookerInfo {
  name: string;
  email: string;
  phone: string;
  age: number;
}

export interface BookingRequest {
  booker: BookerInfo;
  attendees: AttendeeInput[];
  promoCode?: string;
  clientRequestId: string; // idempotency key
}

// ---- Line items (server response) ----

export interface LineItem {
  description: string;
  attendeeName: string;
  unitPriceCents: number;
  quantity: number;
  totalCents: number;
}

export interface PriceBreakdown {
  lineItems: LineItem[];
  subtotalCents: number;
  discountCents: number;
  discountDescription?: string;
  totalCents: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface CalculateResponse {
  success: boolean;
  breakdown?: PriceBreakdown;
  errors?: ValidationError[];
  promoMessage?: string;
}

export interface ConfirmResponse {
  success: boolean;
  bookingId?: string;
  breakdown?: PriceBreakdown;
  errors?: ValidationError[];
  promoMessage?: string;
}

export interface InventoryResponse {
  items: Record<string, number>;
  catalog: {
    tickets: Array<{
      type: TicketType;
      label: string;
      priceCents: number;
      perDay: boolean;
      description: string;
      ageGroup: 'adult' | 'child' | 'family';
    }>;
    extras: Array<{
      type: ExtraType;
      label: string;
      priceCents: number;
      perDay: boolean;
      description: string;
      availableDays?: FestivalDay[];
    }>;
  };
}

/** Human-readable labels for ticket types */
export const TICKET_LABELS: Record<TicketType, string> = {
  [TicketType.DAY_PASS_ADULT]: 'Day Pass – Adult',
  [TicketType.DAY_PASS_CHILD]: 'Day Pass – Child',
  [TicketType.ALL_DAY_ADULT]: 'All-Day Pass – Adult',
  [TicketType.ALL_DAY_CHILD]: 'All-Day Pass – Child',
  [TicketType.FAMILY_PASS]: 'Family Pass',
};

export const EXTRA_LABELS: Record<ExtraType, string> = {
  [ExtraType.DANDIYA_STICKS]: 'Dandiya Sticks (pair)',
  [ExtraType.DINNER_PLATE]: 'Dinner Plate',
  [ExtraType.GARBA_WORKSHOP]: 'Garba Workshop',
};

export const DAY_LABELS: Record<FestivalDay, string> = {
  '2026-11-10': 'Tue, Nov 10',
  '2026-11-11': 'Wed, Nov 11',
  '2026-11-12': 'Thu, Nov 12',
  '2026-11-13': 'Fri, Nov 13',
  '2026-11-14': 'Sat, Nov 14',
};
