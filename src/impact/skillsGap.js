// Skills gap: which skills the community needs most compared with how many
// volunteers offer them. Organizations can use this to target recruitment.
//
//   demand(skill) = unfilled spots on open listings that list the skill as required
//   supply(skill) = volunteer profiles that list the skill
//   gap           = demand − supply   (positive means volunteers are scarce)

import { seatsRemaining } from '../matching/eligibility.js';

export function computeSkillsGap(opportunities, volunteers, assignments) {
  const rows = new Map();
  const row = (skill) => {
    if (!rows.has(skill)) rows.set(skill, { skill, demand: 0, listings: 0, supply: 0 });
    return rows.get(skill);
  };

  for (const o of opportunities) {
    if (o.status !== 'open') continue;
    const open = seatsRemaining(o, assignments);
    if (open === 0) continue;
    for (const skill of o.required_skills ?? []) {
      const r = row(skill);
      r.demand += open;
      r.listings += 1;
    }
  }
  for (const v of volunteers) {
    for (const skill of v.skills ?? []) {
      if (rows.has(skill)) row(skill).supply += 1;
    }
  }

  return [...rows.values()]
    .map((r) => ({ ...r, gap: r.demand - r.supply }))
    .sort((a, b) => b.gap - a.gap || b.demand - a.demand || a.skill.localeCompare(b.skill));
}
