import { useCinemiesStore } from '../../store/useCinemiesStore'
import { MOOD_CONFIG, MOOD_KEYS } from '../../data/moodConfig'
import MoodCard from './MoodCard'
import { getMoodRecommendations } from '../../api/recommendations'

export default function MoodSelector() {
  const { currentMood, setMood, selectedIndustry, setRecsLoading, setRecommendations, setRecsError } = useCinemiesStore()

  const handleMoodClick = async (key) => {
    setMood(key)
    setRecsLoading()
    
    try {
      const data = await getMoodRecommendations(key, selectedIndustry)
      const recs = data?.recommendations || data?.movies || data || []
      setRecommendations(Array.isArray(recs) ? recs : [], data?.source || 'ai')
    } catch (err) {
      console.error('Failed to fetch recommendations:', err)
      setRecsError(err.response?.data?.error || 'Failed to load recommendations')
    }
  }

  return (
    <section id="moods">
      <span className="section-eyebrow">How are you feeling?</span>
      <h2 className="section-title">Choose Your Mood</h2>
      <div className="moods-grid">
        {MOOD_KEYS.map((key) => (
          <MoodCard
            key={key}
            moodKey={key}
            config={MOOD_CONFIG[key]}
            isActive={currentMood === key}
            onClick={() => handleMoodClick(key)}
          />
        ))}
      </div>
    </section>
  )
}

