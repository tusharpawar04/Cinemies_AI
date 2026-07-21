import '../../styles/movies.css'

export default function EmptyState({ mood }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">🎬</div>
      <h3>No movies found</h3>
      <p>
        {mood
          ? `We couldn't find recommendations for "${mood.replace(/_/g, ' ')}".`
          : 'Select a mood to discover movies.'}
      </p>
      <p className="empty-hint">Try a different mood or check back later.</p>
    </div>
  )
}
