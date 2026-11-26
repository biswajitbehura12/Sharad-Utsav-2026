// ============================================================
// Server-side validation — every rule from sections 3, 4, 5.
// Returns a list of validation errors. Empty = valid.
// ============================================================

import {
  type BookingRequest,
  type ValidationError,
  type AttendeeInput,
  type FestivalDay,
  TicketType,
  ExtraType,
  AgeCategory,
  ageCategory,
  FESTIVAL_DAYS,
  GARBA_WORKSHOP_DAYS,
  PROMO_CODES,
  PromoCodeStatus,
} from './types';

/** Validate the entire booking request */
export function validateBooking(booking: BookingRequest): ValidationError[] {
  const errors: ValidationError[] = [];

  // ---- Booker validation ----
  if (!booking.booker.name || booking.booker.name.trim().length === 0) {
    errors.push({ field: 'booker.name', message: 'Booker name is required.' });
  }
  if (!booking.booker.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.booker.email)) {
    errors.push({ field: 'booker.email', message: 'A valid email address is required.' });
  }
  if (!booking.booker.phone || booking.booker.phone.trim().length < 7) {
    errors.push({ field: 'booker.phone', message: 'A valid phone number is required.' });
  }
  if (typeof booking.booker.age !== 'number' || !Number.isInteger(booking.booker.age) || booking.booker.age < 0 || booking.booker.age > 150) {
    errors.push({ field: 'booker.age', message: 'Please enter a valid age.' });
  } else if (booking.booker.age < 18) {
    errors.push({ field: 'booker.age', message: 'The person making the booking must be at least 18 years old.' });
  }

  // ---- Must have at least one attendee ----
  if (!booking.attendees || booking.attendees.length === 0) {
    errors.push({ field: 'attendees', message: 'At least one attendee is required.' });
    return errors; // Can't validate further
  }

  // ---- Validate each attendee ----
  booking.attendees.forEach((att, i) => {
    const prefix = `attendees[${i}]`;
    const attErrors = validateAttendee(att, prefix);
    errors.push(...attErrors);
  });

  // ---- Family Pass: exactly 2 adults + 2 children, same day ----
  const familyPassAttendees = booking.attendees.filter(
    (a) => a.ticketType === TicketType.FAMILY_PASS
  );
  if (familyPassAttendees.length > 0) {
    // Must be exactly 4 people on a family pass (or multiples of 4 for multiple family passes)
    if (familyPassAttendees.length % 4 !== 0) {
      errors.push({
        field: 'attendees',
        message: `A Family Pass covers exactly 2 adults and 2 children. You have ${familyPassAttendees.length} people on Family Pass tickets.`,
      });
    } else {
      // Check composition: for each group of 4, need 2 adults + 2 children
      const adults = familyPassAttendees.filter((a) => ageCategory(a.age) === AgeCategory.ADULT);
      const children = familyPassAttendees.filter((a) => ageCategory(a.age) === AgeCategory.CHILD);
      const numPasses = familyPassAttendees.length / 4;

      if (adults.length !== numPasses * 2 || children.length !== numPasses * 2) {
        errors.push({
          field: 'attendees',
          message: `A Family Pass requires exactly 2 adults and 2 children per pass. Currently: ${adults.length} adults and ${children.length} children.`,
        });
      }

      // All family pass attendees on the same day (per family pass group)
      const days = new Set(familyPassAttendees.map((a) => a.selectedDays[0]));
      if (days.size > 1) {
        errors.push({
          field: 'attendees',
          message: 'All members on a Family Pass must attend the same day.',
        });
      }
    }
  }

  // ---- Promo code validation ----
  if (booking.promoCode) {
    const code = PROMO_CODES[booking.promoCode.toUpperCase()];
    if (!code) {
      errors.push({ field: 'promoCode', message: 'This promo code is not valid.' });
    } else if (code.status === PromoCodeStatus.EXPIRED) {
      errors.push({ field: 'promoCode', message: 'This promo code has expired.' });
    } else if (code.status === PromoCodeStatus.MAXED_OUT) {
      errors.push({
        field: 'promoCode',
        message: 'This promo code has already been used the maximum number of times.',
      });
    }
  }

  // ---- Client request ID ----
  if (!booking.clientRequestId || booking.clientRequestId.trim().length === 0) {
    errors.push({ field: 'clientRequestId', message: 'A unique request ID is required.' });
  }

  return errors;
}

/** Validate a single attendee */
function validateAttendee(att: AttendeeInput, prefix: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Name
  if (!att.name || att.name.trim().length === 0) {
    errors.push({ field: `${prefix}.name`, message: 'Attendee name is required.' });
  }

  // Age
  if (typeof att.age !== 'number' || !Number.isInteger(att.age) || att.age < 0 || att.age > 150) {
    errors.push({ field: `${prefix}.age`, message: 'Please enter a valid age (0–150).' });
    return errors; // Can't validate further without valid age
  }

  const cat = ageCategory(att.age);

  // ---- Age ↔ Ticket type matching ----
  if (cat === AgeCategory.TODDLER) {
    // Under 5: no ticket needed
    if (att.ticketType !== null) {
      errors.push({
        field: `${prefix}.ticketType`,
        message: 'Children under 5 do not need a ticket (they enter free).',
      });
    }
  } else if (cat === AgeCategory.CHILD) {
    // 5–11: must be on child ticket or family pass
    const validChildTickets: (TicketType | null)[] = [
      TicketType.DAY_PASS_CHILD,
      TicketType.ALL_DAY_CHILD,
      TicketType.FAMILY_PASS,
    ];
    if (!att.ticketType || !validChildTickets.includes(att.ticketType)) {
      errors.push({
        field: `${prefix}.ticketType`,
        message: 'Children aged 5–11 must be on a child ticket or Family Pass.',
      });
    }
  } else {
    // 12+: must be on adult ticket or family pass
    const validAdultTickets: (TicketType | null)[] = [
      TicketType.DAY_PASS_ADULT,
      TicketType.ALL_DAY_ADULT,
      TicketType.FAMILY_PASS,
    ];
    if (!att.ticketType || !validAdultTickets.includes(att.ticketType)) {
      errors.push({
        field: `${prefix}.ticketType`,
        message: 'Adults aged 12 and above must be on an adult ticket or Family Pass.',
      });
    }

    // Adults need email and phone
    if (!att.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(att.email)) {
      errors.push({ field: `${prefix}.email`, message: 'A valid email is required for adults.' });
    }
    if (!att.phone || att.phone.trim().length < 7) {
      errors.push({ field: `${prefix}.phone`, message: 'A valid phone number is required for adults.' });
    }
  }

  // ---- Day selection ----
  if (att.ticketType !== null && cat !== AgeCategory.TODDLER) {
    // All-day passes → must have all 5 days
    if (att.ticketType === TicketType.ALL_DAY_ADULT || att.ticketType === TicketType.ALL_DAY_CHILD) {
      if (att.selectedDays.length !== 5 || !FESTIVAL_DAYS.every((d) => att.selectedDays.includes(d))) {
        errors.push({
          field: `${prefix}.selectedDays`,
          message: 'All-Day Pass includes all 5 festival days.',
        });
      }
    }

    // Day passes → must have at least 1 day
    if (att.ticketType === TicketType.DAY_PASS_ADULT || att.ticketType === TicketType.DAY_PASS_CHILD) {
      if (att.selectedDays.length === 0) {
        errors.push({
          field: `${prefix}.selectedDays`,
          message: 'Please select at least one day for the Day Pass.',
        });
      }
    }

    // Family pass → exactly 1 day
    if (att.ticketType === TicketType.FAMILY_PASS) {
      if (att.selectedDays.length !== 1) {
        errors.push({
          field: `${prefix}.selectedDays`,
          message: 'Family Pass is for a single day. Please select exactly one day.',
        });
      }
    }

    // All selected days must be valid festival days
    for (const day of att.selectedDays) {
      if (!FESTIVAL_DAYS.includes(day as FestivalDay)) {
        errors.push({
          field: `${prefix}.selectedDays`,
          message: `"${day}" is not a valid festival day.`,
        });
      }
    }
  }

  // ---- Extras validation ----
  for (const extra of att.extras) {
    switch (extra.type) {
      case ExtraType.DANDIYA_STICKS: {
        if (extra.quantity !== undefined && (extra.quantity < 0 || !Number.isInteger(extra.quantity))) {
          errors.push({
            field: `${prefix}.extras.dandiya`,
            message: 'Dandiya sticks quantity must be a positive whole number.',
          });
        }
        if (extra.quantity !== undefined && extra.quantity > 20) {
          errors.push({
            field: `${prefix}.extras.dandiya`,
            message: 'Maximum 20 pairs of dandiya sticks per person.',
          });
        }
        break;
      }

      case ExtraType.DINNER_PLATE: {
        const dinnerDays = extra.days ?? [];
        // Dinner plates only for days the attendee is attending
        for (const day of dinnerDays) {
          // Toddlers can have dinner plates even without a ticket
          if (cat !== AgeCategory.TODDLER && !att.selectedDays.includes(day)) {
            errors.push({
              field: `${prefix}.extras.dinner`,
              message: `Dinner plate selected for ${day} but attendee is not attending that day.`,
            });
          }
        }
        break;
      }

      case ExtraType.GARBA_WORKSHOP: {
        const workshopDays = extra.days ?? [];
        for (const day of workshopDays) {
          if (!GARBA_WORKSHOP_DAYS.includes(day)) {
            errors.push({
              field: `${prefix}.extras.workshop`,
              message: `Garba Workshop is only available on Nov 11 and Nov 13.`,
            });
          }
          // Must be attending that day
          if (cat !== AgeCategory.TODDLER && !att.selectedDays.includes(day)) {
            errors.push({
              field: `${prefix}.extras.workshop`,
              message: `Garba Workshop selected for ${day} but attendee is not attending that day.`,
            });
          }
        }
        // Toddlers should not attend workshop
        if (cat === AgeCategory.TODDLER && workshopDays.length > 0) {
          errors.push({
            field: `${prefix}.extras.workshop`,
            message: 'Garba Workshop is not available for children under 5.',
          });
        }
        break;
      }
    }
  }

  return errors;
}
