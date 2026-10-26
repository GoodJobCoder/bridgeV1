import { useRef, useState } from 'react';
import { useData, useSessionValue } from '../state/DataContext.jsx';
import { CATEGORIES, ageBand } from '../config/taxonomy.js';
import { checkEligibility, scoreOpportunity, seatsRemaining, seatsTaken } from '../matching/index.js';
import { STATUS_LABELS, MAX_HOURS_PER_COMPLETION, needsBackgroundVerification } from '../workflow/assignments.js';
import Dialog from '../components/Dialog.jsx';
import ListingForm, { emptyListing } from '../components/ListingForm.jsx';
import { PageHeader, DemoBadge, VerificationBadge, EmptyState, StatCard, Chips, useAction } from '../components/ui.jsx';

function RegisterOrg({ onCreated }) {
  const { actions } = useData();
  const [o, setO] = useState({ name: '', description: '', neighborhood: '', focus: '' });
  const [run, busy] = useAction();
  const input = (k) => (e) => setO({ ...o, [k]: e.target.value });
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const row = await run(() => actions.createOrganization(o), 'Organization registered (unverified).');
        if (row) onCreated(row);
      }}
    >
      <p className="muted">New organizations are labeled <strong>Unverified</strong>. This build does not verify identity, so volunteers see that label on every listing.</p>
      <label className="field"><span>Organization name *</span><input value={o.name} onChange={input('name')} required maxLength={80} /></label>
      <label className="field"><span>Neighborhood / service area</span><input value={o.neighborhood} onChange={input('neighborhood')} maxLength={60} /></label>
      <label className="field">
        <span>Main focus</span>
        <select value={o.focus} onChange={input('focus')}>
          <option value="">Choose…</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label className="field"><span>Short public description</span><textarea rows={3} value={o.description} onChange={input('description')} maxLength={400} /></label>
      <div className="row-end"><button type="submit" className="btn btn-primary" disabled={busy}>Register organization</button></div>
    </form>
  );
}

function ApproveForm({ assignment, opportunity, volunteer, orgId, onDone }) {
  const { actions, Assignment } = useData();
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState(false);
  const [run, busy] = useAction();
  const needsCheck = needsBackgroundVerification(opportunity, volunteer);
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(async () => {
          await actions.confirm(assignment.id, orgId, { note, backgroundCheckVerified: checked });
          return true;
        }, `${volunteer.display_name} confirmed for “${opportunity.title}”.`);
        if (ok) onDone();
      }}
    >
      <p>Confirm <strong>{volunteer.display_name}</strong> for <strong>{opportunity.title}</strong>? This uses 1 of {seatsRemaining(opportunity, Assignment)} remaining spots.</p>
      {needsCheck && (
        <label className="check warn-box">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} required />
          <span>I have personally verified this volunteer’s background check. (Bridge only stores a self-reported flag.)</span>
        </label>
      )}
      <label className="field">
        <span>Message to the volunteer (only they will see it)</span>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} placeholder="Where to check in, what to bring, who to ask for…" />
      </label>
      <div className="row-end">
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy || (needsCheck && !checked)}>Confirm volunteer</button>
      </div>
    </form>
  );
}

function CompleteForm({ assignment, opportunity, volunteer, orgId, onDone }) {
  const { actions } = useData();
  const [hours, setHours] = useState('');
  const [attest, setAttest] = useState(false);
  const [run, busy] = useAction();
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(async () => {
          await actions.complete(assignment.id, orgId, hours);
          return true;
        }, 'Completion verified.');
        if (ok) onDone();
      }}
    >
      <p>Record the <strong>actual</strong> hours {volunteer.display_name} served on “{opportunity.title}”. Bridge never estimates hours.</p>
      <label className="field">
        <span>Hours served *</span>
        <input type="number" min={0.25} max={MAX_HOURS_PER_COMPLETION} step={0.25} value={hours} onChange={(e) => setHours(e.target.value)} required />
      </label>
      <label className="check">
        <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} required />
        <span>I confirm this volunteer completed this service and these hours are accurate.</span>
      </label>
      {assignment.simulated && <p className="hint"><DemoBadge /> This is a simulated assignment; it will be counted separately from real service.</p>}
      <div className="row-end">
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy || !attest || !hours}>Verify completion</button>
      </div>
    </form>
  );
}

const TABS = [
  { id: 'requests', label: 'Requests to review' },
  { id: 'confirmed', label: 'Confirmed volunteers' },
  { id: 'listings', label: 'Listings' },
  { id: 'history', label: 'History' },
];

export default function OrgDashboard() {
  const { Organization, Opportunity, Assignment, byId, actions } = useData();
  const [orgId, setOrgId] = useSessionValue('organization');
  const [tab, setTab] = useState('requests');
  const [dialog, setDialog] = useState(null);
  const [run, busy] = useAction();
  const tabRefs = useRef({});

  const org = byId.Organization.get(orgId);
  const listings = Opportunity.filter((o) => o.organization_id === orgId);
  const listingIds = new Set(listings.map((o) => o.id));
  const mine = Assignment.filter((a) => listingIds.has(a.opportunity_id));
  const pending = mine.filter((a) => a.status === 'interested');
  const confirmed = mine.filter((a) => a.status === 'confirmed');
  const history = mine.filter((a) => !['interested', 'confirmed'].includes(a.status));
  const counts = { requests: pending.length, confirmed: confirmed.length, listings: listings.length, history: history.length };

  const close = () => setDialog(null);
  const ctx = (a) => ({ assignment: a, opportunity: byId.Opportunity.get(a.opportunity_id), volunteer: byId.VolunteerProfile.get(a.volunteer_id) });

  // Arrow-key navigation between tabs (WAI-ARIA tabs pattern).
  const onTabKey = (e) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const next = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  };

  const VolunteerLine = ({ volunteer }) =>
    volunteer ? (
      <>
        <strong>{volunteer.display_name}</strong> <DemoBadge show={volunteer.is_demo} /> <span className="muted small">Age {ageBand(volunteer.age_band)?.label}</span>
      </>
    ) : (
      <em>Removed profile</em>
    );

  return (
    <>
      <PageHeader title="Organization Dashboard" lead="Post requests, review volunteer interest, approve matches, and verify completed service. No volunteer is confirmed without your approval." />
      <div className="container stack">
        <div className="card org-bar">
          <label className="field grow">
            <span>Acting as organization</span>
            <select value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              <option value="">— Choose an organization —</option>
              {[...Organization].sort((a, b) => a.name.localeCompare(b.name)).map((o) => <option key={o.id} value={o.id}>{o.name}{o.is_demo ? ' [demo]' : ''}</option>)}
            </select>
          </label>
          <button type="button" className="btn btn-secondary" onClick={() => setDialog({ type: 'register' })}>Register an organization</button>
        </div>

        {!org && <EmptyState title="Choose an organization to manage its requests.">
          <p>Demo organizations are fictional and let you try the complete approval flow.</p>
        </EmptyState>}

        {org && (
          <>
            <section className="card org-profile" aria-labelledby="org-name">
              <div>
                <h2 id="org-name">{org.name} <DemoBadge show={org.is_demo} /> <VerificationBadge organization={org} /></h2>
                <p className="muted">{[org.focus, org.neighborhood].filter(Boolean).join(' · ')}</p>
                <p>{org.description}</p>
                {!org.verified && <p className="hint">Verification is not implemented in this build, so this organization is publicly labeled unverified.</p>}
              </div>
              <div className="stat-row">
                <StatCard label="Awaiting review" value={pending.length} tone="tone-amber" />
                <StatCard label="Confirmed" value={confirmed.length} tone="tone-teal" />
                <StatCard label="Open listings" value={listings.filter((l) => l.status === 'open').length} />
              </div>
            </section>

            <div role="tablist" aria-label="Organization sections" className="tabs" onKeyDown={onTabKey}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  ref={(el) => (tabRefs.current[t.id] = el)}
                  role="tab"
                  type="button"
                  id={`tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  tabIndex={tab === t.id ? 0 : -1}
                  onClick={() => setTab(t.id)}
                >
                  {t.label} <span className="count">{counts[t.id]}</span>
                </button>
              ))}
            </div>

            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="tabpanel" tabIndex={0}>
              {tab === 'requests' && (pending.length === 0 ? <EmptyState title="No requests awaiting review." /> : (
                <ul className="review-list">
                  {pending.map((a) => {
                    const { opportunity, volunteer } = ctx(a);
                    if (!opportunity || !volunteer) return null;
                    const elig = checkEligibility(volunteer, opportunity, Assignment);
                    const live = scoreOpportunity(volunteer, opportunity);
                    return (
                      <li key={a.id} className="card review-item">
                        <div className="review-main">
                          <p><VolunteerLine volunteer={volunteer} /> wants to help with <strong>{opportunity.title}</strong></p>
                          <p className="small">Compatibility: <strong>{live.total}/100</strong> ({live.breakdown.skills.summary}; {live.breakdown.availability.summary}; {live.breakdown.interests.summary})</p>
                          <Chips items={volunteer.skills} label="Volunteer skills" />
                          <p className="small">Spots: {seatsTaken(opportunity.id, Assignment)} of {opportunity.capacity} filled · Background check (self-reported): {volunteer.background_check ? 'yes' : 'no'}</p>
                          {!elig.eligible && <p className="alert alert-error small">Cannot approve: {elig.failures.map((f) => f.message).join('; ')}</p>}
                          {a.simulated && <p className="hint"><span className="badge badge-demo">Simulated</span> Demo request — counted separately from real activity.</p>}
                        </div>
                        <div className="review-actions">
                          <button type="button" className="btn btn-primary" disabled={!elig.eligible} onClick={() => setDialog({ type: 'approve', a })}>Approve…</button>
                          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => run(() => actions.decline(a.id, orgId), 'Request declined.')}>Decline</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ))}

              {tab === 'confirmed' && (confirmed.length === 0 ? <EmptyState title="No confirmed volunteers yet." /> : (
                <ul className="review-list">
                  {confirmed.map((a) => {
                    const { opportunity, volunteer } = ctx(a);
                    if (!opportunity) return null;
                    return (
                      <li key={a.id} className="card review-item">
                        <div className="review-main">
                          <p><VolunteerLine volunteer={volunteer} /> — <strong>{opportunity.title}</strong></p>
                          <p className="small muted">Confirmed {a.confirmed_at ? new Date(a.confirmed_at).toLocaleDateString() : ''}{a.simulated ? ' · Simulated' : ''}</p>
                        </div>
                        <div className="review-actions">
                          <button type="button" className="btn btn-primary" onClick={() => setDialog({ type: 'complete', a })}>Verify completion…</button>
                          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => window.confirm('Cancel this assignment? The spot will reopen.') && run(() => actions.cancel(a.id), 'Assignment cancelled; spot reopened.')}>Cancel</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ))}

              {tab === 'listings' && (
                <div className="stack">
                  <div><button type="button" className="btn btn-primary" onClick={() => setDialog({ type: 'listing', listing: emptyListing(orgId) })}>+ New listing</button></div>
                  {listings.length === 0 ? <EmptyState title="No listings yet." /> : (
                    <div className="table-wrap">
                      <table>
                        <caption className="sr-only">Your listings</caption>
                        <thead><tr><th scope="col">Listing</th><th scope="col">Status</th><th scope="col">Filled</th><th scope="col">Pending</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                        <tbody>
                          {listings.map((l) => (
                            <tr key={l.id}>
                              <th scope="row">{l.title} <DemoBadge show={l.is_demo} /></th>
                              <td><span className={`status-pill listing-${l.status}`}>{l.status === 'hidden' ? 'Hidden (moderation)' : l.status}</span></td>
                              <td>{seatsTaken(l.id, Assignment)} / {l.capacity}</td>
                              <td>{Assignment.filter((a) => a.opportunity_id === l.id && a.status === 'interested').length}</td>
                              <td className="actions-cell">
                                <button type="button" className="btn btn-link btn-small" onClick={() => setDialog({ type: 'listing', listing: { ...emptyListing(orgId), ...l } })}>Edit<span className="sr-only"> {l.title}</span></button>
                                {l.status === 'open' && <button type="button" className="btn btn-link btn-small" disabled={busy} onClick={() => run(() => actions.setListingStatus(l.id, 'closed'), 'Listing closed.')}>Close</button>}
                                {l.status === 'closed' && <button type="button" className="btn btn-link btn-small" disabled={busy} onClick={() => run(() => actions.setListingStatus(l.id, 'open'), 'Listing reopened.')}>Reopen</button>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {tab === 'history' && (history.length === 0 ? <EmptyState title="No completed, declined, or cancelled assignments yet." /> : (
                <ul className="review-list">
                  {history.map((a) => {
                    const { opportunity, volunteer } = ctx(a);
                    return (
                      <li key={a.id} className="card review-item">
                        <div className="review-main">
                          <p><VolunteerLine volunteer={volunteer} /> — {opportunity?.title}</p>
                          <p className="small">
                            <span className={`status-pill status-${a.status}`}>{STATUS_LABELS[a.status]}</span>
                            {a.status === 'completed' && ` · ${a.hours_verified} verified hours`}
                            {a.simulated && ' · Simulated'}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={dialog?.type === 'register'} onClose={close} title="Register an organization">
        <RegisterOrg onCreated={(row) => { setOrgId(row.id); close(); }} />
      </Dialog>
      <Dialog open={dialog?.type === 'listing'} onClose={close} title={dialog?.listing?.id ? 'Edit listing' : 'New listing'}>
        {dialog?.type === 'listing' && <ListingForm initial={dialog.listing} onDone={close} />}
      </Dialog>
      <Dialog open={dialog?.type === 'approve'} onClose={close} title="Approve volunteer">
        {dialog?.type === 'approve' && <ApproveForm {...ctx(dialog.a)} orgId={orgId} onDone={close} />}
      </Dialog>
      <Dialog open={dialog?.type === 'complete'} onClose={close} title="Verify completed service">
        {dialog?.type === 'complete' && <CompleteForm {...ctx(dialog.a)} orgId={orgId} onDone={close} />}
      </Dialog>
    </>
  );
}
