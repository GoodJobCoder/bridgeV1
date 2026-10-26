import { useState } from 'react';
import { useData, AUTO_HIDE_REPORT_THRESHOLD } from '../state/DataContext.jsx';
import { PageHeader, EmptyState, DemoBadge, useAction } from '../components/ui.jsx';

export default function Moderation() {
  const { Report, Opportunity, byId, actions } = useData();
  const [filter, setFilter] = useState('open');
  const [run, busy] = useAction();
  const reports = Report.filter((r) => filter === 'all' || r.status === filter);
  const hidden = Opportunity.filter((o) => o.status === 'hidden');

  return (
    <>
      <PageHeader
        title="Moderation Queue"
        lead={`Anyone can report a listing. Listings with ${AUTO_HIDE_REPORT_THRESHOLD} open reports are hidden from the Needs Board and Match Explorer until a moderator reviews them.`}
      />
      <div className="container stack">
        <p className="alert alert-info">
          This build has no login, so this page is open for demonstration. In production, restrict it to moderator accounts using Base44 roles.
        </p>

        {hidden.length > 0 && (
          <section className="card" aria-labelledby="hidden-heading">
            <h2 id="hidden-heading" className="h4">Hidden listings ({hidden.length})</h2>
            <ul className="request-list">
              {hidden.map((o) => (
                <li key={o.id}>
                  <strong>{o.title}</strong> <DemoBadge show={o.is_demo} /> — {byId.Organization.get(o.organization_id)?.name}
                  <button type="button" className="btn btn-link btn-small" disabled={busy} onClick={() => run(() => actions.moderateTarget(o.id, 'restore'), 'Listing restored and its open reports dismissed.')}>Restore<span className="sr-only"> {o.title}</span></button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <label className="field inline">
          <span>Show</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="open">Open reports</option>
            <option value="resolved">Resolved (action taken)</option>
            <option value="dismissed">Dismissed</option>
            <option value="all">All</option>
          </select>
        </label>

        {reports.length === 0 ? <EmptyState title="No reports in this view." /> : (
          <ul className="review-list">
            {reports.map((r) => {
              const target = r.target_type === 'opportunity' ? byId.Opportunity.get(r.target_id) : byId.Organization.get(r.target_id);
              return (
                <li key={r.id} className="card review-item">
                  <div className="review-main">
                    <p><strong>{r.reason}</strong> <span className="muted small">· {new Date(r.created_date).toLocaleString()}</span></p>
                    <p>Target: {target?.title ?? target?.name ?? 'Deleted record'} {target && <span className="muted small">({r.target_type}, currently {target.status ?? 'active'})</span>}</p>
                    {r.details && <blockquote>{r.details}</blockquote>}
                    {r.status !== 'open' && <p className="small">Outcome: {r.resolution}</p>}
                  </div>
                  {r.status === 'open' && (
                    <div className="review-actions">
                      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(() => actions.moderate(r.id, 'hide'), 'Listing hidden; its open reports are resolved.')}>Hide listing</button>
                      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => run(() => actions.moderate(r.id, 'restore'), 'Reports dismissed; listing visible.')}>Dismiss &amp; keep visible</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
