import '../../styles/movies.css'

export default function MoodScoreBar({ score }) {
  const pct = Math.round(score * 100)
  const color = pct >= 80 ? 'score-high' : pct >= 60 ? 'score-mid' : 'score-low'

  return (
    <div className="mood-score-bar">
      <div className="mood-score-track">
        <div
          className={`mood-score-fill ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`mood-score-label ${color}`}>{pct}% match</span>
    </div>
  )
}
