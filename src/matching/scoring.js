// Weighted compatibility scoring. Each component returns:
//   { points, max, summary, details: [string] }
// so the UI can show exactly how every point was earned.
//
// IMPORTANT: a compatibility score describes how well a listing fits the profile a
// volunteer entered. It is NOT a probability that the volunteer will succeed.

import { WEIGHTS, SKILL_WEIGHT, INTEREST_SHARE } from './weights.js';
import { slotLabel } from '../config/taxonomy.js';

const round = (n) => Math.round(n);

export function scoreSkills(volunteer, opportunity) {
  const max = WEIGHTS.skills;
  const have = new Set(volunteer.skills ?? []);
  const required = opportunity.required_skills ?? [];
  const preferred = (opportunity.preferred_skills ?? []).filter((s) => !required.includes(s));

  if (required.length === 0 && preferred.length === 0) {
    return { points: max, max, summary: 'No specific skills requested', details: ['Any volunteer can help with this task.'], matched: [], missing: [] };
  }

  const matchedRequired = required.filter((s) => have.has(s));
  const matchedPreferred = preferred.filter((s) => have.has(s));
  const possible = required.length * SKILL_WEIGHT.required + preferred.length * SKILL_WEIGHT.preferred;
  const earned = matchedRequired.length * SKILL_WEIGHT.required + matchedPreferred.length * SKILL_WEIGHT.preferred;
  const points = round((earned / possible) * max);

  const details = [];
  if (required.length) details.push(`Required skills: ${matchedRequired.length} of ${required.length} matched (×${SKILL_WEIGHT.required} weight each)`);
  if (preferred.length) details.push(`Preferred skills: ${matchedPreferred.length} of ${preferred.length} matched (×${SKILL_WEIGHT.preferred} weight each)`);
  details.push(`${earned} of ${possible} weighted skill points → ${points}/${max}`);

  return {
    points,
    max,
    summary: `${matchedRequired.length + matchedPreferred.length} of ${required.length + preferred.length} skills matched`,
    details,
    matched: [...matchedRequired, ...matchedPreferred],
    missing: [...required, ...preferred].filter((s) => !have.has(s)),
  };
}

export function scoreAvailability(volunteer, opportunity) {
  const max = WEIGHTS.availability;
  const needed = opportunity.schedule_slots ?? [];
  if (needed.length === 0) {
    return { points: max, max, summary: 'Flexible schedule', details: ['The organization will fit shifts around you.'], matched: [] };
  }
  const free = new Set(volunteer.availability ?? []);
  const overlap = needed.filter((s) => free.has(s));
  // "all" listings already passed the eligibility filter, so overlap is complete.
  const points = round((overlap.length / needed.length) * max);
  return {
    points,
    max,
    summary: `${overlap.length} of ${needed.length} time slots overlap`,
    details: [
      opportunity.schedule_mode === 'all' ? 'All listed slots are mandatory.' : 'Any one listed slot is enough; more overlap means more shift options.',
      overlap.length ? `You are free: ${overlap.map(slotLabel).join(', ')}` : 'No overlapping slots.',
      `${overlap.length}/${needed.length} × ${max} → ${points}/${max}`,
    ],
    matched: overlap,
  };
}

export function scoreInterests(volunteer, opportunity) {
  const max = WEIGHTS.interests;
  const interests = new Set(volunteer.interests ?? []);
  if (interests.has(opportunity.category)) {
    const points = round(max * INTEREST_SHARE.primaryCategory);
    return { points, max, summary: `Matches your interest in ${opportunity.category}`, details: [`Primary category "${opportunity.category}" is one of your interests → ${points}/${max}`] };
  }
  const secondary = (opportunity.secondary_categories ?? []).filter((c) => interests.has(c));
  if (secondary.length) {
    const points = round(max * INTEREST_SHARE.secondaryCategory);
    return { points, max, summary: `Related to your interest in ${secondary.join(', ')}`, details: [`Secondary category match (${secondary.join(', ')}) earns ${INTEREST_SHARE.secondaryCategory * 100}% → ${points}/${max}`] };
  }
  return { points: 0, max, summary: 'Outside your listed interests', details: [`Category "${opportunity.category}" is not in your interests → 0/${max}`] };
}

export function scoreOpportunity(volunteer, opportunity) {
  const skills = scoreSkills(volunteer, opportunity);
  const availability = scoreAvailability(volunteer, opportunity);
  const interests = scoreInterests(volunteer, opportunity);
  return {
    total: skills.points + availability.points + interests.points,
    breakdown: { skills, availability, interests },
  };
}
