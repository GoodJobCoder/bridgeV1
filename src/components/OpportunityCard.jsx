import { slotLabel, AGE_BANDS } from '../config/taxonomy.js';
import { seatsRemaining } from '../matching/index.js';
import { DemoBadge, VerificationBadge, UrgencyBadge } from './ui.jsx';
import ReportButton from './ReportButton.jsx';

export function SafetyLine({ opportunity }) {
  const youthOk = opportunity.supervised && AGE_BANDS.some((b) => b.isMinor && b.minAge >= opportunity.min_age);
  const items = [
    `Ages ${opportunity.min_age}+`,
    opportunity.supervised && 'Supervised on site',
    opportunity.requires_background_check && 'Background check required',
    opportunity.serves_minors && 'Works with minors',
    youthOk && 'Open to teen volunteers',
  ].filter(Boolean);
  return <p className="listing-safety"><span className="sr-only">Eligibility and safety: </span>{items.join(' · ')}</p>;
}

export function ScheduleText({ opportunity }) {
  const slots = opportunity.schedule_slots ?? [];
  if (!slots.length) return <span>Flexible</span>;
  return (
    <span>
      {slots.map(slotLabel).join(', ')}
      {slots.length > 1 && <span className="muted"> ({opportunity.schedule_mode === 'all' ? 'all required' : 'any one'})</span>}
    </span>
  );
}

/**
 * Public listing card. Deliberately shows no contact information: volunteers and
 * organizations connect only through Bridge's request → approval flow.
 */
export default function OpportunityCard({ opportunity, organization, assignments, headingLevel = 3, children, aside }) {
  const left = seatsRemaining(opportunity, assignments);
  const H = `h${headingLevel}`;
  const required = opportunity.required_skills ?? [];
  const preferred = (opportunity.preferred_skills ?? []).filter((s) => !required.includes(s));
  return (
    <article className="listing" aria-labelledby={`opp-${opportunity.id}`}>
      <div className="listing-head">
        <div className="listing-meta">
          <UrgencyBadge urgency={opportunity.urgency} />
          <span>{opportunity.category}</span>
          <DemoBadge show={opportunity.is_demo} />
        </div>
        {aside}
      </div>
      <H id={`opp-${opportunity.id}`} className="listing-title">{opportunity.title}</H>
      <p className="listing-org">
        {organization?.name ?? 'Unknown organization'} <VerificationBadge organization={organization} />
      </p>
      <p className="listing-desc">{opportunity.description}</p>
      <dl className="facts">
        <div><dt>When</dt><dd><ScheduleText opportunity={opportunity} /></dd></div>
        <div><dt>Where</dt><dd>{opportunity.location || 'Shared after confirmation'}</dd></div>
        <div><dt>Spots</dt><dd className={left === 0 ? 'text-danger' : ''}>{left === 0 ? 'Full' : `${left} of ${opportunity.capacity} open`}</dd></div>
        {opportunity.hours_per_session > 0 && <div><dt>Shift</dt><dd>About {opportunity.hours_per_session} h</dd></div>}
      </dl>
      {(required.length > 0 || preferred.length > 0) && (
        <p className="listing-skills">
          {required.length > 0 && <><span className="label">Requires</span> {required.join(', ')}</>}
          {required.length > 0 && preferred.length > 0 && <br />}
          {preferred.length > 0 && <><span className="label">Helpful</span> {preferred.join(', ')}</>}
        </p>
      )}
      <SafetyLine opportunity={opportunity} />
      <div className="listing-actions">
        {children}
        <ReportButton targetType="opportunity" targetId={opportunity.id} targetName={opportunity.title} />
      </div>
    </article>
  );
}
