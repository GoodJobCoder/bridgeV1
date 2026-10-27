import { Link } from 'react-router-dom';
import { useData } from '../state/DataContext.jsx';
import { seatsRemaining, WEIGHTS } from '../matching/index.js';
import { computeImpact } from '../impact/metrics.js';
import { DemoBadge, UrgencyBadge, EmptyState } from '../components/ui.jsx';

function Figure({ value, label }) {
  return (
    <div className="figure">
      <dd>{value}</dd>
      <dt>{label}</dt>
    </div>
  );
}

export default function Home() {
  const { Opportunity, Assignment, byId, loading } = useData();
  const open = Opportunity.filter((o) => o.status === 'open');
  const openSpots = open.reduce((s, o) => s + seatsRemaining(o, Assignment), 0);
  const impact = computeImpact(Opportunity, Assignment);
  const leastCovered = impact.coverage.perNeed.filter((c) => c.ratio < 1).slice(0, 5);
  const v = (n) => (loading ? '–' : n);

  return (
    <>
      <section className="intro">
        <div className="container intro-inner">
          <div className="intro-text">
            <h1>Local needs, matched with the people who can meet them.</h1>
            <p className="lead">
              Organizations post what they need. Volunteers see which opportunities fit their skills and schedule, and exactly why.
              Nobody is placed without the organization’s approval, and only verified service counts toward impact.
            </p>
            <div className="intro-actions">
              <Link to="/match" className="btn btn-primary btn-lg">Find opportunities</Link>
              <Link to="/organizations" className="btn btn-secondary btn-lg">Post a need</Link>
            </div>
          </div>
          <section className="figures" aria-labelledby="now-heading">
            <h2 id="now-heading">Right now</h2>
            <dl>
              <Figure value={v(open.length)} label="open needs" />
              <Figure value={v(openSpots)} label="volunteer spots unfilled" />
              <Figure value={v(impact.coverage.uncovered)} label="needs with no volunteers yet" />
              <Figure value={v(impact.real.verifiedHours)} label="verified hours (real records)" />
            </dl>
            <p className="figures-note">Includes fictional demo listings. Simulated hours are never counted.</p>
          </section>
        </div>
      </section>

      <div className="container stack-lg">
        <section aria-labelledby="gaps-heading">
          <div className="section-head">
            <h2 id="gaps-heading">Needs with the fewest volunteers</h2>
            <Link to="/needs">All needs</Link>
          </div>
          {!loading && leastCovered.length === 0 && <EmptyState title="Every open need is fully covered." />}
          <ol className="need-list">
            {leastCovered.map(({ opportunity: o, filled, capacity, ratio }) => (
              <li key={o.id}>
                <div className="need-main">
                  <Link to={`/match?highlight=${o.id}`} className="need-title">{o.title}</Link>
                  <span className="need-org">
                    {byId.Organization.get(o.organization_id)?.name} · {o.category} <DemoBadge show={o.is_demo} />
                  </span>
                </div>
                <UrgencyBadge urgency={o.urgency} />
                <div className="need-fill">
                  <div className="meter" aria-hidden="true"><span style={{ width: `${ratio * 100}%` }} /></div>
                  <span>{filled} of {capacity} filled</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="method" aria-labelledby="method-heading">
          <h2 id="method-heading">How a match is scored</h2>
          <p className="method-lead">
            First, Bridge removes any listing a volunteer can’t safely or practically do: wrong age, no supervision for a minor, a missing
            background check, a required shift they can’t make, or no open spots. The remaining listings are scored out of 100.
          </p>
          <div className="weight-bar" role="img" aria-label={`Skills ${WEIGHTS.skills} points, availability ${WEIGHTS.availability} points, interests ${WEIGHTS.interests} points`}>
            <span className="seg-skills" style={{ flex: WEIGHTS.skills }}>Skills {WEIGHTS.skills}</span>
            <span className="seg-availability" style={{ flex: WEIGHTS.availability }}>Availability {WEIGHTS.availability}</span>
            <span className="seg-interests" style={{ flex: WEIGHTS.interests }}>Interests {WEIGHTS.interests}</span>
          </div>
          <div className="method-cols">
            <div><h3>Skills</h3><p>Share of the listing’s skills you have. Required skills count twice as much as helpful ones.</p></div>
            <div><h3>Availability</h3><p>Share of the listing’s time slots you’re free for. Flexible listings earn full points.</p></div>
            <div><h3>Interests</h3><p>Full points if the cause is one you chose; half if it’s a related cause.</p></div>
          </div>
          <p><Link to="/how-it-works">Trace the algorithm step by step</Link></p>
        </section>
      </div>
    </>
  );
}
