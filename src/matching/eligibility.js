// Hard eligibility filters. If ANY rule fails, the opportunity is removed from the
// volunteer's ranked list (and shown in a separate "not eligible" list with the reason).
// Scores are never used to override these rules.

import { ageBand } from '../config/taxonomy.js';

/**
 * Number of seats already taken. Only confirmed and verified-complete assignments
 * hold a seat; an unreviewed "interested" request does not.
 */
export function seatsTaken(opportunityId, assignments = []) {
  return assignments.filter(
    (a) => a.opportunity_id === opportunityId && (a.status === 'confirmed' || a.status === 'completed'),
  ).length;
}

export function seatsRemaining(opportunity, assignments = []) {
  return Math.max(0, (opportunity.capacity ?? 0) - seatsTaken(opportunity.id, assignments));
}

/**
 * Each rule returns { id, passed, message }. Keeping rules as a list makes it easy
 * to add a new one or show every reason a listing was filtered out.
 */
export const ELIGIBILITY_RULES = [
  {
    id: 'listing_open',
    check: ({ opportunity }) => ({
      passed: opportunity.status === 'open',
      message:
        opportunity.status === 'open'
          ? 'Listing is open'
          : `Listing is ${opportunity.status === 'hidden' ? 'under moderation review' : opportunity.status}`,
    }),
  },
  {
    id: 'capacity',
    check: ({ opportunity, assignments }) => {
      const left = seatsRemaining(opportunity, assignments);
      return { passed: left > 0, message: left > 0 ? `${left} spot(s) remaining` : 'All volunteer spots are filled' };
    },
  },
  {
    id: 'minimum_age',
    check: ({ volunteer, opportunity }) => {
      const band = ageBand(volunteer.age_band);
      const min = opportunity.min_age ?? 0;
      if (!band) return { passed: false, message: 'Volunteer age band is missing' };
      const passed = band.minAge >= min;
      return { passed, message: passed ? `Meets minimum age (${min}+)` : `Requires volunteers aged ${min}+` };
    },
  },
  {
    // Minors may only join listings where a named staff supervisor is present.
    id: 'minor_supervision',
    check: ({ volunteer, opportunity }) => {
      const band = ageBand(volunteer.age_band);
      if (!band?.isMinor) return { passed: true, message: 'Not applicable (adult volunteer)' };
      return {
        passed: Boolean(opportunity.supervised),
        message: opportunity.supervised
          ? 'On-site adult supervision provided for youth volunteers'
          : 'Youth volunteers need a supervised listing',
      };
    },
  },
  {
    // Adults may only work with minors when supervised AND background-checked.
    id: 'adult_minor_safeguard',
    check: ({ volunteer, opportunity }) => {
      const band = ageBand(volunteer.age_band);
      if (band?.isMinor || !opportunity.serves_minors) {
        return { passed: true, message: 'Not applicable (listing does not involve adults working with minors)' };
      }
      if (!opportunity.supervised) {
        return { passed: false, message: 'Listing involves minors but has no on-site supervision' };
      }
      if (!volunteer.background_check) {
        return { passed: false, message: 'Working with minors requires a completed background check' };
      }
      return { passed: true, message: 'Supervised setting and background check on file' };
    },
  },
  {
    id: 'background_check',
    check: ({ volunteer, opportunity }) => {
      if (!opportunity.requires_background_check) return { passed: true, message: 'No background check required' };
      return {
        passed: Boolean(volunteer.background_check),
        message: volunteer.background_check ? 'Background check on file' : 'Listing requires a background check',
      };
    },
  },
  {
    // schedule_mode "all": every listed time slot is mandatory.
    // schedule_mode "any": the volunteer must be free for at least one slot.
    id: 'schedule',
    check: ({ volunteer, opportunity }) => {
      const needed = opportunity.schedule_slots ?? [];
      if (needed.length === 0) return { passed: true, message: 'Flexible schedule' };
      const free = new Set(volunteer.availability ?? []);
      const overlap = needed.filter((s) => free.has(s));
      if (opportunity.schedule_mode === 'all') {
        const passed = overlap.length === needed.length;
        return {
          passed,
          message: passed
            ? 'Available for every required time slot'
            : `Must be available for all ${needed.length} listed time slots (you match ${overlap.length})`,
        };
      }
      const passed = overlap.length > 0;
      return { passed, message: passed ? 'Available for at least one shift' : 'No overlap with any listed shift' };
    },
  },
];

export function checkEligibility(volunteer, opportunity, assignments = []) {
  const results = ELIGIBILITY_RULES.map((rule) => ({ id: rule.id, ...rule.check({ volunteer, opportunity, assignments }) }));
  return {
    eligible: results.every((r) => r.passed),
    results,
    failures: results.filter((r) => !r.passed),
  };
}
