import { Link } from 'react-router-dom';
import { useData } from '../state/DataContext.jsx';
import { urgencyRank } from '../config/taxonomy.js';
import { seatsRemaining, WEIGHTS } from '../matching/index.js';
import { computeImpact } from '../impact/metrics.js';
import OpportunityCard from '../components/OpportunityCard.jsx';
import { StatCard, EmptyState } from '../components/ui.jsx';

export default function Home() {
  const { Opportunity, Assignment, Organization, byId, loading } = useData();
  const open = Opportunity.filter((o) => o.status === 'open');
  const openSpots = open.reduce((s, o) => s + seatsRemaining(o, Assignment), 0);
  const urgent = open
    .filter((o) => seatsRemaining(o, Assignment) > 0)
    .sort((a, b) => urgencyRank(b.urgency) - urgencyRank(a.urgency) || seatsRemaining(b, Assignment) - seatsRemaining(a, Assignment))
    .slice(0, 3);
  const impact = computeImpact(Opportunity, Assignment);
  const pendingReview = Assignment.filter((a) => a.status === 'interested').length;

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div>
            <p className="eyebrow">Bridge</p>
            <h1>Connecting community needs with community action.</h1>
            <p className="lead">
              Organizations post what they need. Volunteers see transparent, explainable matches. Every placement is approved by the
              organization, and every hour counted is verified.
            </p>
            <div className="hero-cta">
              <Link to="/match" className="btn btn-accent btn-lg">Find my matches</Link>
              <Link to="/needs" className="btn btn-outline-light btn-lg">Browse needs</Link>
              <Link to="/organizations" className="btn btn-link-light">I represent an organization →</Link>
            </div>
          </div>
          <div className="hero-panel" aria-label="How compatibility is scored">
            <p className="hero-panel-title">Every match is scored out of 100</p>
            <ul>
              <li><span className="dot seg-skills" aria-hidden="true" /> Skills <strong>{WEIGHTS.skills}</strong></li>
              <li><span className="dot seg-availability" aria-hidden="true" /> Availability <strong>{WEIGHTS.availability}</strong></li>
              <li><span className="dot seg-interests" aria-hidden="true" /> Interests <strong>{WEIGHTS.interests}</strong></li>
            </ul>
            <p className="small">Safety and schedule requirements are filters, not points. Scores show fit — not a prediction of success.</p>
            <Link to="/how-it-works" className="btn btn-link-light">See the algorithm →</Link>
          </div>
        </div>
      </section>

      <div className="container stack">
        <section aria-labelledby="snapshot" className="stat-row home-stats">
          <h2 id="snapshot" className="sr-only">Community snapshot</h2>
          <StatCard label="Open needs" value={loading ? '…' : open.length} />
          <StatCard label="Volunteer spots open" value={loading ? '…' : openSpots} tone="tone-teal" />
          <StatCard label="Requests awaiting review" value={loading ? '…' : pendingReview} tone="tone-amber" />
          <StatCard label="Organizations" value={loading ? '…' : Organization.length} sub="All currently unverified" />
          <StatCard label="Real verified hours" value={loading ? '…' : impact.real.verifiedHours} sub="Simulated activity excluded" />
        </section>

        <section aria-labelledby="urgent-heading">
          <div className="section-head">
            <h2 id="urgent-heading">Most urgent needs</h2>
            <Link to="/needs">View all needs →</Link>
          </div>
          {!loading && urgent.length === 0 && <EmptyState title="No open needs right now." />}
          <div className="card-grid">
            {urgent.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} organization={byId.Organization.get(o.organization_id)} assignments={Assignment}>
                <Link className="btn btn-secondary" to={`/match?highlight=${o.id}`}>Check my fit</Link>
              </OpportunityCard>
            ))}
          </div>
        </section>

        <section aria-labelledby="paths-heading">
          <h2 id="paths-heading">How Bridge works</h2>
          <ol className="steps">
            <li className="card"><span className="step-num">1</span><h3 className="h4">Organizations post needs</h3><p>Skills, schedule, capacity, and safety requirements are listed up front.</p><Link to="/organizations">Organization Dashboard</Link></li>
            <li className="card"><span className="step-num">2</span><h3 className="h4">Volunteers explore matches</h3><p>Enter skills, availability, and causes to get a ranked, fully explained list.</p><Link to="/match">Match Explorer</Link></li>
            <li className="card"><span className="step-num">3</span><h3 className="h4">Organizations approve</h3><p>Nobody is confirmed until the posting organization reviews and approves them.</p><Link to="/organizations">Review requests</Link></li>
            <li className="card"><span className="step-num">4</span><h3 className="h4">Impact is verified</h3><p>Completions and hours count only after the organization verifies them.</p><Link to="/impact">Impact Dashboard</Link></li>
          </ol>
        </section>
      </div>
    </>
  );
}
