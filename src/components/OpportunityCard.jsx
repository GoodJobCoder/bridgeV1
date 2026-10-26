import { slotLabel, AGE_BANDS } from '../config/taxonomy.js';
import { seatsRemaining } from '../matching/index.js';
import { DemoBadge, VerificationBadge, UrgencyBadge, Chips } from './ui.jsx';
import ReportButton from './ReportButton.jsx';

export function SafetyBadges({ opportunity }) {
  const youthOk = AGE_BANDS.some((b) => b.isMinor && b.minAge >= opportunity.min_age);
  return (
    <ul className="safety" aria-label="Eligibility and safety">
      <li>Ages {opportunity.min_age}+</li>
      {opportunity.supervised && <li>Supervised on site</li>}
      {opportunity.requires_background_check && <li>Background check required</li>}
      {opportunity.serves_minors && <li>Works with minors</li>}
      {youthOk && opportunity.supervised && <li>Youth-friendly</li>}
    </ul>
  );
}

export function ScheduleText({ opportunity }) {
  const slots = opportunity.schedule_slots ?? [];
  if (!slots.length) return <span>Flexible schedule</span>;
  return (
    <span>
      {slots.map(slotLabel).join(', ')}
      {slots.length > 1 && <em> ({opportunity.schedule_mode === 'all' ? 'all required' : 'any one'})</em>}
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
  return (
    <article className={`card opp-card urgency-edge-${opportunity.urgency}`} aria-labelledby={`opp-${opportunity.id}`}>
      <div className="opp-top">
        <div className="badges">
          <UrgencyBadge urgency={opportunity.urgency} />
          <span className="badge badge-cat">{opportunity.category}</span>
          <DemoBadge show={opportunity.is_demo} />
        </div>
        {aside}
      </div>
      <H id={`opp-${opportunity.id}`} className="opp-title">{opportunity.title}</H>
      <p className="opp-org">
        {organization?.name ?? 'Unknown organization'} <VerificationBadge organization={organization} />
      </p>
      <p>{opportunity.description}</p>
      <dl className="facts">
        <div><dt>When</dt><dd><ScheduleText opportunity={opportunity} /></dd></div>
        <div><dt>Where</dt><dd>{opportunity.location || 'Shared after confirmation'}</dd></div>
        <div><dt>Spots</dt><dd className={left === 0 ? 'text-danger' : ''}>{left === 0 ? 'Full' : `${left} of ${opportunity.capacity} open`}</dd></div>
        {opportunity.hours_per_session > 0 && <div><dt>Shift</dt><dd>~{opportunity.hours_per_session} h</dd></div>}
      </dl>
      <Chips items={opportunity.required_skills} variant="chip-required" label="Required skills" />
      <Chips items={(opportunity.preferred_skills ?? []).filter((s) => !opportunity.required_skills?.includes(s))} label="Preferred skills" />
      <SafetyBadges opportunity={opportunity} />
      <div className="card-actions">
        {children}
        <ReportButton targetType="opportunity" targetId={opportunity.id} targetName={opportunity.title} />
      </div>
    </article>
  );
}
