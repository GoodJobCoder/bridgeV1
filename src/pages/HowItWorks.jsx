import { useData } from '../state/DataContext.jsx';
import { WEIGHTS, SKILL_WEIGHT, INTEREST_SHARE, ELIGIBILITY_RULES } from '../matching/index.js';
import { PageHeader, useAction } from '../components/ui.jsx';

const RULE_TEXT = {
  listing_open: 'The listing must be open (not closed or hidden by moderation).',
  capacity: 'At least one volunteer spot must remain. Pending requests do not hold a spot; confirmed and completed ones do.',
  minimum_age: 'The volunteer’s age band must meet the listing’s minimum age.',
  minor_supervision: 'Volunteers under 18 are only matched with listings that have an on-site staff supervisor.',
  adult_minor_safeguard: 'Adults are only matched with listings involving minors when the setting is supervised and the volunteer has a background check (which the organization must verify before approving).',
  background_check: 'If a listing requires a background check, the volunteer must report having one.',
  schedule: 'If every time slot is mandatory, the volunteer must be free for all of them; otherwise at least one must overlap.',
};

export default function HowItWorks() {
  const { actions, backend, Opportunity } = useData();
  const [run, busy] = useAction();
  const hasDemo = Opportunity.some((o) => o.is_demo);

  return (
    <>
      <PageHeader title="How matching works" lead="Bridge’s matching is a transparent, rule-based algorithm — no black box. Here is every rule and every weight." />
      <div className="container stack prose">
        <section className="card">
          <h2>Step 1 — Eligibility filters (pass/fail)</h2>
          <p>Mandatory requirements are never traded for points. If any rule fails, the listing is removed from the ranked list and shown separately with the reason.</p>
          <ol>
            {ELIGIBILITY_RULES.map((r) => <li key={r.id}><code>{r.id}</code> — {RULE_TEXT[r.id]}</li>)}
          </ol>
        </section>

        <section className="card">
          <h2>Step 2 — Compatibility score (0–100)</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Component</th><th scope="col">Max points</th><th scope="col">Formula</th></tr></thead>
              <tbody>
                <tr><th scope="row">Skills</th><td>{WEIGHTS.skills}</td><td>Required skills weigh {SKILL_WEIGHT.required}, preferred weigh {SKILL_WEIGHT.preferred}. Points = matched weight ÷ total weight × {WEIGHTS.skills}. No skills listed → full points.</td></tr>
                <tr><th scope="row">Availability</th><td>{WEIGHTS.availability}</td><td>Overlapping time slots ÷ listed slots × {WEIGHTS.availability}. Flexible schedule → full points.</td></tr>
                <tr><th scope="row">Interests</th><td>{WEIGHTS.interests}</td><td>Primary category in your interests → {INTEREST_SHARE.primaryCategory * 100}%; only a secondary category → {INTEREST_SHARE.secondaryCategory * 100}%; otherwise 0.</td></tr>
              </tbody>
            </table>
          </div>
          <p>Each component is rounded to a whole number, then added. Ties are broken by urgency, then open spots, then title.</p>
          <h3>Worked example</h3>
          <p>A tutoring listing requires <em>Tutoring</em> and prefers <em>Public speaking</em>. A volunteer with Tutoring only earns 2 of 3 weighted skill points: 2 ÷ 3 × 45 = <strong>30</strong>. They are free for the single listed slot: 1 ÷ 1 × 35 = <strong>35</strong>. Education is one of their interests: <strong>20</strong>. Total: <strong>85 / 100</strong>.</p>
          <p className="notice"><strong>What the score is not:</strong> it is not a probability that a volunteer will succeed, be accepted, or complete the activity. It only measures how closely a listing matches the information entered.</p>
        </section>

        <section className="card">
          <h2>Step 3 — Organization approval</h2>
          <p>Expressing interest creates a <em>pending request</em>. Only the posting organization can confirm it, and Bridge re-checks eligibility and capacity at that moment. Duplicate requests for the same listing are blocked, and a listing can never be confirmed beyond its capacity.</p>
          <p>After the activity, the organization records the actual hours served (max 24 per verification). Bridge never estimates or auto-generates hours.</p>
        </section>

        <section className="card">
          <h2>Privacy and safety</h2>
          <ul>
            <li>Bridge does not collect volunteer phone numbers, emails, or addresses. Volunteers use a display name and an age band.</li>
            <li>Organizations share check-in details privately in the approval message, visible only to that volunteer.</li>
            <li>Listings that involve minors must be supervised. Adult volunteers on those listings need a background check that the organization verifies before approval.</li>
            <li>Organizations are labeled <strong>unverified</strong> because identity verification is not implemented.</li>
            <li>Every listing has a Report button. Reports go to the moderation queue, and repeated reports hide a listing automatically.</li>
          </ul>
        </section>

        <section className="card" id="demo">
          <h2>Demo data</h2>
          <p>Demo records are fictional organizations and volunteer profiles, each labeled <span className="badge badge-demo">Demo</span>. Anything a demo profile does is recorded as <strong>simulated</strong> and reported separately on the Impact Dashboard. Storage: <strong>{backend === 'base44' ? 'Base44 database' : 'this browser (offline mode)'}</strong>.</p>
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
