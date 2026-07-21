"""
Personalized Mood Vector System.

Creates genre-aware personalized mood vectors by blending base mood vectors
with user genre preferences extracted from their taste vector.

Algorithm:
    Personalized_Mood = 0.7 * Base_Mood + 0.3 * Genre_Vector
    Genre_Vector = weighted_mean(genre_description_embeddings[top_3_genres])
"""

import numpy as np
import logging
from typing import List, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

# Genre descriptions for embedding generation
GENRE_DESCRIPTIONS = {
    "action": "Explosive action sequences, intense fights, car chases, martial arts combat, heroic battles and adrenaline-pumping stunts",
    "adventure": "Epic journeys, exploration of unknown lands, treasure hunts, daring quests and heroic expeditions",
    "animation": "Animated storytelling, colorful visuals, creative worlds, family-friendly characters and imaginative narratives",
    "comedy": "Hilarious situations, witty dialogue, slapstick humor, comedic timing and laugh-out-loud moments",
    "crime": "Criminal underworld, heists, detective investigations, organized crime, moral ambiguity and justice",
    "documentary": "Real-world stories, factual narratives, investigative journalism, social issues and historical events",
    "drama": "Deep emotional storytelling, complex characters, human relationships, personal struggles and life-changing moments",
    "family": "Heartwarming family stories, wholesome values, intergenerational bonds and life lessons",
    "fantasy": "Magical worlds, mythical creatures, supernatural powers, epic quests and enchanted realms",
    "history": "Historical events, period dramas, biographical stories, wars and political upheavals",
    "horror": "Terrifying suspense, supernatural threats, psychological dread, jump scares and dark atmosphere",
    "music": "Musical performances, the power of song, artist biographies, concerts and the music industry",
    "mystery": "Puzzling clues, whodunit investigations, plot twists, enigmatic characters and hidden secrets",
    "romance": "Love stories, passionate relationships, heartbreak, romantic chemistry and emotional connections",
    "science fiction": "Futuristic technology, space exploration, artificial intelligence, dystopian societies and scientific discovery",
    "sci-fi": "Futuristic technology, space exploration, artificial intelligence, dystopian societies and scientific discovery",
    "thriller": "Edge-of-seat suspense, psychological tension, conspiracies, high-stakes danger and plot twists",
    "tv movie": "Television movie productions, made-for-TV dramas and special event broadcasts",
    "war": "Military conflicts, battlefield heroism, the horrors of war, soldier camaraderie and wartime sacrifice",
    "western": "Wild west frontier, cowboys, outlaws, showdowns, frontier justice and rugged landscapes",
}


class PersonalizedMoodSystem:
    """
    Generates personalized mood vectors based on user genre preferences.
    
    Given a user's taste vector and their top genres, creates a personalized
    mood vector that biases recommendations toward their preferred genres
    while maintaining the mood's core semantic meaning.
    """
    
    def __init__(self, embedding_service, mood_system):
        """
        Initialize with embedding and mood services.
        
        Args:
            embedding_service: EmbeddingService instance for generating genre embeddings
            mood_system: MoodVectorSystem instance for base mood vectors
        """
        self.embedding_service = embedding_service
        self.mood_system = mood_system
        self._genre_vector_cache: Dict[str, np.ndarray] = {}
        self._personalized_cache: Dict[str, np.ndarray] = {}
        
        # Pre-compute genre vectors
        self._precompute_genre_vectors()
    
    def _precompute_genre_vectors(self):
        """Pre-compute embedding vectors for all known genres."""
        logger.info("Pre-computing genre vectors...")
        for genre_name, description in GENRE_DESCRIPTIONS.items():
            try:
                vector = self.embedding_service.model.encode(description)
                vector = vector / np.linalg.norm(vector)
                self._genre_vector_cache[genre_name.lower()] = vector
            except Exception as e:
                logger.error(f"Failed to compute genre vector for '{genre_name}': {e}")
        
        logger.info(f"Pre-computed {len(self._genre_vector_cache)} genre vectors")
    
    def get_genre_vector(self, genre_name: str) -> Optional[np.ndarray]:
        """
        Get the embedding vector for a genre.
        
        Args:
            genre_name: Genre name (case-insensitive)
            
        Returns:
            Normalized genre embedding vector, or None if genre not found
        """
        key = genre_name.lower().strip()
        
        if key in self._genre_vector_cache:
            return self._genre_vector_cache[key]
        
        # Try to generate on-the-fly for unknown genres
        description = GENRE_DESCRIPTIONS.get(key)
        if description:
            vector = self.embedding_service.model.encode(description)
            vector = vector / np.linalg.norm(vector)
            self._genre_vector_cache[key] = vector
            return vector
        
        # Generate from genre name itself as fallback
        try:
            fallback_desc = f"Movies in the {genre_name} genre with typical {genre_name} themes and storytelling"
            vector = self.embedding_service.model.encode(fallback_desc)
            vector = vector / np.linalg.norm(vector)
            self._genre_vector_cache[key] = vector
            logger.info(f"Generated fallback genre vector for '{genre_name}'")
            return vector
        except Exception as e:
            logger.error(f"Failed to generate genre vector for '{genre_name}': {e}")
            return None
    
    def extract_top_genres(
        self,
        taste_vector: np.ndarray,
        n: int = 3
    ) -> List[Tuple[str, float]]:
        """
        Extract top N genres from a taste vector by computing similarity
        against all genre vectors.
        
        Args:
            taste_vector: User's 384-dim taste vector
            n: Number of top genres to return
            
        Returns:
            List of (genre_name, similarity_score) tuples, sorted by score desc
        """
        if len(self._genre_vector_cache) == 0:
            return []
        
        similarities = []
        for genre_name, genre_vector in self._genre_vector_cache.items():
            sim = float(np.dot(taste_vector, genre_vector))
            similarities.append((genre_name, sim))
        
        # Sort by similarity descending
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return similarities[:n]
    
    def compute_genre_blend_vector(
        self,
        top_genres: List[str],
        weights: Optional[List[float]] = None
    ) -> Optional[np.ndarray]:
        """
        Compute a weighted blend of genre vectors.
        
        Args:
            top_genres: List of genre names
            weights: Optional weights for each genre (default: equal weights)
            
        Returns:
            Normalized blended genre vector
        """
        if not top_genres:
            return None
        
        vectors = []
        valid_weights = []
        
        for i, genre in enumerate(top_genres):
            vec = self.get_genre_vector(genre)
            if vec is not None:
                vectors.append(vec)
                valid_weights.append(weights[i] if weights and i < len(weights) else 1.0)
        
        if not vectors:
            return None
        
        # Normalize weights
        total_weight = sum(valid_weights)
        if total_weight > 0:
            valid_weights = [w / total_weight for w in valid_weights]
        
        # Weighted mean
        blended = np.zeros_like(vectors[0])
        for vec, weight in zip(vectors, valid_weights):
            blended += weight * vec
        
        # Normalize
        norm = np.linalg.norm(blended)
        if norm > 0:
            blended = blended / norm
        
        return blended
    
    def get_personalized_mood(
        self,
        mood: str,
        user_top_genres: List[str],
        mood_weight: float = 0.7,
        genre_weight: float = 0.3
    ) -> Optional[np.ndarray]:
        """
        Create a personalized mood vector by blending base mood with user genres.
        
        Formula: Personalized_Mood = 0.7 * Base_Mood + 0.3 * Genre_Vector
        
        Args:
            mood: Mood name (e.g., 'mind_bending')
            user_top_genres: User's top genre names
            mood_weight: Weight for base mood (default 0.7)
            genre_weight: Weight for genre blend (default 0.3)
            
        Returns:
            Personalized mood vector, or base mood vector if genres unavailable
        """
        # Check cache
        cache_key = f"{mood}:{'_'.join(sorted(g.lower() for g in user_top_genres))}"
        if cache_key in self._personalized_cache:
            return self._personalized_cache[cache_key]
        
        # Get base mood vector
        base_mood = self.mood_system.get_mood_vector(mood)
        if base_mood is None:
            logger.error(f"Base mood vector not found for '{mood}'")
            return None
        
        # Get genre blend vector
        genre_vector = self.compute_genre_blend_vector(user_top_genres)
        if genre_vector is None:
            logger.info(f"No genre vectors available, using base mood for '{mood}'")
            return base_mood
        
        # Blend: 70% mood + 30% genre
        personalized = mood_weight * base_mood + genre_weight * genre_vector
        
        # Normalize
        norm = np.linalg.norm(personalized)
        if norm > 0:
            personalized = personalized / norm
        
        # Cache result
        self._personalized_cache[cache_key] = personalized
        
        logger.info(
            f"Personalized mood vector for '{mood}' with genres {user_top_genres}: "
            f"mood_weight={mood_weight}, genre_weight={genre_weight}"
        )
        
        return personalized
    
    def clear_cache(self):
        """Clear the personalized mood vector cache."""
        self._personalized_cache.clear()
        logger.info("Personalized mood cache cleared")
