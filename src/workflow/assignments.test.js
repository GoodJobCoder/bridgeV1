import { describe, it, expect } from 'vitest';
import { validateExpressInterest, validateConfirm, validateComplete, validateListing } from './assignments.js';
import { computeImpact } from '../impact/metrics.js';

const volunteer = { id: 'v1', age_band: '21_plus', skills: [], availability: [], interests: [] };
const opp = { id: 'o1', organization_id: 'org1', title: 'T', status: 'open', capacity: 1, category: 'Health', schedule_slots: [], min_age: 18 };

describe('express interest', () => {
  it('prevents duplicate requests', () => {
    const existing = [{ volunteer_id: 'v1', opportunity_id: 'o1', status: 'interested' }];
    expect(validateExpressInterest(volunteer, opp, existing).ok).toBe(false);
    // a declined request does not block a new one
    expect(validateExpressInterest(volunteer, opp, [{ ...existing[0], status: 'declined' }]).ok).toBe(true);
  });
});

describe('confirm', () => {
  const assignment = { id: 'a1', volunteer_id: 'v1', opportunity_id: 'o1', status: 'interested' };
  it('requires the posting organization', () => {
    expect(validateConfirm({ assignment, opportunity: opp, volunteer, assignments: [assignment], actingOrganizationId: 'other' }).ok).toBe(false);
    expect(validateConfirm({ assignment, opportunity: opp, volunteer, assignments: [assignment], actingOrganizationId: 'org1' }).ok).toBe(true);
  });
  it('requires the org to verify an adult background check on minor-serving listings', () => {
    const minorsOpp = { ...opp, min_age: 14, supervised: true, serves_minors: true };
    const checked = { ...volunteer, background_check: true };
    const base = { assignment, opportunity: minorsOpp, volunteer: checked, assignments: [assignment], actingOrganizationId: 'org1' };
    expect(validateConfirm(base).ok).toBe(false);
    expect(validateConfirm({ ...base, backgroundCheckVerified: true }).ok).toBe(true);
    // a teen joining a supervised peer program needs no adult background check
    expect(validateConfirm({ ...base, volunteer: { ...volunteer, age_band: '16_17' } }).ok).toBe(true);
  });
  it('prevents overfilling', () => {
    const taken = { id: 'a0', volunteer_id: 'v0', opportunity_id: 'o1', status: 'confirmed' };
    const r = validateConfirm({ assignment, opportunity: opp, volunteer, assignments: [taken, assignment], actingOrganizationId: 'org1' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/full/);
  });
});

describe('complete', () => {
  const assignment = { id: 'a1', volunteer_id: 'v1', opportunity_id: 'o1', status: 'confirmed' };
  it('requires real hours within limits and a confirmed assignment', () => {
    expect(validateComplete({ assignment, opportunity: opp, actingOrganizationId: 'org1', hours: 0 }).ok).toBe(false);
    expect(validateComplete({ assignment, opportunity: opp, actingOrganizationId: 'org1', hours: 30 }).ok).toBe(false);
    expect(validateComplete({ assignment, opportunity: opp, actingOrganizationId: 'org1', hours: 3 }).ok).toBe(true);
    expect(validateComplete({ assignment: { ...assignment, status: 'interested' }, opportunity: opp, actingOrganizationId: 'org1', hours: 3 }).ok).toBe(false);
  });
});

describe('listing validation', () => {
  it('requires supervision when serving minors', () => {
    const errors = validateListing({ ...opp, description: 'd', serves_minors: true, supervised: false });
    expect(errors.some((e) => /supervision/.test(e))).toBe(true);
    expect(validateListing({ ...opp, description: 'd', serves_minors: true, supervised: true })).toEqual([]);
  });
  it('blocks shrinking capacity below confirmed volunteers', () => {
    const assignments = [{ opportunity_id: 'o1', status: 'confirmed' }, { opportunity_id: 'o1', status: 'completed' }];
    expect(validateListing({ ...opp, description: 'd', capacity: 1 }, assignments).length).toBe(1);
  });
});

describe('impact metrics', () => {
  it('separates simulated records and only counts verified hours', () => {
    const assignments = [
      { opportunity_id: 'o1', status: 'completed', verified_by_org: true, hours_verified: 3, simulated: false },
      { opportunity_id: 'o1', status: 'completed', verified_by_org: true, hours_verified: 5, simulated: true },
      { opportunity_id: 'o1', status: 'confirmed', simulated: false },
      { opportunity_id: 'o1', status: 'interested', simulated: true },
    ];
    const m = computeImpact([{ ...opp, capacity: 4 }], assignments);
    expect(m.real).toEqual({ pendingRequests: 0, pendingCommitments: 1, verifiedCompletions: 1, verifiedHours: 3 });
    expect(m.simulated.verifiedHours).toBe(5);
    expect(m.coverage.filledSeats).toBe(3);
  });
});
