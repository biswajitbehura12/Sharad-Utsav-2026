# Test Cases — Sharad Utsav 2026 Ticketing

These are the edge cases and scenarios I identified as worth testing, along with what the system does in each case.

---

## Pricing Edge Cases

| # | Scenario | Expected Behaviour | Status |
|---|----------|-------------------|--------|
| 1 | Adult day pass, 1 day | Charges $15 | ✅ Tested |
| 2 | Adult day pass, 3 days | Charges $45 ($15 × 3) | ✅ Tested |
| 3 | Child day pass, 2 days | Charges $16 ($8 × 2) | ✅ Tested |
| 4 | Adult all-day pass | Charges $60 flat | ✅ Tested |
| 5 | Child all-day pass | Charges $30 flat | ✅ Tested |
| 6 | Family pass (2 adults + 2 children, 1 day) | Charges $40 once, not $160 (4 × $40) | ✅ Tested |
| 7 | Dandiya sticks, 3 pairs | Charges $15 ($5 × 3) | ✅ Tested |
| 8 | Dinner plates for 2 days | Charges $24 ($12 × 2) | ✅ Tested |
| 9 | Garba workshop, 2 sessions | Charges $40 ($20 × 2) | ✅ Tested |
| 10 | Mixed group: 1 adult + 1 child | Correct combined total ($15 + $8 = $23) | ✅ Tested |
| 11 | Complex booking with extras and SEVA10 | Integer cents, no float errors | ✅ Tested |

## Promo Code Edge Cases

| # | Scenario | Expected Behaviour | Status |
|---|----------|-------------------|--------|
| 12 | SEVA10 on $15 ticket | 10% off → $1.50 discount, $13.50 total | ✅ Tested |
| 13 | FLAT20 on $45 booking | $20 off → $25 total | ✅ Tested |
| 14 | FLAT20 on $8 booking (less than $20) | Caps at subtotal, $0 total | ✅ Tested |
| 15 | KIDSFREE with adult + child | Only child ticket discounted | ✅ Tested |
| 16 | KIDSFREE with adults only | No discount applied, message explains | ✅ Tested |
| 17 | EXPIRED5 code | Validation error: code has expired | ✅ Tested |
| 18 | MAXEDOUT code | Validation error: max uses reached | ✅ Tested |
| 19 | Unknown promo code | Validation error: not a valid code | ✅ Tested |
| 20 | Case-insensitive promo entry (seva10) | Treated as SEVA10 | ✅ Handled |

## Age Rule Edge Cases

| # | Scenario | Expected Behaviour | Status |
|---|----------|-------------------|--------|
| 21 | Child (age 7) on adult ticket | Server rejects: must use child ticket | ✅ Tested |
| 22 | Adult (age 15) on child ticket | Server rejects: must use adult ticket | ✅ Tested |
| 23 | Toddler (age 3) with any ticket | Server rejects: under 5 is free, no ticket | ✅ Tested |
| 24 | Age exactly 5 on child ticket | Accepted — boundary: child category starts at 5 | ✅ Tested |
| 25 | Age exactly 11 on child ticket | Accepted — boundary: last child age | ✅ Tested |
| 26 | Age exactly 12 on adult ticket | Accepted — boundary: adult category starts at 12 | ✅ Tested |
| 27 | Booker age under 18 | Rejected: must be 18+ to book | ✅ Tested |
| 28 | Booker age exactly 18 | Accepted | ✅ Tested |
| 29 | Negative age (-5) | Rejected: invalid age | ✅ Tested |
| 30 | Age over 150 (200) | Rejected: invalid age | ✅ Tested |
| 31 | Fractional age (7.5) | Rejected: ages must be whole numbers | ✅ Tested |

## Stock & Inventory Edge Cases

| # | Scenario | Expected Behaviour | Status |
|---|----------|-------------------|--------|
| 32 | All-Day Pass Adult (stock: 0) | UI shows "Sold Out", server rejects if attempted | ✅ Handled |
| 33 | Garba Workshop (stock: 2) | Shows "Only 2 spots left!", blocks after 2 sold | ✅ Handled |
| 34 | Two concurrent bookings for last 2 workshop spots | Atomic decrement: only one succeeds if stock exhausted | ✅ Handled (mutex lock) |
| 35 | Booking that exceeds dandiya stick stock | Server rejects with stock error | ✅ Handled |

## Family Pass Edge Cases

| # | Scenario | Expected Behaviour | Status |
|---|----------|-------------------|--------|
| 36 | Family pass with 3 people (not 4) | Validation error: must be exactly 2 adults + 2 children | ✅ Handled |
| 37 | Family pass with 3 adults + 1 child | Validation error: composition wrong | ✅ Handled |
| 38 | Family pass members on different days | Validation error: all must be on same day | ✅ Handled |
| 39 | Family pass for one day only | Accepted — that's the rule | ✅ Handled |

## UI & UX Edge Cases

| # | Scenario | Expected Behaviour | Status |
|---|----------|-------------------|--------|
| 40 | User adds then removes an attendee | Form state stays consistent, ticket count matches | ✅ Handled |
| 41 | User changes age after selecting ticket | Auto-switches to correct ticket category | ✅ Handled |
| 42 | User changes ticket type after selecting days | Days reset if switching to all-day or family pass | ✅ Handled |
| 43 | Double-click on "Pay" button | Idempotency key prevents duplicate booking | ✅ Handled |
| 44 | Network error during payment | Error message shown, can retry | ✅ Handled |
| 45 | No attendees in booking | Validation blocks progression | ✅ Handled |

## Dinner Plate for Toddlers

| # | Scenario | Expected Behaviour | Status |
|---|----------|-------------------|--------|
| 46 | Toddler (under 5) wants dinner plate | Allowed — $12 charged per day selected | ✅ Handled |
| 47 | Toddler dinner plate priced correctly | Same $12/day as everyone else | ✅ Tested |

## Garba Workshop for Non-Attending Days

| # | Scenario | Expected Behaviour | Status |
|---|----------|-------------------|--------|
| 48 | Workshop on Nov 12 (not a workshop day) | Server rejects: only Nov 11 & Nov 13 | ✅ Handled |
| 49 | Workshop on Nov 11 but not attending that day | Server rejects: must attend the day | ✅ Handled |
| 50 | Workshop for toddler (under 5) | Server rejects: not available for under-5s | ✅ Handled |
