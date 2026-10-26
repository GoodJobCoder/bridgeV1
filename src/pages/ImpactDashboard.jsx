import { useMemo, useState } from 'react';
import { useData } from '../state/DataContext.jsx';
import { computeImpact } from '../impact/metrics.js';
import { PageHeader, StatCard, DemoBadge, EmptyState } from '../components/ui.jsx';

const pct = (r) => `${Math.round(r * 100)}%`;

function Bar({ ratio, label }) {
  return (
    <div className="meter" role="img" aria-label={`${label}: ${pct(ratio)} covered`}>
      <span style={{ width: pct(ratio) }} />
    </div>
  );
}

export default function ImpactDashboard() {
  const { Opportunity, Assignment, byId } = useData();
  const [scope, setScope] = useState('all');

  const { opps, asg } = useMemo(
    () =>
      scope === 'real'
        ? { opps: Opportunity.filter((o) => !o.is_demo), asg: Assignment.filter((a) => !a.simulated) }
        : { opps: Opportunity, asg: Assignment },
    [scope, Opportunity, Assignment],
  );
  const m = useMemo(() => computeImpact(opps, asg), [opps, asg]);
  const completions = asg.filter((a) => a.status === 'completed' && a.verified_by_org).sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''));

  const showSim = scope === 'all';

  return (
    <>
      <PageHeader title="Impact Dashboard" lead="What has actually happened, kept separate from what is planned or simulated. Hours are counted only when an organization verifies completed service.">
        <fieldset className="scope-toggle">
          <legend className="sr-only">Data scope</legend>
          <label className={scope === 'all' ? 'active' : ''}><input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} /> Real + simulated (shown separately)</label>
          <label className={scope === 'real' ? 'active' : ''}><input type="radio" name="scope" checked={scope === 'real'} onChange={() => setScope('real')} /> Real records only</label>
        </fieldset>
      </PageHeader>

      <div className="container stack">
        <section aria-labelledby="pipeline">
          <h2 id="pipeline">Volunteer pipeline</h2>
          <div className="pipeline-grid">
            <div className="card pipeline-col">
              <h3 className="h4">1 · Pending requests</h3>
              <p className="hint">Volunteers expressed interest; organization has not decided.</p>
              <div className="stat-row">
                <StatCard label="Real" value={m.real.pendingRequests} />
                {showSim && <StatCard label="Simulated (demo)" value={m.simulated.pendingRequests} tone="tone-demo" />}
              </div>
            </div>
            <div className="card pipeline-col">
              <h3 className="h4">2 · Pending commitments</h3>
              <p className="hint">Organization confirmed the volunteer; service not yet verified.</p>
              <div className="stat-row">
                <StatCard label="Real" value={m.real.pendingCommitments} tone="tone-amber" />
                {showSim && <StatCard label="Simulated (demo)" value={m.simulated.pendingCommitments} tone="tone-demo" />}
              </div>
            </div>
            <div className="card pipeline-col">
              <h3 className="h4">3 · Verified completions</h3>
              <p className="hint">Organization attested the service happened and recorded actual hours.</p>
              <div className="stat-row">
                <StatCard label="Real completions" value={m.real.verifiedCompletions} sub={`${m.real.verifiedHours} verified hours`} tone="tone-teal" />
                {showSim && <StatCard label="Simulated completions" value={m.simulated.verifiedCompletions} sub={`${m.simulated.verifiedHours} simulated hours — not real service`} tone="tone-demo" />}
              </div>
            </div>
          </div>
        </section>

        <section className="card" aria-labelledby="coverage">
          <h2 id="coverage">Coverage of posted needs</h2>
          <p className="muted">Share of volunteer spots on currently open listings that are filled by confirmed or completed volunteers{showSim ? ' (includes demo listings and simulated assignments)' : ''}.</p>
          {m.coverage.needs === 0 ? <EmptyState title="No open needs in this scope." /> : (
            <>
              <div className="stat-row">
                <StatCard label="Spots filled" value={`${m.coverage.filledSeats} / ${m.coverage.totalSeats}`} sub={`${pct(m.coverage.ratio)} coverage`} tone="tone-teal" />
                <StatCard label="Open needs" value={m.coverage.needs} />
                <StatCard label="Fully covered" value={m.coverage.fullyCovered} />
                <StatCard label="No volunteers yet" value={m.coverage.uncovered} tone="tone-amber" />
              </div>
              <h3 className="h4">By category</h3>
              <ul className="meter-list">
                {m.coverage.byCategory.map((c) => (
                  <li key={c.category}>
                    <span className="meter-label">{c.category} <small className="muted">({c.needs} need{c.needs === 1 ? '' : 's'})</small></span>
                    <Bar ratio={c.seats ? c.filled / c.seats : 0} label={c.category} />
                    <span className="meter-value">{c.filled}/{c.seats}</span>
                  </li>
                ))}
              </ul>
              <h3 className="h4">Least-covered needs first</h3>
              <div className="table-wrap">
                <table>
                  <caption className="sr-only">Coverage for each open need</caption>
                  <thead><tr><th scope="col">Need</th><th scope="col">Organization</th><th scope="col">Coverage</th><th scope="col">Filled</th></tr></thead>
                  <tbody>
                    {m.coverage.perNeed.map((c) => (
                      <tr key={c.opportunity.id}>
                        <th scope="row">{c.opportunity.title} <DemoBadge show={c.opportunity.is_demo} /></th>
                        <td>{byId.Organization.get(c.opportunity.organization_id)?.name}</td>
                        <td><Bar ratio={c.ratio} label={c.opportunity.title} /></td>
                        <td>{c.filled}/{c.capacity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="card" aria-labelledby="verified">
          <h2 id="verified">Verified completion log</h2>
          {completions.length === 0 ? (
            <EmptyState title="No verified completions yet.">
              <p>Completions appear here only after an organization confirms a volunteer and later verifies the hours they actually served.</p>
            </EmptyState>
          ) : (
            <div className="table-wrap">
              <table>
                <caption className="sr-only">Verified completions</caption>
                <thead><tr><th scope="col">Volunteer</th><th scope="col">Need</th><th scope="col">Hours</th><th scope="col">Verified</th><th scope="col">Type</th></tr></thead>
                <tbody>
                  {completions.map((a) => (
                    <tr key={a.id}>
                      <th scope="row">{byId.VolunteerProfile.get(a.volunteer_id)?.display_name ?? '—'}</th>
                      <td>{byId.Opportunity.get(a.opportunity_id)?.title ?? '—'}</td>
                      <td>{a.hours_verified}</td>
                      <td>{a.completed_at ? new Date(a.completed_at).toLocaleDateString() : '—'}</td>
                      <td>{a.simulated ? <span className="badge badge-demo">Simulated</span> : <span className="badge badge-verified">Real</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
