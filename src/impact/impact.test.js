import { describe, it, expect } from 'vitest';
import { computeSkillsGap } from './skillsGap.js';
import { toCsv, serviceRecordRows } from './exportCsv.js';

describe('computeSkillsGap', () => {
  const opps = [
    { id: 'a', status: 'open', capacity: 3, required_skills: ['Driving'] },
    { id: 'b', status: 'open', capacity: 2, required_skills: ['Driving', 'Tutoring'] },
    { id: 'c', status: 'closed', capacity: 9, required_skills: ['Tutoring'] },
  ];
  const vols = [{ skills: ['Driving'] }, { skills: ['Tutoring', 'Cooking'] }];

  it('counts unfilled spots on open listings as demand and profiles as supply', () => {
    const assignments = [{ opportunity_id: 'a', status: 'confirmed' }];
    const gap = computeSkillsGap(opps, vols, assignments);
    expect(gap[0]).toEqual({ skill: 'Driving', demand: 4, listings: 2, supply: 1, gap: 3 });
    expect(gap[1]).toEqual({ skill: 'Tutoring', demand: 2, listings: 1, supply: 1, gap: 1 });
    expect(gap.find((g) => g.skill === 'Cooking')).toBeUndefined();
  });
});

describe('CSV export', () => {
  it('escapes commas and quotes', () => {
    expect(toCsv(['a', 'b'], [['x, y', 'say "hi"']])).toBe('a,b\n"x, y","say ""hi"""');
  });
  it('exports only organization-verified completions', () => {
    const lookup = {
      Opportunity: new Map([['o', { title: 'Tutoring', organization_id: 'g' }]]),
      Organization: new Map([['g', { name: 'Center', verified: false }]]),
      VolunteerProfile: new Map([['v', { display_name: 'Sam' }]]),
    };
    const rows = serviceRecordRows(
      [
        { volunteer_id: 'v', opportunity_id: 'o', status: 'completed', verified_by_org: true, hours_verified: 2, completed_at: '2026-10-01T00:00:00Z' },
        { volunteer_id: 'v', opportunity_id: 'o', status: 'confirmed' },
      ],
      lookup,
    );
    expect(rows).toEqual([['Sam', 'Tutoring', 'Center', 'unverified', 2, '2026-10-01', 'real']]);
  });
});
