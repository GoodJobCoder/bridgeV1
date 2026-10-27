import { fitLabel, MAX_SCORE } from '../matching/index.js';

const PARTS = [
  { key: 'skills', label: 'Skills' },
  { key: 'availability', label: 'Availability' },
  { key: 'interests', label: 'Interests' },
];

/** Stacked bar: each segment's width is its points out of 100. Unearned points stay grey. */
export function ScoreBar({ breakdown }) {
  return (
    <div className="score-bar" aria-hidden="true">
      {PARTS.map((p) => (
        <span key={p.key} className={`seg seg-${p.key}`} style={{ width: `${breakdown[p.key].points}%` }} />
      ))}
    </div>
  );
}

export function ScoreSummary({ score }) {
  return (
    <div className="score-summary">
      <span className="score-num">{score}</span>
      <span className="score-max">/ {MAX_SCORE}</span>
      <span className="score-fit">{fitLabel(score)}</span>
    </div>
  );
}

/** Table showing exactly where every point came from. */
export default function ScoreBreakdown({ breakdown }) {
  const total = PARTS.reduce((s, p) => s + breakdown[p.key].points, 0);
  return (
    <div className="breakdown">
      <ScoreBar breakdown={breakdown} />
      <table className="breakdown-table">
        <caption className="sr-only">Score breakdown</caption>
        <thead>
          <tr><th scope="col">Component</th><th scope="col" className="num">Points</th><th scope="col">How it was calculated</th></tr>
        </thead>
        <tbody>
          {PARTS.map((p) => {
            const part = breakdown[p.key];
            return (
              <tr key={p.key}>
                <th scope="row"><span className={`key seg-${p.key}`} aria-hidden="true" />{p.label}</th>
                <td className="num">{part.points} / {part.max}</td>
                <td>
                  <span className="breakdown-summary">{part.summary}</span>
                  <ul>
                    {part.details.map((d) => <li key={d}>{d}</li>)}
                    {part.missing?.length > 0 && <li>Missing: {part.missing.join(', ')}</li>}
                  </ul>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr><th scope="row">Total</th><td className="num">{total} / {MAX_SCORE}</td><td className="muted">Fit with your profile, not a prediction of success.</td></tr>
        </tfoot>
      </table>
    </div>
  );
}
