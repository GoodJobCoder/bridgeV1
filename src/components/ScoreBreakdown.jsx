import { fitLabel, MAX_SCORE } from '../matching/index.js';

const PARTS = [
  { key: 'skills', label: 'Skills' },
  { key: 'availability', label: 'Availability' },
  { key: 'interests', label: 'Interests' },
];

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
      <span className="score-max">/{MAX_SCORE}</span>
      <span className="score-fit">{fitLabel(score)}</span>
    </div>
  );
}

/** Lists exactly where every point came from. */
export default function ScoreBreakdown({ breakdown }) {
  return (
    <div className="breakdown">
      <ScoreBar breakdown={breakdown} />
      <dl>
        {PARTS.map((p) => {
          const part = breakdown[p.key];
          return (
            <div key={p.key} className="breakdown-row">
              <dt>
                <span className={`dot seg-${p.key}`} aria-hidden="true" />
                {p.label}: <strong>{part.points}/{part.max}</strong>
              </dt>
              <dd>
                <span>{part.summary}</span>
                <ul>
                  {part.details.map((d) => <li key={d}>{d}</li>)}
                  {part.missing?.length > 0 && <li>Skills you could add: {part.missing.join(', ')}</li>}
                </ul>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
