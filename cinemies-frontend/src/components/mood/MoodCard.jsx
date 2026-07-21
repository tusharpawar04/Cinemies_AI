export default function MoodCard({ moodKey, config, isActive, onClick }) {
  return (
    <div
      className={`mood-card ${isActive ? 'active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      id={`mood-${moodKey}`}
    >
      <div className="mood-card-icon">{config.icon}</div>
      <div className="mood-card-label">{config.label}</div>
      <div className="mood-card-desc">{config.description}</div>
    </div>
  )
}
