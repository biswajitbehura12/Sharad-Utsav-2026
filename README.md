# Sharad Utsav 2026 — Ticketing & Booking System

**Live Production URL:** https://sharad-utsav-2026.vercel.app/  
**GitHub Repository:** https://github.com/biswajitbehura12/Sharad-Utsav-2026

A full-stack Next.js (App Router) + TypeScript booking application for **Sharad Utsav 2026** at **Radha Krishna Temple, Allen, Texas** (Tue 10 Nov 2026 – Sat 14 Nov 2026).

---

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Running Tests & Checks

```bash
npm test            # Run Vitest unit tests (pricing & age/validation rules)
npx tsc --noEmit    # TypeScript typecheck
npm run lint        # ESLint
npm run build       # Production build
```

---

## Environment Variables (Vercel)

Currently the app runs without required environment variables (using simulated payment and in-memory inventory). If persistent Redis/Postgres storage or Stripe test mode is configured on Vercel, set:

| Variable | Purpose |
| --- | --- |
| `KV_REST_API_URL` *(optional)* | Upstash / Vercel KV REST URL for persistent atomic stock across serverless invocations |
| `KV_REST_API_TOKEN` *(optional)* | Upstash / Vercel KV REST token |

---

## API Contract

All pricing, validation, promo code evaluation, and stock checks are executed on the server. All monetary values are in **integer cents (USD)**.

| Endpoint | Method | Request Body / Params | Response Shape |
| --- | --- | --- | --- |
| `/api/inventory` | `GET` | — | `{ items: Record<string, number>, catalog: { tickets: [...], extras: [...] } }` |
| `/api/bookings/calculate` | `POST` | `BookingRequest` (`booker`, `attendees[]`, `promoCode?`, `clientRequestId`) | `{ success: boolean, breakdown?: PriceBreakdown, promoMessage?: string, errors?: ValidationError[] }` |
| `/api/bookings/confirm` | `POST` | `BookingRequest` (`booker`, `attendees[]`, `promoCode?`, `clientRequestId`) | `{ success: boolean, bookingId?: string, breakdown?: PriceBreakdown, promoMessage?: string, errors?: ValidationError[] }` |

### Key Domain Guarantees
- **Server-side pricing:** The client never sends prices or totals; `/api/bookings/calculate` and `/api/bookings/confirm` compute `PriceBreakdown` in integer cents from server-owned constants.
- **Idempotency:** `/api/bookings/confirm` checks `clientRequestId` so double-clicks or retries return the original `bookingId` without double-decrementing stock.
- **Atomic stock decrement:** `decrementStock()` uses a mutex lock around check-and-decrement so concurrent requests for the last 2 Garba Workshop spots cannot oversell.

---

## Decisions I Made

These are the ambiguities intentionally left open in the brief, and how I chose to handle them:

1. **Toddlers (under 5) and Extras (Dinner Plate vs. Garba Workshop):**
   - *Question:* Children under 5 enter free and need no ticket, so they have no `selectedDays`. Can they still order a Dinner Plate or Garba Workshop?
   - *Decision:* Toddlers **can** order Dinner Plates ($12/day for any festival day) because a parent may want a meal plate for them, but they **cannot** book the Garba Workshop ($20) or need a ticket. We still collect their name for door headcount.
2. **Family Pass Composition & Pricing (`KIDSFREE` interaction):**
   - *Question:* A Family Pass ($40 flat) covers 2 adults + 2 children for 1 day. What if a family has 5 people (2 adults + 3 children), or applies `KIDSFREE`?
   - *Decision:* Mixed groups are supported—4 members select `FAMILY_PASS` on the same single day (charged **$40 once**, not $40 × 4), and the 5th person selects an individual Day Pass. `KIDSFREE` applies only to individual child tickets (`DAY_PASS_CHILD`, `ALL_DAY_CHILD`), not to the already-bundled Family Pass.
3. **`FLAT20` ($20 off) when subtotal is under $20:**
   - *Question:* What if a single child day pass ($8) uses `FLAT20`?
   - *Decision:* The discount is capped at `subtotalCents` (`Math.min(2000, subtotalCents)`) so the total never becomes negative ($0.00 minimum).
4. **All-Day Pass Sold Out (Adult = 0 remaining):**
   - *Question:* Adult All-Day Pass is sold out, but can an adult still attend all 5 days?
   - *Decision:* Yes—the All-Day Pass option is disabled/badged `Sold Out`, while the adult can still select all 5 days via `Day Pass – Adult` ($15 × 5 = $75).
5. **Workshop & Dinner Day Coupling:**
   - *Question:* Can someone buy a Dinner Plate or Garba Workshop on a day they do not have an entry ticket for?
   - *Decision:* No (except toddlers for Dinner Plates). The server rejects Dinner Plates or Garba Workshops for any day not in the attendee's `selectedDays`, and restricts Garba Workshop strictly to Nov 11 and Nov 13.
6. **Promo Code `KIDSFREE` with Adults Only:**
   - *Decision:* Accepted as a valid code, returns `$0.00` discount, and displays an informational message (`Applied (no child tickets in this booking)`).

---

## Supporting Multiple Festivals (10 Festivals, 10 Rule Sets)

Currently, `FESTIVAL_DAYS`, `TICKET_PRICES`, `EXTRA_PRICES`, `PROMO_CODES`, and `GARBA_WORKSHOP_DAYS` are typed constants in `src/lib/types.ts`. To support 10 different festivals with different rule sets:
- Extract a `FestivalConfig` schema (dates, currency, ticket tiers with age bands, extra rules with allowed dates, promo rules) stored per `festivalId` in Postgres.
- Parameterize `calculatePriceBreakdown(booking, festivalConfig)` and `validateBooking(booking, festivalConfig)` so all rules are data-driven rather than hardcoded to Sharad Utsav 2026.

---

## Unfinished / Known Limitations

- **In-memory persistence:** `src/lib/inventory.ts` and `bookingStore` currently use in-memory structures rather than an external database (Upstash Redis / Neon Postgres). On Vercel serverless functions, cold starts will reset stock counts to `INITIAL_INVENTORY`.
- **`GET /api/bookings/[id]` endpoint:** Planned in `DESIGN.md` for reloading a confirmation page by ID, not yet implemented.
- **Simulated payment only:** The payment step simulates card validation rather than calling Stripe test mode.
