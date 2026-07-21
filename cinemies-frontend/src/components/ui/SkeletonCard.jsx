import '../../styles/movies.css'

export default function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-poster shimmer" />
      <div className="skeleton-body">
        <div className="skeleton-title shimmer" />
        <div className="skeleton-meta shimmer" />
        <div className="skeleton-bar shimmer" />
      </div>
    </div>
  )
}
