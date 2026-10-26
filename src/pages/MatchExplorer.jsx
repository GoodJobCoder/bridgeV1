import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useData, useSessionValue } from '../state/DataContext.jsx';
import { SKILLS, AVAILABILITY_SLOTS, CATEGORIES, AGE_BANDS } from '../config/taxonomy.js';
import { rankOpportunities, WEIGHTS } from '../matching/index.js';
import { STATUS_LABELS } from '../workflow/assignments.js';
import OpportunityCard from '../components/OpportunityCard.jsx';
import ScoreBreakdown, { ScoreSummary } from '../components/ScoreBreakdown.jsx';
import InterestButton from '../components/InterestButton.jsx';
import { PageHeader, CheckboxGroup, EmptyState, DemoBadge, useAction } from '../components/ui.jsx';

const blank = { id: '', display_name: '', age_band: '', background_check: false, skills: [], availability: [], interests: [] };
const FIELDS = ['display_name', 'age_band', 'background_check', 'skills', 'availability', 'interests'];
const sameProfile = (a, b) => b && FIELDS.every((k) => JSON.stringify(a[k] ?? null) === JSON.stringify(b[k] ?? null));

function MyRequests({ volunteer }) {
  const { Assignment, byId, actions } = useData();
  const [run, busy] = useAction();
  const mine = Assignment.filter((a) => a.volunteer_id === volunteer.id);
  if (!mine.length) return null;
  return (
    <section className="card" aria-labelledby="my-requests">
      <h2 id="my-requests" className="h4">My requests</h2>
      <ul className="request-list">
        {mine.map((a) => {
          const o = byId.Opportunity.get(a.opportunity_id);
          return (
            <li key={a.id}>
              <div>
                <strong>{o?.title ?? 'Removed listing'}</strong>
                <span className={`status-pill status-${a.status}`}>{STATUS_LABELS[a.status]}</span>
                {a.simulated && <span className="badge badge-demo">Simulated</span>}
              </div>
              {a.org_note && <p className="note">Message from organization: {a.org_note}</p>}
              {a.status === 'completed' && <p className="small">Verified by organization: {a.hours_verified} h</p>}
              {a.status === 'interested' && (
                <button type="button" className="btn btn-link btn-small" disabled={busy} onClick={() => run(() => actions.withdraw(a.id, volunteer.id), 'Request withdrawn.')}>
                  Withdraw request
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function MatchExplorer() {
  const { Opportunity, Assignment, VolunteerProfile, byId, actions, loading } = useData();
  const [volunteerId, setVolunteerId] = useSessionValue('volunteer');
  const [params] = useSearchParams();
  const highlight = params.get('highlight');
  const [form, setForm] = useState(blank);
  const [showExcluded, setShowExcluded] = useState(false);
  const [run, busy] = useAction();

  const saved = byId.VolunteerProfile.get(volunteerId);
  const profiles = [...VolunteerProfile].sort((a, b) => a.display_name.localeCompare(b.display_name));

  // Load the selected profile into the form whenever the selection changes.
  useEffect(() => {
    setForm(saved ? { ...blank, ...saved } : blank);
  }, [volunteerId, saved?.updated_date]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));
  const dirty = saved ? !sameProfile(form, saved) : true;

  const { ranked, excluded } = useMemo(
    () => rankOpportunities(form, Opportunity.filter((o) => o.status === 'open'), Assignment),
    [form, Opportunity, Assignment],
  );

  const ready = form.age_band && (form.skills.length || form.availability.length || form.interests.length);
  const highlighted = highlight && byId.Opportunity.get(highlight);

  const save = async (e) => {
    e.preventDefault();
    const row = await run(() => actions.saveVolunteer(form), saved ? 'Profile updated.' : 'Profile saved. You can now express interest.');
    if (row) setVolunteerId(row.id);
  };

  return (
    <>
      <PageHeader
        title="Volunteer Match Explorer"
        lead={`Tell us what you can do and when. Opportunities are ranked out of 100: skills (${WEIGHTS.skills}), availability (${WEIGHTS.availability}), and interests (${WEIGHTS.interests}).`}
      />
      <div className="container match-layout">
        <div className="stack">
          <form className="card stack" onSubmit={save} aria-labelledby="profile-heading">
            <h2 id="profile-heading" className="h4">Your volunteer profile</h2>
            {ready && <a href="#results-heading" className="jump-link">Jump to {ranked.length} ranked results ↓</a>}
            <label className="field">
              <span>Start from</span>
              <select value={volunteerId} onChange={(e) => setVolunteerId(e.target.value)}>
                <option value="">New profile</option>
                <optgroup label="Fictional demo profiles">
                  {profiles.filter((v) => v.is_demo).map((v) => <option key={v.id} value={v.id}>{v.display_name}</option>)}
                </optgroup>
                <optgroup label="Saved profiles">
                  {profiles.filter((v) => !v.is_demo).map((v) => <option key={v.id} value={v.id}>{v.display_name}</option>)}
                </optgroup>
              </select>
            </label>
            {saved?.is_demo && <p className="hint"><DemoBadge /> Fictional profile. Requests it makes are recorded as <strong>simulated</strong>.</p>}

            <label className="field">
              <span>Display name <small>(first name or nickname — never contact details)</small></span>
              <input value={form.display_name} onChange={(e) => set('display_name')(e.target.value)} maxLength={40} autoComplete="off" />
            </label>

            <fieldset>
              <legend>Age band</legend>
              <div className="radio-row">
                {AGE_BANDS.map((b) => (
                  <label key={b.id} className="check">
                    <input type="radio" name="age_band" checked={form.age_band === b.id} onChange={() => set('age_band')(b.id)} />
                    <span>{b.label}</span>
                  </label>
                ))}
              </div>
              <p className="hint">Volunteers under 18 are only matched with supervised listings. Bridge stores an age band, not a birth date.</p>
            </fieldset>

            <label className="check">
              <input type="checkbox" checked={form.background_check} onChange={(e) => set('background_check')(e.target.checked)} />
              <span>I have a current background check <small className="muted">(self-reported; organizations verify before approval)</small></span>
            </label>

            <CheckboxGroup legend={`Skills (${form.skills.length})`} options={SKILLS} value={form.skills} onChange={set('skills')} />
            <CheckboxGroup legend="Availability" options={AVAILABILITY_SLOTS} value={form.availability} onChange={set('availability')} />
            <CheckboxGroup legend="Causes you care about" options={CATEGORIES} value={form.interests} onChange={set('interests')} />

            <div className="row-end">
              {saved && dirty && <span className="muted small">Unsaved changes</span>}
              <button type="submit" className="btn btn-primary" disabled={busy || (saved && !dirty)}>
                {saved ? 'Save changes' : 'Save profile'}
              </button>
            </div>
          </form>
          {saved && <MyRequests volunteer={saved} />}
        </div>

        <section aria-labelledby="results-heading" className="stack">
          <div className="notice">
            <strong>About these scores:</strong> a compatibility score shows how well a listing fits the profile you entered. It is
            <strong> not</strong> a probability of success or a guarantee of placement. <Link to="/how-it-works">See exactly how scores are calculated.</Link>
          </div>
          {highlighted && (
            <p className="notice notice-teal">
              Looking for <strong>{highlighted.title}</strong>? It’s outlined below
              {excluded.some((x) => x.opportunity.id === highlight) ? ' in the “not eligible” list.' : ' once your profile is filled in.'}
            </p>
          )}
          <h2 id="results-heading" aria-live="polite">
            {loading ? 'Loading…' : ready ? `${ranked.length} ranked opportunit${ranked.length === 1 ? 'y' : 'ies'}` : 'Your matches'}
          </h2>

          {!ready && (
            <EmptyState title="Choose an age band and at least one skill, time slot, or cause to see ranked matches.">
              <p>Or pick a fictional demo profile above to see the full matching process.</p>
            </EmptyState>
          )}

          {ready && saved && dirty && <p className="alert alert-info">Save your changes to express interest using this profile.</p>}
          {ready && !saved && <p className="alert alert-info">Save your profile to express interest. You can explore matches without saving.</p>}

          {ready && ranked.length === 0 && <EmptyState title="No open opportunities pass the eligibility checks for this profile." />}

          {ready && (
            <ol className="ranked-list">
              {ranked.map((r, i) => (
                <li key={r.opportunity.id} className={highlight === r.opportunity.id ? 'highlight' : ''}>
                  <OpportunityCard
                    opportunity={r.opportunity}
                    organization={byId.Organization.get(r.opportunity.organization_id)}
                    assignments={Assignment}
                    aside={
                      <div className="rank-aside">
                        <span className="rank">#{i + 1}</span>
                        <ScoreSummary score={r.score} />
                      </div>
                    }
                  >
                    <InterestButton
                      volunteer={saved}
                      opportunity={r.opportunity}
                      disabledReason={dirty ? 'Save your profile changes first' : undefined}
                    />
                  </OpportunityCard>
                  <details className="why">
                    <summary>Why this score? ({r.score} compatibility points)</summary>
                    <ScoreBreakdown breakdown={r.breakdown} />
                  </details>
                </li>
              ))}
            </ol>
          )}

          {ready && excluded.length > 0 && (
            <section className="card excluded" aria-labelledby="excluded-heading">
              <h3 id="excluded-heading" className="h4">
                <button type="button" className="disclosure" aria-expanded={showExcluded || Boolean(highlight)} onClick={() => setShowExcluded((s) => !s)}>
                  {excluded.length} listing{excluded.length === 1 ? '' : 's'} filtered out (not eligible)
                </button>
              </h3>
              {(showExcluded || highlight) && (
                <ul>
                  {excluded.map((x) => (
                    <li key={x.opportunity.id} className={highlight === x.opportunity.id ? 'highlight' : ''}>
                      <strong>{x.opportunity.title}</strong> — {x.reasons.join('; ')}
                    </li>
                  ))}
                </ul>
              )}
              <p className="hint">Mandatory requirements (age, supervision, background checks, required time slots, open spots) are filters, never score deductions.</p>
            </section>
          )}
        </section>
      </div>
    </>
  );
}
