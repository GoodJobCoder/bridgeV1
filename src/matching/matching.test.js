import { describe, it, expect } from 'vitest';
import { checkEligibility, scoreSkills, scoreAvailability, scoreInterests, rankOpportunities, MAX_SCORE } from './index.js';

const adult = {
  id: 'v1',
  age_band: '21_plus',
  background_check: false,
  skills: ['Tutoring', 'Graphic design'],
  availability: ['wkday_evening', 'wkend_morning'],
  interests: ['Education'],
};

const baseOpp = {
  id: 'o1',
  organization_id: 'org1',
  title: 'Homework help',
  status: 'open',
  capacity: 2,
  category: 'Education',
  required_skills: ['Tutoring'],
  preferred_skills: ['Public speaking'],
  schedule_slots: ['wkday_evening'],
  schedule_mode: 'any',
  min_age: 16,
  supervised: true,
  serves_minors: false,
  requires_background_check: false,
  urgency: 'medium',
};

describe('weights', () => {
  it('add up to 100', () => expect(MAX_SCORE).toBe(100));
});

describe('scoreSkills', () => {
  it('weights required skills twice as much as preferred', () => {
    // matched 1 required (2 pts) of 3 possible weighted pts → 2/3 × 45 = 30
    expect(scoreSkills(adult, baseOpp).points).toBe(30);
  });
  it('gives full points when no skills are requested', () => {
    expect(scoreSkills(adult, { ...baseOpp, required_skills: [], preferred_skills: [] }).points).toBe(45);
  });
  it('gives zero when nothing matches', () => {
    expect(scoreSkills({ ...adult, skills: [] }, baseOpp).points).toBe(0);
  });
});

describe('scoreAvailability', () => {
  it('scales by overlapping slots', () => {
    const opp = { ...baseOpp, schedule_slots: ['wkday_evening', 'wkend_afternoon'] };
    expect(scoreAvailability(adult, opp).points).toBe(18); // 1/2 × 35 = 17.5 → 18
  });
});

describe('scoreInterests', () => {
  it('awards full points for primary category, half for secondary', () => {
    expect(scoreInterests(adult, baseOpp).points).toBe(20);
    expect(scoreInterests(adult, { ...baseOpp, category: 'Health', secondary_categories: ['Education'] }).points).toBe(10);
    expect(scoreInterests(adult, { ...baseOpp, category: 'Health' }).points).toBe(0);
  });
});

describe('eligibility filters', () => {
  it('excludes when mandatory schedule slots are not all covered', () => {
    const opp = { ...baseOpp, schedule_mode: 'all', schedule_slots: ['wkday_evening', 'wkday_morning'] };
    const r = checkEligibility(adult, opp);
    expect(r.eligible).toBe(false);
    expect(r.failures[0].id).toBe('schedule');
  });
  it('excludes minors from unsupervised listings', () => {
    const minor = { ...adult, age_band: '16_17' };
    expect(checkEligibility(minor, { ...baseOpp, supervised: false }).eligible).toBe(false);
    expect(checkEligibility(minor, baseOpp).eligible).toBe(true);
  });
  it('excludes volunteers below minimum age', () => {
    expect(checkEligibility({ ...adult, age_band: '14_15' }, baseOpp).eligible).toBe(false);
    expect(checkEligibility({ ...adult, age_band: '18_20' }, { ...baseOpp, min_age: 21 }).eligible).toBe(false);
    expect(checkEligibility(adult, { ...baseOpp, min_age: 21 }).eligible).toBe(true);
  });
  it('blocks adults from minor-serving listings without a background check', () => {
    const opp = { ...baseOpp, serves_minors: true, requires_background_check: true };
    expect(checkEligibility(adult, opp).eligible).toBe(false);
    expect(checkEligibility({ ...adult, background_check: true }, opp).eligible).toBe(true);
    expect(checkEligibility({ ...adult, background_check: true }, { ...opp, supervised: false }).eligible).toBe(false);
  });
  it('excludes full listings', () => {
    const assignments = [
      { opportunity_id: 'o1', volunteer_id: 'a', status: 'confirmed' },
      { opportunity_id: 'o1', volunteer_id: 'b', status: 'completed' },
    ];
    expect(checkEligibility(adult, baseOpp, assignments).eligible).toBe(false);
    // pending requests do not take a seat
    expect(checkEligibility(adult, baseOpp, [{ opportunity_id: 'o1', volunteer_id: 'a', status: 'interested' }]).eligible).toBe(true);
  });
});

describe('rankOpportunities', () => {
  it('sorts by score and separates excluded listings with reasons', () => {
    const low = { ...baseOpp, id: 'o2', title: 'Park cleanup', category: 'Environment', required_skills: ['Gardening'] };
    const closed = { ...baseOpp, id: 'o3', title: 'Closed', status: 'closed' };
    const { ranked, excluded } = rankOpportunities(adult, [low, baseOpp, closed]);
    expect(ranked.map((r) => r.opportunity.id)).toEqual(['o1', 'o2']);
    expect(ranked[0].score).toBe(30 + 35 + 20);
    expect(excluded).toHaveLength(1);
    expect(excluded[0].reasons[0]).toMatch(/closed/);
  });
});
