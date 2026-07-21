import { useCinemiesStore } from '../../store/useCinemiesStore'
import { MOOD_CONFIG } from '../../data/moodConfig'

export default function MoodPill() {
  const { currentMood } = useCinemiesStore()
  const cfg = MOOD_CONFIG[currentMood]

  return (
    <div className="mood-pill">
      <span className="mood-pill-icon">{cfg?.icon}</span>
      <span>{cfg?.label}</span>
    </div>
  )
}
