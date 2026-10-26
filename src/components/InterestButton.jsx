import { useData } from '../state/DataContext.jsx';
import { checkEligibility } from '../matching/index.js';
import { findActiveAssignment, STATUS_LABELS } from '../workflow/assignments.js';
import { useAction } from './ui.jsx';

/** Shows the right call to action for one volunteer + one opportunity. */
export default function InterestButton({ volunteer, opportunity, disabledReason }) {
  const { Assignment, actions } = useData();
  const [run, busy] = useAction();

  if (!volunteer) return null;
  const existing = findActiveAssignment(volunteer.id, opportunity.id, Assignment);
  if (existing) return <span className={`status-pill status-${existing.status}`}>{STATUS_LABELS[existing.status]}</span>;

  const { eligible, failures } = checkEligibility(volunteer, opportunity, Assignment);
  if (!eligible) return <span className="muted small">Not eligible: {failures[0].message}</span>;

  return (
    <button
      type="button"
      className="btn btn-primary"
      disabled={busy || Boolean(disabledReason)}
      title={disabledReason}
      onClick={() =>
        run(
          () => actions.expressInterest(volunteer.id, opportunity.id),
          `Interest sent for “${opportunity.title}”. The organization must approve before you are confirmed.`,
        )
      }
    >
      Express interest<span className="sr-only"> in {opportunity.title}</span>
    </button>
  );
}
