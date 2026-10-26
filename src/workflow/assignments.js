// Assignment lifecycle rules. Pure functions: they take records and return
// { ok: true } or { ok: false, error }. The UI and data layer call these before
// writing anything, so the same rules apply no matter which screen triggers a change.
//
//   interested ──(org approves)──> confirmed ──(org verifies)──> completed
//        │                             │
//        ├──(org declines)──> declined └──(org or volunteer cancels)──> cancelled
//        └──(volunteer withdraws)──> withdrawn

import { checkEligibility, seatsRemaining } from '../matching/eligibility.js';
import { ageBand } from '../config/taxonomy.js';

export const STATUS = {
  INTERESTED: 'interested',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  DECLINED: 'declined',
  WITHDRAWN: 'withdrawn',
  CANCELLED: 'cancelled',
};

export const STATUS_LABELS = {
  interested: 'Awaiting organization review',
  confirmed: 'Confirmed — pending completion',
  completed: 'Verified complete',
  declined: 'Declined by organization',
  withdrawn: 'Withdrawn by volunteer',
  cancelled: 'Cancelled',
};

// Statuses that block a second request for the same volunteer + opportunity.
const ACTIVE = new Set([STATUS.INTERESTED, STATUS.CONFIRMED, STATUS.COMPLETED]);

export const MAX_HOURS_PER_COMPLETION = 24;

const fail = (error) => ({ ok: false, error });
const ok = { ok: true };

export function findActiveAssignment(volunteerId, opportunityId, assignments) {
  return assignments.find((a) => a.volunteer_id === volunteerId && a.opportunity_id === opportunityId && ACTIVE.has(a.status));
}

export function validateExpressInterest(volunteer, opportunity, assignments) {
  if (!volunteer?.id) return fail('Choose or save a volunteer profile first.');
  if (findActiveAssignment(volunteer.id, opportunity.id, assignments)) {
    return fail('You have already expressed interest in this opportunity.');
  }
  const { eligible, failures } = checkEligibility(volunteer, opportunity, assignments);
  if (!eligible) return fail(`Not eligible: ${failures.map((f) => f.message).join('; ')}.`);
  return ok;
}

/**
 * Background checks are self-reported on profiles, so the organization must verify one
 * before approval whenever the listing requires it or an adult will work with minors.
 */
export const needsBackgroundVerification = (opportunity, volunteer) =>
  Boolean(opportunity.requires_background_check || (opportunity.serves_minors && !ageBand(volunteer?.age_band)?.isMinor));

export function validateConfirm({ assignment, opportunity, volunteer, assignments, actingOrganizationId, backgroundCheckVerified = false }) {
  if (actingOrganizationId !== opportunity.organization_id) {
    return fail('Only the organization that posted this request can confirm volunteers.');
  }
  if (assignment.status !== STATUS.INTERESTED) return fail(`Cannot confirm a request that is "${assignment.status}".`);
  if (needsBackgroundVerification(opportunity, volunteer) && !backgroundCheckVerified) {
    return fail('Confirm that you have verified this volunteer’s background check before approving.');
  }
  if (seatsRemaining(opportunity, assignments) <= 0) return fail('This opportunity is already full.');
  // Re-check safety rules at approval time: the listing or profile may have changed.
  const { eligible, failures } = checkEligibility(volunteer, opportunity, assignments);
  if (!eligible) return fail(`Volunteer is no longer eligible: ${failures.map((f) => f.message).join('; ')}.`);
  return ok;
}

export function validateDecline({ assignment, opportunity, actingOrganizationId }) {
  if (actingOrganizationId !== opportunity.organization_id) return fail('Only the posting organization can decline requests.');
  if (assignment.status !== STATUS.INTERESTED) return fail('Only pending requests can be declined.');
  return ok;
}

export function validateComplete({ assignment, opportunity, actingOrganizationId, hours }) {
  if (actingOrganizationId !== opportunity.organization_id) {
    return fail('Only the posting organization can verify completed service.');
  }
  if (assignment.status !== STATUS.CONFIRMED) return fail('Only confirmed assignments can be marked complete.');
  const h = Number(hours);
  if (!Number.isFinite(h) || h <= 0) return fail('Enter the actual hours served (greater than 0).');
  if (h > MAX_HOURS_PER_COMPLETION) return fail(`A single verification cannot exceed ${MAX_HOURS_PER_COMPLETION} hours.`);
  return ok;
}

export function validateCancel({ assignment }) {
  if (assignment.status !== STATUS.CONFIRMED) return fail('Only confirmed assignments can be cancelled.');
  return ok;
}

export function validateWithdraw({ assignment, volunteerId }) {
  if (assignment.volunteer_id !== volunteerId) return fail('Only the volunteer can withdraw their own request.');
  if (assignment.status !== STATUS.INTERESTED) return fail('Only pending requests can be withdrawn.');
  return ok;
}

/** Validates an opportunity before it is created or edited. */
export function validateListing(listing, assignments = []) {
  const errors = [];
  if (!listing.title?.trim()) errors.push('Title is required.');
  if (!listing.description?.trim()) errors.push('Description is required.');
  if (!listing.category) errors.push('Category is required.');
  if (!listing.organization_id) errors.push('Organization is required.');
  const cap = Number(listing.capacity);
  if (!Number.isInteger(cap) || cap < 1 || cap > 200) errors.push('Capacity must be a whole number from 1 to 200.');
  if (listing.serves_minors && !listing.supervised) {
    errors.push('Listings that involve working with minors must provide on-site adult supervision.');
  }
  if (listing.schedule_mode === 'all' && !(listing.schedule_slots ?? []).length) {
    errors.push('Select at least one time slot when all slots are mandatory.');
  }
  if (listing.id) {
    const taken = assignments.filter((a) => a.opportunity_id === listing.id && (a.status === 'confirmed' || a.status === 'completed')).length;
    if (cap < taken) errors.push(`Capacity cannot be lower than the ${taken} volunteer(s) already confirmed.`);
  }
  return errors;
}
