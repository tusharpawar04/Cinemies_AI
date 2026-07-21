"""
Cold-Start Movie Booster
Boosts newly added movies with low interaction counts to help them get discovered.
"""

import numpy as np
from typing import Dict, List
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class ColdStartBooster:
    """
    Manages cold-start movie boosting and tracks their performance.
    """
    
    def __init__(self):
        self.cold_start_threshold = 5  # Movies with < 5 interactions
        self.boost_factor = 1.15  # 15% boost
        self.injection_rate = 0.1  # 1 per 10 recommendations
        self.movie_interactions = {}  # tmdb_id -> interaction_count
        self.cold_start_ctr = {
            'shown': 0,
            'clicked': 0,
            'ctr': 0.0,
        }
    
    def is_cold_start(self, movie_id: int) -> bool:
        """
        Check if a movie is in cold-start phase.
        
        Args:
            movie_id: TMDB movie ID
        
        Returns:
            True if movie has < threshold interactions
        """
        interaction_count = self.movie_interactions.get(str(movie_id), 0)
        return interaction_count < self.cold_start_threshold
    
    def apply_boost(
        self,
        candidates: List[Dict],
        user_top_genres: List[str] = None
    ) -> List[Dict]:
        """
        Apply cold-start boost to eligible movies.
        
        Boost movies that:
        - Have < 5 interactions (cold-start)
        - Match user's preferred genres (if known)
        
        Args:
            candidates: List of movie candidates
            user_top_genres: User's top genres for genre matching
        
        Returns:
            Updated candidates with boosts applied
        """
        boosted_count = 0
        
        for cand in candidates:
            movie_id = cand['movie'].get('tmdb_id')
            if not movie_id:
                continue
            
            # Check if cold-start
            if not self.is_cold_start(movie_id):
                continue
            
            # Check genre match if user preferences known
            if user_top_genres:
                movie_genres = set(
                    g.lower() for g in cand['movie'].get('genres', [])
                )
                user_genre_set = set(g.lower() for g in user_top_genres)
                
                # Only boost if there's genre overlap
                if not movie_genres.intersection(user_genre_set):
                    continue
            
            # Apply boost
            original_score = cand['score']
            cand['score'] = original_score * self.boost_factor
            cand['is_cold_start'] = True
            boosted_count += 1
        
        if boosted_count > 0:
            logger.info(f"Applied cold-start boost to {boosted_count} movies")
        
        return candidates
    
    def inject_cold_start(
        self,
        selected: List[Dict],
        all_candidates: List[Dict],
        user_top_genres: List[str] = None
    ) -> List[Dict]:
        """
        Inject cold-start movies into recommendations.
        
        Args:
            selected: Current selected recommendations
            all_candidates: All available candidates
            user_top_genres: User's top genres
        
        Returns:
            Updated list with cold-start injection
        """
        if len(selected) < 10:
            return selected
        
        # Find cold-start candidates
        cold_start_pool = []
        for cand in all_candidates:
            if cand in selected:
                continue
            
            movie_id = cand['movie'].get('tmdb_id')
            if not movie_id or not self.is_cold_start(movie_id):
                continue
            
            # Check reasonable match score (> 0.6)
            if cand.get('score', 0) < 0.6:
                continue
            
            # Genre match if preferences known
            if user_top_genres:
                movie_genres = set(
                    g.lower() for g in cand['movie'].get('genres', [])
                )
                user_genre_set = set(g.lower() for g in user_top_genres)
                
                if movie_genres.intersection(user_genre_set):
                    cold_start_pool.append(cand)
            else:
                cold_start_pool.append(cand)
        
        if not cold_start_pool:
            return selected
        
        # Sort by score descending
        cold_start_pool.sort(key=lambda x: x['score'], reverse=True)
        
        # Inject 1 cold-start movie per 10 recommendations
        injection_count = max(1, int(len(selected) * self.injection_rate))
        
        result = selected.copy()
        injected = 0
        
        for i, cold_movie in enumerate(cold_start_pool[:injection_count]):
            # Inject at position 7 (lower-middle)
            position = 6 + i
            if position < len(result):
                result[position] = cold_movie
                result[position]['is_cold_start'] = True
                result[position]['reason'] = (
                    result[position].get('reason', 'Recommended for you') + 
                    " (New to discover)"
                )
                injected += 1
                
                # Track for CTR
                movie_id = cold_movie['movie'].get('tmdb_id')
                if movie_id:
                    self.cold_start_ctr['shown'] += 1
        
        if injected > 0:
            logger.info(f"Injected {injected} cold-start movies")
        
        return result
    
    def track_interaction(self, movie_id: int, interaction_type: str = 'view'):
        """
        Track an interaction with a movie.
        
        Args:
            movie_id: TMDB movie ID
            interaction_type: 'view', 'click', 'rating'
        """
        movie_key = str(movie_id)
        
        if movie_key not in self.movie_interactions:
            self.movie_interactions[movie_key] = 0
        
        # Weight different interaction types
        weights = {
            'view': 0.5,
            'click': 1.0,
            'rating': 2.0,
        }
        
        weight = weights.get(interaction_type, 1.0)
        self.movie_interactions[movie_key] += weight
        
        # Check if movie graduated from cold-start
        if self.movie_interactions[movie_key] >= self.cold_start_threshold * 2:
            logger.info(
                f"Movie {movie_id} graduated from cold-start phase "
                f"({self.movie_interactions[movie_key]:.1f} interactions)"
            )
    
    def track_cold_start_click(self, movie_id: int):
        """
        Track when a cold-start movie is clicked.
        
        Args:
            movie_id: TMDB movie ID
        """
        if self.is_cold_start(movie_id):
            self.cold_start_ctr['clicked'] += 1
            
            # Update CTR
            if self.cold_start_ctr['shown'] > 0:
                self.cold_start_ctr['ctr'] = (
                    self.cold_start_ctr['clicked'] / 
                    self.cold_start_ctr['shown']
                )
            
            logger.info(
                f"Cold-start click tracked. CTR: {self.cold_start_ctr['ctr']:.3f}"
            )
        
        # Track interaction
        self.track_interaction(movie_id, 'click')
    
    def get_stats(self) -> Dict:
        """Get cold-start boosting statistics."""
        cold_start_count = sum(
            1 for count in self.movie_interactions.values()
            if count < self.cold_start_threshold
        )
        
        return {
            'cold_start_movies': cold_start_count,
            'total_tracked_movies': len(self.movie_interactions),
            'boost_factor': self.boost_factor,
            'injection_rate': self.injection_rate,
            'ctr': self.cold_start_ctr,
        }
    
    def get_movie_status(self, movie_id: int) -> Dict:
        """
        Get cold-start status for a specific movie.
        
        Args:
            movie_id: TMDB movie ID
        
        Returns:
            Dict with status information
        """
        interaction_count = self.movie_interactions.get(str(movie_id), 0)
        is_cold = interaction_count < self.cold_start_threshold
        
        return {
            'movie_id': movie_id,
            'interaction_count': interaction_count,
            'is_cold_start': is_cold,
            'threshold': self.cold_start_threshold,
            'progress': min(interaction_count / self.cold_start_threshold, 1.0),
        }
    
    def load_interaction_counts(self, movie_interactions: Dict[int, int]):
        """
        Load interaction counts from external source (database).
        
        Args:
            movie_interactions: Dict mapping movie_id -> interaction_count
        """
        self.movie_interactions = {
            str(k): v for k, v in movie_interactions.items()
        }
        
        cold_start_count = sum(
            1 for count in self.movie_interactions.values()
            if count < self.cold_start_threshold
        )
        
        logger.info(
            f"Loaded {len(self.movie_interactions)} movie interaction counts. "
            f"{cold_start_count} in cold-start phase."
        )


# Global instance
cold_start_booster = ColdStartBooster()
