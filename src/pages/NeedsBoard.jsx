import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData, useSessionValue } from '../state/DataContext.jsx';
import { CATEGORIES, URGENCY_LEVELS, SKILLS, AVAILABILITY_SLOTS, urgencyRank } from '../config/taxonomy.js';
import { seatsRemaining } from '../matching/index.js';
import OpportunityCard from '../components/OpportunityCard.jsx';
import InterestButton from '../components/InterestButton.jsx';
import { PageHeader, EmptyState } from '../components/ui.jsx';

const SORTS = {
  urgency: (a, b) => urgencyRank(b.urgency) - urgencyRank(a.urgency),
  newest: (a, b) => (b.created_date ?? '').localeCompare(a.created_date ?? ''),
  spots: (a, b, asg) => seatsRemaining(b, asg) - seatsRemaining(a, asg),
};

const initialFilters = { q: '', category: '', urgency: '', skill: '', slot: '', openOnly: true, hideDemo: false, sort: 'urgency' };

export default function NeedsBoard() {
  const { Opportunity, Assignment, VolunteerProfile, byId, loading } = useData();
  const [volunteerId, setVolunteerId] = useSessionValue('volunteer');
  const [f, setF] = useState(initialFilters);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const volunteer = byId.VolunteerProfile.get(volunteerId);

  const results = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return Opportunity.filter((o) => o.status === 'open')
      .filter((o) => !f.hideDemo || !o.is_demo)
      .filter((o) => !f.category || o.category === f.category || o.secondary_categories?.includes(f.category))
      .filter((o) => !f.urgency || o.urgency === f.urgency)
      .filter((o) => !f.skill || o.required_skills?.includes(f.skill) || o.preferred_skills?.includes(f.skill))
      .filter((o) => !f.slot || !o.schedule_slots?.length || o.schedule_slots.includes(f.slot))
      .filter((o) => !f.openOnly || seatsRemaining(o, Assignment) > 0)
      .filter((o) => {
        if (!q) return true;
        const org = byId.Organization.get(o.organization_id);
        const hay = [o.title, o.description, o.category, o.location, org?.name, ...(o.required_skills ?? []), ...(o.preferred_skills ?? [])].join(' ').toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => SORTS[f.sort](a, b, Assignment));
  }, [Opportunity, Assignment, byId, f]);

  return (
    <>
      <PageHeader title="Community Needs Board" lead="Every open request posted by local organizations. Search, filter, and express interest — organizations review every request before anyone is confirmed." />
      <div className="container board-layout">
        <aside className="card filters" aria-labelledby="filters-heading">
          <h2 id="filters-heading" className="h4">Filter needs</h2>
          <label className="field">
            <span>Search</span>
            <input type="search" value={f.q} onChange={set('q')} placeholder="Title, skill, organization…" />
          </label>
          <label className="field">
            <span>Category</span>
            <select value={f.category} onChange={set('category')}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Urgency</span>
            <select value={f.urgency} onChange={set('urgency')}>
              <option value="">Any urgency</option>
              {URGENCY_LEVELS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Skill</span>
            <select value={f.skill} onChange={set('skill')}>
              <option value="">Any skill</option>
              {SKILLS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Availability</span>
            <select value={f.slot} onChange={set('slot')}>
              <option value="">Any time</option>
              {AVAILABILITY_SLOTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Sort by</span>
            <select value={f.sort} onChange={set('sort')}>
              <option value="urgency">Most urgent</option>
              <option value="newest">Newest</option>
              <option value="spots">Most open spots</option>
            </select>
          </label>
          <label className="check"><input type="checkbox" checked={f.openOnly} onChange={set('openOnly')} /><span>Only show listings with open spots</span></label>
          <label className="check"><input type="checkbox" checked={f.hideDemo} onChange={set('hideDemo')} /><span>Hide demo listings</span></label>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setF(initialFilters)}>Reset filters</button>

          <hr />
          <label className="field">
            <span>Acting as volunteer</span>
            <select value={volunteerId} onChange={(e) => setVolunteerId(e.target.value)}>
              <option value="">— Browse only —</option>
              {[...VolunteerProfile].sort((a, b) => a.display_name.localeCompare(b.display_name)).map((v) => <option key={v.id} value={v.id}>{v.display_name}{v.is_demo ? ' [demo]' : ''}</option>)}
            </select>
          </label>
          <p className="hint">Pick a profile to express interest here, or <Link to="/match">build your own in the Match Explorer</Link>.</p>
        </aside>

        <section aria-labelledby="results-heading">
          <h2 id="results-heading" className="results-count" aria-live="polite">
            {loading ? 'Loading needs…' : `${results.length} open need${results.length === 1 ? '' : 's'}`}
          </h2>
          {!loading && results.length === 0 && (
            <EmptyState title="No needs match these filters.">
              <button type="button" className="btn btn-ghost" onClick={() => setF(initialFilters)}>Clear filters</button>
            </EmptyState>
          )}
          <div className="listing-grid">
            {results.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} organization={byId.Organization.get(o.organization_id)} assignments={Assignment}>
                {volunteer ? (
                  <InterestButton volunteer={volunteer} opportunity={o} />
                ) : (
                  <Link className="btn btn-secondary" to={`/match?highlight=${o.id}`}>Check my fit</Link>
                )}
              </OpportunityCard>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
