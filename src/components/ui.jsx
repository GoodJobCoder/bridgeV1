import { useCallback, useState } from 'react';
import { useData } from '../state/DataContext.jsx';
import { urgencyLabel } from '../config/taxonomy.js';

export function PageHeader({ title, lead, children }) {
  return (
    <section className="page-header">
      <div className="container">
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
        {children}
      </div>
    </section>
  );
}

export const DemoBadge = ({ show = true }) => (show ? <span className="badge badge-demo" title="Fictional demo record">Demo</span> : null);

export function VerificationBadge({ organization }) {
  if (!organization) return null;
  return organization.verified ? (
    <span className="badge badge-verified">Verified org</span>
  ) : (
    <span className="badge badge-unverified" title="Bridge has not verified this organization's identity">Unverified org</span>
  );
}

export const UrgencyBadge = ({ urgency }) => (
  <span className={`badge urgency-${urgency}`}>
    <span className="sr-only">Urgency: </span>
    {urgencyLabel(urgency)}
    <span aria-hidden="true"> urgency</span>
  </span>
);

export function Chips({ items, variant = '', label }) {
  if (!items?.length) return null;
  return (
    <ul className="chips" aria-label={label}>
      {items.map((i) => (
        <li key={i} className={`chip ${variant}`}>{i}</li>
      ))}
    </ul>
  );
}

/** Accessible group of checkboxes for picking several values from a fixed list. */
export function CheckboxGroup({ legend, options, value, onChange, columns = 2, hint }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <fieldset className="checkbox-group">
      <legend>{legend}</legend>
      {hint && <p className="hint">{hint}</p>}
      <div className={`checkbox-grid cols-${columns}`}>
        {options.map((o) => {
          const id = typeof o === 'string' ? o : o.id;
          const text = typeof o === 'string' ? o : o.label;
          return (
            <label key={id} className="check">
              <input type="checkbox" checked={value.includes(id)} onChange={() => toggle(id)} />
              <span>{text}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="empty-state">
      <p className="empty-title">{title}</p>
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub, tone = '' }) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

/** Runs an async action, tracks a busy flag, and reports success or failure in the toast. */
export function useAction() {
  const { notify } = useData();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (fn, successMessage) => {
      setBusy(true);
      try {
        const result = await fn();
        if (successMessage) notify(successMessage, 'success');
        return result;
      } catch (err) {
        notify(err.message || String(err), 'error');
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [notify],
  );
  return [run, busy];
}
