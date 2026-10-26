// Impact metrics are computed ONLY from assignment records. Hours come solely from
// completions an organization verified; nothing is estimated or projected.
//
// Every number is split into "real" and "simulated" (demo) so demo activity can
// never be mistaken for actual community service.

import { seatsTaken } from '../matching/eligibility.js';

const isSimulated = (a) => Boolean(a.simulated);

function bucket(assignments) {
  const pending = assignments.filter((a) => a.status === 'interested');
  const confirmed = assignments.filter((a) => a.status === 'confirmed');
  const completed = assignments.filter((a) => a.status === 'completed' && a.verified_by_org);
  return {
    pendingRequests: pending.length,
    pendingCommitments: confirmed.length,
    verifiedCompletions: completed.length,
    verifiedHours: completed.reduce((sum, a) => sum + (Number(a.hours_verified) || 0), 0),
  };
}

export function computeImpact(opportunities, assignments) {
  const real = assignments.filter((a) => !isSimulated(a));
  const simulated = assignments.filter(isSimulated);

  const listed = opportunities.filter((o) => o.status === 'open');
  const coverage = listed.map((o) => {
    const filled = seatsTaken(o.id, assignments);
    return { opportunity: o, filled, capacity: o.capacity, ratio: o.capacity ? Math.min(1, filled / o.capacity) : 0 };
  });
  const totalSeats = coverage.reduce((s, c) => s + c.capacity, 0);
  const filledSeats = coverage.reduce((s, c) => s + Math.min(c.filled, c.capacity), 0);

  const byCategory = {};
  for (const c of coverage) {
    const k = c.opportunity.category;
    byCategory[k] ??= { category: k, seats: 0, filled: 0, needs: 0 };
    byCategory[k].seats += c.capacity;
    byCategory[k].filled += Math.min(c.filled, c.capacity);
    byCategory[k].needs += 1;
  }

  return {
    real: bucket(real),
    simulated: bucket(simulated),
    coverage: {
      needs: listed.length,
      fullyCovered: coverage.filter((c) => c.ratio >= 1).length,
      uncovered: coverage.filter((c) => c.filled === 0).length,
      totalSeats,
      filledSeats,
      ratio: totalSeats ? filledSeats / totalSeats : 0,
      perNeed: coverage.sort((a, b) => a.ratio - b.ratio),
      byCategory: Object.values(byCategory).sort((a, b) => a.category.localeCompare(b.category)),
    },
  };
}
