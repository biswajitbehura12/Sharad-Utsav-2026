# Sharad Utsav 2026 — Ticketing System Design Note

_Written before coding begins._

---

## 1. Domain Model

### Core Entities

**Booking** — The top-level order. One booking = one payment = one person paying for a group.

- `id` (UUID)
- `bookerInfo` (contact details of the person paying)
- `attendees[]` — the people actually attending
- `lineItems[]` — derived from attendees + their selections
- `promoCode?` — optional, validated server-side
- `subtotal` / `discount` / `total` — all in **integer cents** to avoid float errors
- `status`: `draft | confirmed | payment_failed`
- `createdAt`, `confirmedAt`

**Attendee** — Each person in the group.

- `name`, `age`, `email?` (adults only), `phone?` (adults only)
- `ticketType` — one of the entry ticket types
- `selectedDays[]` — which days (for Day Pass holders)
- `extras[]` — dandiya sticks qty, dinner plates per day, garba workshop

**TicketType** — An enum, not a free-text label.

```
DAY_PASS_ADULT | DAY_PASS_CHILD | ALL_DAY_ADULT | ALL_DAY_CHILD | FAMILY_PASS
```

Pricing is driven by ticket type + days, never by string matching on a name. This means an admin renaming "Day Pass" to "Single Day Entry" won't break any rules.

**Extras** — Also enum-driven:

```
DANDIYA_STICKS | DINNER_PLATE | GARBA_WORKSHOP
```

### Money

All money is stored and calculated in **integer cents**. `$15.00` → `1500`. Conversion to display dollars happens only at the UI layer. This avoids IEEE 754 float issues entirely.

### Dates

The 5 festival days are modelled as an enum of date strings:

```
2026-11-10 | 2026-11-11 | 2026-11-12 | 2026-11-13 | 2026-11-14
```

This is a closed set — no arbitrary dates.

---

## 2. API Design

All routes are Next.js API route handlers under `/api/`.

### `GET /api/inventory`

Returns current stock for every item, plus the full ticket/extra catalog with prices. The frontend uses this to show what's available and grey out sold-out items.

### `POST /api/bookings/calculate`

Accepts the full booking payload (attendees, days, extras, promo code). Returns:

- Server-calculated line items with prices
- Subtotal, discount, total (all in cents)
- Any validation errors

This is used for the "review" step before payment. **The browser never calculates the total.**

### `POST /api/bookings/confirm`

Same payload as calculate, plus a payment token (simulated or Stripe). The server:

1. Re-validates everything
2. Re-calculates the price
3. Checks stock atomically (compare-and-swap or DB transaction)
4. If stock is sufficient, decrements stock and creates the booking
5. Returns confirmation with booking ID

Idempotency: a `clientRequestId` header guards against double-submit. If we see the same ID twice, we return the original booking.

### `GET /api/bookings/:id`

Returns booking details for the confirmation page.

---

## 3. Validation & Business Rules (server-side)

All of these are enforced on the server regardless of what the browser sends:

1. **Age → ticket type mapping**: age < 5 = free (no ticket), 5–11 = child ticket only, 12+ = adult ticket only. Mismatch → reject.
2. **Booker must be 18+**.
3. **Day pass → at least one day selected**. All-day pass → all 5 days, cannot change.
4. **Family pass** → covers exactly 2 adults + 2 children for one day. I will model it as a single line item that implicitly covers 4 people.
5. **Garba workshop** → only valid on Nov 11 and Nov 13. If attendee is not attending on that day, reject.
6. **Dinner plate** → only for days the attendee is actually attending.
7. **Stock check** at confirmation time, not at browse time.
8. **Promo code** validation — expiry, usage count, type.

---

## 4. Tricky Cases I've Spotted

1. **Family Pass + extra people**: A family of 5 (2 adults + 3 kids). They need a Family Pass + 1 extra child day pass. The UI needs to handle this mixed scenario.
2. **Children under 5**: They're free and need no ticket. But they might still want dinner plates. Do we allow extras for un-ticketed toddlers? **Decision: Yes, we allow dinner plates for under-5s but not workshop or dandiya (they won't use them). We still collect the toddler's name for headcount.**
3. **Family Pass day selection**: The brief says "one single day." All 4 people covered by the Family Pass must attend the same day. The UI must enforce this.
4. **Promo code KIDSFREE + no child tickets**: The code is valid but has zero effect. Show a message saying "applied but no child tickets in this booking."
5. **All-Day Pass sold out (adult)**: Stock is 0. The UI must clearly show this and not allow selection. But a Day Pass for all 5 days ($75) is still possible — it's just more expensive than the All-Day ($60).
6. **Garba Workshop with only 2 remaining**: Two people booking 1 each at the same moment — only one can win. Need atomic stock decrement.
7. **Mixed promo codes**: Only one promo code per booking. The UI should make this clear.
8. **Person changes attendee count after filling details**: The form needs to handle adding/removing attendees gracefully.

---

## 5. What I'm Not Doing (and why)

- **No user accounts / login**: The brief says "no login." It's a one-off booking flow.
- **No admin panel**: Not in scope. Stock is seeded; bookings are stored.
- **No email confirmation**: Would need an email service. I'll show an on-screen confirmation instead.
- **No real payment initially**: I'll build a simulated payment flow. If time permits, I'll add Stripe test mode.
- **No i18n**: USD only, English only, as specified.

---

## 6. Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** with the brand colour palette
- **React Hook Form** + **Zod** for client-side validation (mirroring server-side Zod schemas)
- **SQLite via Turso** or **Neon Postgres** for persistent storage (serverless-compatible)
- **Vitest** for testing
- **Vercel** for deployment

---

## 7. Data Storage Decision

Vercel serverless functions are stateless — in-memory state dies between invocations. I need a real database. I'll use **Neon Postgres** (free tier) because:

- Serverless-compatible (HTTP driver)
- Persistent across invocations
- Supports transactions for atomic stock decrements
- Free tier is more than sufficient

Tables: `inventory`, `bookings`, `booking_attendees`, `promo_codes`.
