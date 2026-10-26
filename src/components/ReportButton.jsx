import { useState } from 'react';
import Dialog from './Dialog.jsx';
import { useData, AUTO_HIDE_REPORT_THRESHOLD } from '../state/DataContext.jsx';
import { useAction } from './ui.jsx';

export const REPORT_REASONS = [
  'Unsafe for volunteers or minors',
  'Requests private or personal information',
  'Scam, spam, or paid work disguised as volunteering',
  'Inaccurate or misleading details',
  'Harassment or discriminatory content',
  'Other',
];

export default function ReportButton({ targetType, targetId, targetName }) {
  const { actions } = useData();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [run, busy] = useAction();

  const submit = async (e) => {
    e.preventDefault();
    const done = await run(async () => {
      await actions.report({ target_type: targetType, target_id: targetId, reason, details });
      return true;
    }, 'Report submitted. A moderator will review it.');
    if (done) {
      setOpen(false);
      setReason('');
      setDetails('');
    }
  };

  return (
    <>
      <button type="button" className="btn btn-link btn-small" onClick={() => setOpen(true)}>
        Report<span className="sr-only"> {targetName}</span>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Report “${targetName}”`}>
        <form onSubmit={submit} className="stack">
          <p className="muted">
            Reports go to the moderation queue. A listing with {AUTO_HIDE_REPORT_THRESHOLD} open reports is hidden automatically until reviewed.
            Do not include personal contact details.
          </p>
          <fieldset>
            <legend>Reason</legend>
            {REPORT_REASONS.map((r) => (
              <label key={r} className="check">
                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} required />
                <span>{r}</span>
              </label>
            ))}
          </fieldset>
          <label className="field">
            <span>Details (optional)</span>
            <textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} />
          </label>
          <div className="row-end">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>Submit report</button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
