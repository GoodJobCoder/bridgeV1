// Ranking = (1) filter by eligibility, (2) score, (3) sort.
// Ties are broken by urgency, then remaining spots, then title, so results are deterministic.

import { checkEligibility, seatsRemaining } from './eligibility.js';
import { scoreOpportunity } from './scoring.js';
import { urgencyRank } from '../config/taxonomy.js';

export function rankOpportunities(volunteer, opportunities, assignments = []) {
  const ranked = [];
  const excluded = [];

  for (const opportunity of opportunities) {
    const eligibility = checkEligibility(volunteer, opportunity, assignments);
    if (!eligibility.eligible) {
      excluded.push({ opportunity, reasons: eligibility.failures.map((f) => f.message) });
      continue;
    }
    const { total, breakdown } = scoreOpportunity(volunteer, opportunity);
    ranked.push({ opportunity, score: total, breakdown, eligibility, spotsLeft: seatsRemaining(opportunity, assignments) });
  }

  ranked.sort(
    (a, b) =>
      b.score - a.score ||
      urgencyRank(b.opportunity.urgency) - urgencyRank(a.opportunity.urgency) ||
      b.spotsLeft - a.spotsLeft ||
      a.opportunity.title.localeCompare(b.opportunity.title),
  );

  return { ranked, excluded };
}

/** Plain-language band for a score. Describes fit only, never likelihood of success. */
export function fitLabel(score) {
  if (score >= 80) return 'Strong fit';
  if (score >= 60) return 'Good fit';
  if (score >= 40) return 'Partial fit';
  return 'Weak fit';
}
