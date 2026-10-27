import { useState } from 'react';
import { useData } from '../state/DataContext.jsx';
import { WEIGHTS, SKILL_WEIGHT, INTEREST_SHARE, ELIGIBILITY_RULES, checkEligibility, scoreOpportunity } from '../matching/index.js';
import { sourceUrl } from '../config/project.js';
import ScoreBreakdown, { ScoreSummary } from '../components/ScoreBreakdown.jsx';
import { PageHeader, useAction } from '../components/ui.jsx';

const RULE_TEXT = {
  listing_open: 'The listing must be open (not closed or hidden by moderation).',
  capacity: 'At least one spot must remain. Pending requests do not hold a spot; confirmed and completed ones do.',
  minimum_age: 'The volunteer’s age band must meet the listing’s minimum age.',
  minor_supervision: 'Volunteers under 18 only match listings with an on-site staff supervisor.',
  adult_minor_safeguard: 'Adults only match listings involving minors when the setting is supervised and they have a background check, which the organization verifies before approving.',
  background_check: 'If a listing requires a background check, the volunteer must report having one.',
  schedule: 'If every time slot is mandatory, the volunteer must be free for all of them; otherwise at least one must overlap.',
};

const SOURCES = [
  ['src/matching/weights.js', 'Every tunable number'],
  ['src/matching/eligibility.js', 'Pass/fail rules'],
  ['src/matching/scoring.js', 'The three score components'],
  ['src/matching/rank.js', 'Filter, score, and sort'],
  ['src/workflow/assignments.js', 'Approval and completion rules'],
  ['src/impact/metrics.js', 'Impact figures'],
];

function Trace() {
  const { VolunteerProfile, Opportunity, Assignment } = useData();
  const volunteers = [...VolunteerProfile].sort((a, b) => a.display_name.localeCompare(b.display_name));
  const listings = [...Opportunity].sort((a, b) => a.title.localeCompare(b.title));
  const [vid, setVid] = useState('');
  const [oid, setOid] = useState('');
  const volunteer = volunteers.find((v) => v.id === vid) ?? volunteers[0];
  const opportunity = listings.find((o) => o.id === oid) ?? listings[0];

  if (!volunteer || !opportunity) return <p className="muted">Load the demo data below to try the walkthrough.</p>;

  const eligibility = checkEligibility(volunteer, opportunity, Assignment);
  const { total, breakdown } = scoreOpportunity(volunteer, opportunity);

  return (
    <div className="trace">
      <div className="trace-pickers">
        <label className="field">
          <span>Volunteer</span>
          <select value={volunteer.id} onChange={(e) => setVid(e.target.value)}>
            {volunteers.map((v) => <option key={v.id} value={v.id}>{v.display_name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Listing</span>
          <select value={opportunity.id} onChange={(e) => setOid(e.target.value)}>
            {listings.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
          </select>
        </label>
      </div>

      <h3>Step 1: eligibility rules <a className="source-link" href={sourceUrl('src/matching/eligibility.js')}>eligibility.js</a></h3>
      <table className="trace-table">
        <caption className="sr-only">Eligibility rule results</caption>
        <thead><tr><th scope="col">Rule</th><th scope="col">Result</th><th scope="col">Reason</th></tr></thead>
        <tbody>
          {eligibility.results.map((r) => (
            <tr key={r.id} className={r.passed ? '' : 'row-fail'}>
              <th scope="row"><code>{r.id}</code></th>
              <td><span className={r.passed ? 'result-pass' : 'result-fail'}>{r.passed ? 'Pass' : 'Fail'}</span></td>
              <td>{r.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={`trace-verdict ${eligibility.eligible ? 'ok' : 'bad'}`}>
        {eligibility.eligible
          ? 'All rules pass, so this listing is ranked for this volunteer.'
          : `${eligibility.failures.length} rule${eligibility.failures.length === 1 ? '' : 's'} failed, so this listing is filtered out. It is never scored into the ranking.`}
      </p>

      <h3>Step 2: compatibility score <a className="source-link" href={sourceUrl('src/matching/scoring.js')}>scoring.js</a></h3>
      {!eligibility.eligible && <p className="muted">Shown for learning only. Ineligible listings don’t appear in the volunteer’s results.</p>}
      <div className="trace-score">
        <ScoreSummary score={total} />
        <ScoreBreakdown breakdown={breakdown} />
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const { actions, backend, Opportunity } = useData();
  const [run, busy] = useAction();
  const hasDemo = Opportunity.some((o) => o.is_demo);

  return (
    <>
      <PageHeader title="How matching works" lead="Bridge ranks opportunities with a small set of written rules, not a black box. Every rule and weight is listed here, and you can trace any match step by step." />
      <div className="container stack-lg prose">
        <section className="panel" aria-labelledby="trace-heading">
          <h2 id="trace-heading">Trace a match</h2>
          <p>Choose a volunteer and a listing to see exactly how the algorithm decides, using the same code that runs the Match Explorer.</p>
          <Trace />
        </section>

        <section className="panel">
          <h2>The rules</h2>
          <h3>Eligibility filters (pass or fail)</h3>
          <p>Mandatory requirements are never traded for points. If any rule fails, the listing is removed and shown separately with the reason.</p>
          <ol>
            {ELIGIBILITY_RULES.map((r) => <li key={r.id}><code>{r.id}</code>: {RULE_TEXT[r.id]}</li>)}
          </ol>
          <h3>Compatibility score (0–100)</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Component</th><th scope="col" className="num">Max</th><th scope="col">Formula</th></tr></thead>
              <tbody>
                <tr><th scope="row">Skills</th><td className="num">{WEIGHTS.skills}</td><td>Required skills weigh {SKILL_WEIGHT.required}, helpful skills weigh {SKILL_WEIGHT.preferred}. Matched weight ÷ total weight × {WEIGHTS.skills}. No skills listed: full points.</td></tr>
                <tr><th scope="row">Availability</th><td className="num">{WEIGHTS.availability}</td><td>Overlapping time slots ÷ listed slots × {WEIGHTS.availability}. Flexible schedule: full points.</td></tr>
                <tr><th scope="row">Interests</th><td className="num">{WEIGHTS.interests}</td><td>Primary cause chosen: {INTEREST_SHARE.primaryCategory * 100}%. Only a related cause: {INTEREST_SHARE.secondaryCategory * 100}%. Otherwise 0.</td></tr>
              </tbody>
            </table>
          </div>
          <p>Each component is rounded to a whole number and added. Ties are broken by urgency, then open spots, then title.</p>
          <p className="callout"><strong>What a score is not.</strong> It is not a probability that a volunteer will succeed, be accepted, or finish. It only measures how closely a listing matches the information entered.</p>
        </section>

        <section className="panel">
          <h2>After a match</h2>
          <p>Expressing interest creates a pending request. Only the posting organization can confirm it, and Bridge re-checks eligibility and capacity at that moment. Duplicate requests are blocked, and a listing can never be confirmed past its capacity.</p>
          <p>After the activity, the organization records the actual hours served, up to 24 per verification. Bridge never estimates hours. Volunteers can download their verified hours as a service record.</p>
        </section>

        <section className="panel">
          <h2>Privacy and safety</h2>
          <ul>
            <li>No phone numbers, emails, or addresses are collected. Volunteers use a display name and an age band.</li>
            <li>Organizations share check-in details in a private approval message that only that volunteer sees.</li>
            <li>Listings involving minors must be supervised. Adults on those listings need a background check the organization verifies.</li>
            <li>Organizations are labeled <strong>unverified</strong>, because identity verification isn’t built yet.</li>
            <li>Every listing can be reported. Three open reports hide a listing until a moderator reviews it.</li>
          </ul>
        </section>

        <section className="panel">
          <h2>Read the code</h2>
          <p>The matching, workflow, and impact logic is plain JavaScript, kept separate from the interface and covered by unit tests.</p>
          <ul className="source-list">
            {SOURCES.map(([path, what]) => (
              <li key={path}><a href={sourceUrl(path)}><code>{path}</code></a> <span className="muted">{what}</span></li>
            ))}
          </ul>
        </section>

        <section className="panel" id="demo">
          <h2>Demo data</h2>
          <p>Demo records are fictional organizations and volunteers, each labeled <span className="badge badge-demo">Demo</span>. Anything a demo profile does is recorded as <strong>simulated</strong> and reported separately on the Impact page. Storage: <strong>{backend === 'base44' ? 'Base44 database' : 'this browser (offline mode)'}</strong>.</p>
          <div className="row">
            <button type="button" className="btn btn-primary" disabled={busy || hasDemo} onClick={() => run(actions.seedDemo, 'Demo data loaded.')}>Load demo data</button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy || !hasDemo}
              onClick={() => window.confirm('Remove all demo organizations, profiles, listings, and simulated assignments?') && run(actions.clearDemo, 'Demo data removed.')}
            >
              Remove demo data
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
