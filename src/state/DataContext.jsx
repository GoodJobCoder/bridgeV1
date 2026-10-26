import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { db, backend, ENTITY_NAMES } from '../api/client.js';
import { scoreOpportunity, seatsTaken } from '../matching/index.js';
import {
  STATUS,
  validateExpressInterest,
  validateConfirm,
  validateDecline,
  validateComplete,
  validateCancel,
  validateWithdraw,
  validateListing,
  needsBackgroundVerification,
} from '../workflow/assignments.js';
import { DEMO_ORGANIZATIONS, DEMO_OPPORTUNITIES, DEMO_VOLUNTEERS, DEMO_ASSIGNMENTS } from '../data/demoData.js';

// A listing with this many open reports is hidden automatically until a moderator reviews it.
export const AUTO_HIDE_REPORT_THRESHOLD = 3;

const DataContext = createContext(null);
const SEEDED_FLAG = 'bridge:demo-seeded';
let initStarted = false;

const emptyData = { Organization: [], Opportunity: [], VolunteerProfile: [], Assignment: [], Report: [] };

function guard(result) {
  if (!result.ok) throw new Error(result.error);
}

export function DataProvider({ children }) {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, tone = 'success') => setToast({ message, tone, id: Date.now() }), []);

  const refresh = useCallback(async () => {
    try {
      const lists = await Promise.all(ENTITY_NAMES.map((n) => db[n].list('-created_date')));
      setData(Object.fromEntries(ENTITY_NAMES.map((n, i) => [n, lists[i] ?? []])));
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const freshAssignments = (opportunityId) => db.Assignment.filter({ opportunity_id: opportunityId });

  // ---------- demo data ----------

  const seedDemo = useCallback(async () => {
    const orgIds = {};
    for (const { key, ...org } of DEMO_ORGANIZATIONS) {
      orgIds[key] = (await db.Organization.create({ ...org, verified: false, is_demo: true })).id;
    }
    const oppIds = {};
    const opps = {};
    for (const { key, org, ...opp } of DEMO_OPPORTUNITIES) {
      const row = await db.Opportunity.create({ ...opp, organization_id: orgIds[org], is_demo: true });
      oppIds[key] = row.id;
      opps[key] = row;
    }
    const volIds = {};
    const vols = {};
    for (const { key, ...vol } of DEMO_VOLUNTEERS) {
      const row = await db.VolunteerProfile.create({ ...vol, is_demo: true });
      volIds[key] = row.id;
      vols[key] = row;
    }
    for (const a of DEMO_ASSIGNMENTS) {
      const now = new Date().toISOString();
      await db.Assignment.create({
        opportunity_id: oppIds[a.opportunity],
        volunteer_id: volIds[a.volunteer],
        organization_id: opps[a.opportunity].organization_id,
        status: a.status,
        score_snapshot: scoreOpportunity(vols[a.volunteer], opps[a.opportunity]).total,
        simulated: true,
        requested_at: now,
        ...(a.status === STATUS.CONFIRMED ? { confirmed_at: now, org_note: a.org_note } : {}),
      });
    }
    localStorage.setItem(SEEDED_FLAG, '1');
    await refresh();
  }, [refresh]);

  const clearDemo = useCallback(async () => {
    const all = await Promise.all(ENTITY_NAMES.map((n) => db[n].list()));
    const lookup = Object.fromEntries(ENTITY_NAMES.map((n, i) => [n, all[i]]));
    const demoOpp = new Set(lookup.Opportunity.filter((o) => o.is_demo).map((o) => o.id));
    for (const a of lookup.Assignment) if (a.simulated) await db.Assignment.delete(a.id);
    for (const r of lookup.Report) if (demoOpp.has(r.target_id)) await db.Report.delete(r.id);
    for (const n of ['Opportunity', 'VolunteerProfile', 'Organization']) {
      for (const row of lookup[n]) if (row.is_demo) await db[n].delete(row.id);
    }
    await refresh();
  }, [refresh]);

  useEffect(() => {
    if (initStarted) {
      refresh();
      return;
    }
    initStarted = true;
    (async () => {
      await refresh();
      // Offline mode: load the fictional demo once so the full flow can be explored immediately.
      if (backend === 'local' && !localStorage.getItem(SEEDED_FLAG)) {
        const existing = await db.Organization.list();
        if (existing.length === 0) await seedDemo();
        else localStorage.setItem(SEEDED_FLAG, '1');
      }
    })();
  }, [refresh, seedDemo]);

  // ---------- lookups ----------

  const byId = useMemo(() => {
    const maps = {};
    for (const n of ENTITY_NAMES) maps[n] = new Map(data[n].map((r) => [r.id, r]));
    return maps;
  }, [data]);

  // ---------- volunteer actions ----------

  const saveVolunteer = useCallback(
    async (profile) => {
      const clean = {
        display_name: profile.display_name.trim(),
        age_band: profile.age_band,
        background_check: Boolean(profile.background_check),
        skills: profile.skills,
        availability: profile.availability,
        interests: profile.interests,
      };
      if (!clean.display_name) throw new Error('Enter a display name (a first name or nickname — no contact details).');
      if (!clean.age_band) throw new Error('Select an age band.');
      const row = profile.id
        ? await db.VolunteerProfile.update(profile.id, clean)
        : await db.VolunteerProfile.create({ ...clean, is_demo: false });
      await refresh();
      return row;
    },
    [refresh],
  );

  const expressInterest = useCallback(
    async (volunteerId, opportunityId) => {
      const volunteer = await db.VolunteerProfile.get(volunteerId);
      const opportunity = await db.Opportunity.get(opportunityId);
      const current = await freshAssignments(opportunityId);
      guard(validateExpressInterest(volunteer, opportunity, current));
      await db.Assignment.create({
        opportunity_id: opportunityId,
        volunteer_id: volunteerId,
        organization_id: opportunity.organization_id,
        status: STATUS.INTERESTED,
        score_snapshot: scoreOpportunity(volunteer, opportunity).total,
        simulated: Boolean(volunteer.is_demo || opportunity.is_demo),
        requested_at: new Date().toISOString(),
      });
      await refresh();
    },
    [refresh],
  );

  const withdraw = useCallback(
    async (assignmentId, volunteerId) => {
      const assignment = await db.Assignment.get(assignmentId);
      guard(validateWithdraw({ assignment, volunteerId }));
      await db.Assignment.update(assignmentId, { status: STATUS.WITHDRAWN });
      await refresh();
    },
    [refresh],
  );

  // ---------- organization actions ----------

  const createOrganization = useCallback(
    async (org) => {
      if (!org.name?.trim()) throw new Error('Organization name is required.');
      const row = await db.Organization.create({
        name: org.name.trim(),
        description: org.description?.trim() ?? '',
        neighborhood: org.neighborhood?.trim() ?? '',
        focus: org.focus ?? '',
        verified: false,
        is_demo: false,
      });
      await refresh();
      return row;
    },
    [refresh],
  );

  const saveListing = useCallback(
    async (listing) => {
      const current = listing.id ? await freshAssignments(listing.id) : [];
      const errors = validateListing(listing, current);
      if (errors.length) throw new Error(errors.join(' '));
      const { id, created_date, updated_date, ...fields } = listing;
      const clean = { ...fields, capacity: Number(fields.capacity), min_age: Number(fields.min_age), hours_per_session: Number(fields.hours_per_session) || 0 };
      const row = id ? await db.Opportunity.update(id, clean) : await db.Opportunity.create({ ...clean, status: 'open', is_demo: false });
      await refresh();
      return row;
    },
    [refresh],
  );

  const setListingStatus = useCallback(
    async (id, status) => {
      await db.Opportunity.update(id, { status });
      await refresh();
    },
    [refresh],
  );

  const confirm = useCallback(
    async (assignmentId, actingOrganizationId, { note = '', backgroundCheckVerified = false } = {}) => {
      const assignment = await db.Assignment.get(assignmentId);
      const opportunity = await db.Opportunity.get(assignment.opportunity_id);
      const volunteer = await db.VolunteerProfile.get(assignment.volunteer_id);
      const current = await freshAssignments(opportunity.id);
      guard(validateConfirm({ assignment, opportunity, volunteer, assignments: current, actingOrganizationId, backgroundCheckVerified }));
      await db.Assignment.update(assignmentId, {
        status: STATUS.CONFIRMED,
        confirmed_at: new Date().toISOString(),
        org_note: note.trim(),
        background_check_verified_by_org: needsBackgroundVerification(opportunity, volunteer),
      });
      // The database has no transactions, so re-check after writing: if two approvals
      // raced for the last spot, roll this one back instead of overfilling.
      const after = await freshAssignments(opportunity.id);
      if (seatsTaken(opportunity.id, after) > opportunity.capacity) {
        await db.Assignment.update(assignmentId, { status: STATUS.INTERESTED, confirmed_at: null });
        await refresh();
        throw new Error('Another approval just filled the last spot. This request was left pending.');
      }
      await refresh();
    },
    [refresh],
  );

  const decline = useCallback(
    async (assignmentId, actingOrganizationId, note = '') => {
      const assignment = await db.Assignment.get(assignmentId);
      const opportunity = await db.Opportunity.get(assignment.opportunity_id);
      guard(validateDecline({ assignment, opportunity, actingOrganizationId }));
      await db.Assignment.update(assignmentId, { status: STATUS.DECLINED, org_note: note.trim() });
      await refresh();
    },
    [refresh],
  );

  const complete = useCallback(
    async (assignmentId, actingOrganizationId, hours) => {
      const assignment = await db.Assignment.get(assignmentId);
      const opportunity = await db.Opportunity.get(assignment.opportunity_id);
      guard(validateComplete({ assignment, opportunity, actingOrganizationId, hours }));
      await db.Assignment.update(assignmentId, {
        status: STATUS.COMPLETED,
        hours_verified: Number(hours),
        verified_by_org: true,
        verified_by_org_id: actingOrganizationId,
        completed_at: new Date().toISOString(),
      });
      await refresh();
    },
    [refresh],
  );

  const cancel = useCallback(
    async (assignmentId) => {
      const assignment = await db.Assignment.get(assignmentId);
      guard(validateCancel({ assignment }));
      await db.Assignment.update(assignmentId, { status: STATUS.CANCELLED });
      await refresh();
    },
    [refresh],
  );

  // ---------- reporting & moderation ----------

  const report = useCallback(
    async ({ target_type, target_id, reason, details }) => {
      if (!reason) throw new Error('Choose a reason for the report.');
      await db.Report.create({ target_type, target_id, reason, details: details?.trim() ?? '', status: 'open' });
      if (target_type === 'opportunity') {
        const open = await db.Report.filter({ target_id, status: 'open' });
        const opp = await db.Opportunity.get(target_id);
        if (open.length >= AUTO_HIDE_REPORT_THRESHOLD && opp.status === 'open') {
          await db.Opportunity.update(target_id, { status: 'hidden' });
        }
      }
      await refresh();
    },
    [refresh],
  );

  // A moderator decision ("hide" or "restore") closes every open report on the same listing,
  // so a restored listing is not immediately re-hidden by reports that were already reviewed.
  const moderateTarget = useCallback(
    async (targetId, action) => {
      const opp = await db.Opportunity.get(targetId);
      if (action === 'hide') await db.Opportunity.update(targetId, { status: 'hidden' });
      if (action === 'restore' && opp.status === 'hidden') await db.Opportunity.update(targetId, { status: 'open' });
      const open = await db.Report.filter({ target_id: targetId, status: 'open' });
      for (const r of open) {
        await db.Report.update(r.id, { status: action === 'hide' ? 'resolved' : 'dismissed', resolution: action === 'hide' ? 'Listing hidden' : 'Listing kept visible' });
      }
      await refresh();
    },
    [refresh],
  );

  const moderate = useCallback(async (reportId, action) => {
    const r = await db.Report.get(reportId);
    await moderateTarget(r.target_id, action);
  }, [moderateTarget]);

  const value = {
    ...data,
    byId,
    loading,
    loadError,
    backend,
    refresh,
    toast,
    notify,
    clearToast: () => setToast(null),
    actions: { seedDemo, clearDemo, saveVolunteer, expressInterest, withdraw, createOrganization, saveListing, setListingStatus, confirm, decline, complete, cancel, report, moderate, moderateTarget },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}

/** Remembers which volunteer profile / organization the user is acting as (no login in this build). */
export function useSessionValue(key) {
  const storageKey = `bridge:session:${key}`;
  const [value, setValue] = useState(() => localStorage.getItem(storageKey) || '');
  const update = useCallback(
    (v) => {
      setValue(v || '');
      if (v) localStorage.setItem(storageKey, v);
      else localStorage.removeItem(storageKey);
    },
    [storageKey],
  );
  return [value, update];
}
