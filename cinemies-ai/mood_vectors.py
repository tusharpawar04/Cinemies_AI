"""Mood vector system for thematic movie recommendations."""

import logging
from typing import Optional, List, Dict
import numpy as np
from embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class MoodVectorSystem:
    """Manages predefined mood vectors."""
    
    MOOD_DESCRIPTIONS: Dict[str, str] = {
        "mind_bending": (
            "Complex psychological thriller with intricate plot twists, non-linear narrative structure, "
            "reality-bending concepts, philosophical themes, unreliable narrators, layered storytelling, "
            "mind games, perception-challenging mysteries, cerebral puzzles, and thought-provoking endings. "
            "Films like Inception, Memento, Shutter Island, The Prestige, Predestination, Andhadhun, "
            "Mulholland Drive, Primer, Triangle, Coherence, The Sixth Sense, Fight Club, Black Swan."
        ),
        "comfort_food": (
            "Heartwarming feel-good movie with happy ending, uplifting themes, cozy atmosphere, "
            "wholesome characters, family-friendly content, nostalgic vibes, gentle humor, "
            "romantic warmth, emotional satisfaction, and positive messages. "
            "Films like Forrest Gump, The Notebook, Amélie, Paddington, Chef, Little Miss Sunshine, "
            "Dilwale Dulhania Le Jayenge, Zindagi Na Milegi Dobara, The Grand Budapest Hotel, "
            "About Time, The Intouchables, Sing Street, Brooklyn."
        ),
        "visual_spectacle": (
            "Stunning cinematography with breathtaking visuals, epic scale production, masterful use of "
            "color and composition, groundbreaking visual effects, immersive world-building, "
            "grand action sequences, beautiful landscapes, artistic framing, and cinematic excellence. "
            "Films like Avatar, Blade Runner 2049, Interstellar, The Revenant, Mad Max Fury Road, "
            "Life of Pi, Gravity, Dune, 1917, Baahubali, RRR, The Fall, Hero, Samsara."
        ),
        "cathartic_cry": (
            "Emotional drama that evokes deep feelings, touching story of love or loss, "
            "powerful performances, heartbreaking moments, themes of sacrifice, grief, redemption, "
            "moving narrative, tearjerker scenes, and profound emotional impact. "
            "Films like Schindler's List, The Green Mile, A Star Is Born, Manchester by the Sea, "
            "Grave of the Fireflies, The Fault in Our Stars, Marley & Me, Hachi, "
            "Taare Zameen Par, Kal Ho Naa Ho, My Sister's Keeper, The Pursuit of Happyness."
        ),
        "hidden_gem": (
            "Underrated indie film with unique storytelling, original artistic voice, "
            "unconventional narrative structure, creative vision, lesser-known but critically acclaimed, "
            "low-budget high-quality, festival favorites, cult classics, and undiscovered masterpieces. "
            "Films like Moon, The Man from Earth, Coherence, Primer, Hunt for the Wilderpeople, "
            "Short Term 12, The Fall, Waking Life, Timecrimes, Triangle, The Invitation, "
            "Tumbbad, Ship of Theseus, Court, Masaan, Lunchbox."
        ),
        "laugh_out_loud": (
            "Hilarious comedy with great humor, witty dialogue, perfect comedic timing, "
            "funny situations, slapstick moments, clever jokes, satirical elements, "
            "entertaining performances, absurd scenarios, and laugh-out-loud moments. "
            "Films like The Grand Budapest Hotel, Superbad, Bridesmaids, The Hangover, "
            "Monty Python and the Holy Grail, Airplane!, Dumb and Dumber, "
            "3 Idiots, Hera Pheri, Andaz Apna Apna, PK, Munna Bhai MBBS, Golmaal."
        ),
        "edge_of_seat": (
            "Intense suspenseful thriller with high stakes, gripping tension, fast-paced action, "
            "nail-biting moments, adrenaline-pumping excitement, unpredictable twists, "
            "dangerous situations, race against time, and heart-pounding sequences. "
            "Films like The Dark Knight, No Country for Old Men, Prisoners, Gone Girl, "
            "The Silence of the Lambs, Se7en, Zodiac, Nightcrawler, Sicario, "
            "Drishyam, Kahaani, A Wednesday, Special 26, Baby, Talaash."
        ),
        "feel_inspired": (
            "Uplifting motivational story of triumph over adversity, overcoming obstacles, "
            "personal growth journey, inspiring characters, themes of perseverance, "
            "achievement against odds, determination, hope, courage, and life-changing transformation. "
            "Films like The Pursuit of Happyness, Rocky, The Shawshank Redemption, "
            "Good Will Hunting, Dead Poets Society, Whiplash, Hidden Figures, "
            "Dangal, Chak De India, Bhaag Milkha Bhaag, Mary Kom, Hichki, Super 30."
        )
    }
    
    def __init__(self, embedding_service: EmbeddingService):
        """
        Initialize mood vectors using embedding service.
        
        Args:
            embedding_service: EmbeddingService instance for generating embeddings
        """
        self.embedding_service = embedding_service
        self.mood_vectors: Dict[str, np.ndarray] = {}
        
        # Generate normalized mood vectors from descriptions
        for mood_name, description in self.MOOD_DESCRIPTIONS.items():
            mood_vector = self.embedding_service.generate_embedding(description)
            self.mood_vectors[mood_name] = mood_vector
    
    def get_mood_vector(self, mood_name: str) -> Optional[np.ndarray]:
        """
        Retrieve mood vector by name.
        
        Args:
            mood_name: One of the 8 defined mood names
            
        Returns:
            Normalized mood vector or None if invalid mood
        """
        return self.mood_vectors.get(mood_name)
    
    def get_available_moods(self) -> List[str]:
        """Return list of valid mood names."""
        return list(self.MOOD_DESCRIPTIONS.keys())

    def get_genre_vector(self, genre_name: str) -> Optional[np.ndarray]:
        """
        Get or generate an embedding vector for a movie genre.
        
        Generates a semantic embedding from a descriptive genre text
        and caches it for reuse.
        
        Args:
            genre_name: Genre name (e.g., 'Action', 'Sci-Fi')
            
        Returns:
            Normalized genre embedding vector, or None on failure
        """
        if not hasattr(self, '_genre_cache'):
            self._genre_cache: Dict[str, np.ndarray] = {}
        
        key = genre_name.lower().strip()
        if key in self._genre_cache:
            return self._genre_cache[key]
        
        # Generate from descriptive text
        description = f"Movies in the {genre_name} genre featuring typical {genre_name} themes, storytelling, and cinematic style"
        try:
            vector = self.embedding_service.generate_embedding(description)
            self._genre_cache[key] = vector
            logger.info(f"Generated genre vector for '{genre_name}'")
            return vector
        except Exception as e:
            logger.error(f"Failed to generate genre vector for '{genre_name}': {e}")
            return None
