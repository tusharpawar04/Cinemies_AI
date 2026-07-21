import { useEffect } from 'react'
import { useCinemiesStore } from '../store/useCinemiesStore'
import { useWatchlistStore } from '../store/useWatchlistStore'
import { useMoodTransition } from '../hooks/useMoodTransition'
import MoodSelector from '../components/mood/MoodSelector'
import InfiniteMovieFeed from '../components/movies/InfiniteMovieFeed'
import Navbar from '../components/ui/Navbar'
import MoodTransitionVeil from '../components/mood/MoodTransitionVeil'
import MovieDetailModal from '../components/movies/MovieDetailModal'
import '../styles/home.css'

export default function HomePage() {
  const { setEntryComplete } = useCinemiesStore()
  const { fetchAll } = useWatchlistStore()
  useMoodTransition()

  useEffect(() => {
    // Skip loading animation for logged-in users
    setEntryComplete(true)
    
    // Load watchlist and watched data
    fetchAll().catch(err => console.error('Failed to load watchlist data:', err))
  }, [setEntryComplete, fetchAll])

  return (
    <div className="home-page">
      <div className="home-background">
        <div className="home-gradient home-gradient--1" />
        <div className="home-gradient home-gradient--2" />
        <div className="home-gradient home-gradient--3" />
      </div>

      <MoodTransitionVeil />
      
      <div className="home-content">
        <Navbar />
        
        <div className="home-hero">
          <h1 className="home-title">How are you feeling?</h1>
          <p className="home-subtitle">Choose your mood and discover movies that match</p>
        </div>

        <MoodSelector />
        <InfiniteMovieFeed />
      </div>

      <MovieDetailModal />
    </div>
  )
}
