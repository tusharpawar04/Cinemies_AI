"""
Serendipity Tracker
Tracks and optimizes serendipitous recommendations that surprise users positively.
"""

import numpy as np
from typing import Dict, List
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class SerendipityTracker:
    """
    Tracks serendipity injection and success rates.
    Dynamically adjusts injection rate based on user engagement.
    """
    
    def __init__(self):
        self.serendipity_stats = {
            'total_injected': 0,
            'total_clicked': 0,
            'success_rate': 0.0,
            'injection_rate': 0.1,  # Start with 1 per 10 recommendations
        }
        self.user_serendipity = {}  # user_id -> stats
    
    def identify_serendipity_candidates(
        self,
        candidates: List[Dict],
        user_top_genres: List[str] = None
    ) -> List[Dict]:
        """
        Identify movies suitable for serendipitous recommendations.
        
        Criteria:
        - Match score between 0.5 and 0.65 (medium relevance)
        - High critical rating (vote_average > 8.0)
        - Outside user's typical genres (if known)
        
        Args:
            candidates: List of movie candidates with scores
            user_top_genres: User's top 3 genres
        
        Returns:
            List of serendipity candidates
        """
        serendipity_pool = []
        
        for cand in candidates:
            score = cand.get('score', 0)
            vote_avg = cand['movie'].get('vote_average', 0)
            movie_genres = set(g.lower() for g in cand['movie'].get('genres', []))
            
            # Check score range
            if not (0.5 <= score <= 0.65):
                continue
            
            # Check critical rating
            if vote_avg < 8.0:
                continue
            
            # Check genre deviation if user preferences known
            if user_top_genres:
                user_genre_set = set(g.lower() for g in user_top_genres)
                overlap = len(movie_genres.intersection(user_genre_set))
                
                # Prefer movies with minimal genre overlap
                if overlap > 1:  # Too similar to user's taste
                    continue
            
            serendipity_pool.append(cand)
        
        return serendipity_pool
    
    def inject_serendipity(
        self,
        selected: List[Dict],
        all_candidates: List[Dict],
        user_top_genres: List[str] = None
    ) -> List[Dict]:
        """
        Inject serendipitous recommendations into the result list.
        
        Args:
            selected: Current selected recommendations
            all_candidates: All available candidates
            user_top_genres: User's top genres
        
        Returns:
            Updated list with serendipity injections
        """
        if len(selected) < 10:
            return selected
        
        # Determine injection count based on success rate
        injection_count = self._calculate_injection_count(len(selected))
        
        if injection_count == 0:
            return selected
        
        # Get serendipity candidates
        serendipity_pool = self.identify_serendipity_candidates(
            all_candidates,
            user_top_genres
        )
        
        if not serendipity_pool:
            logger.info("No serendipity candidates available")
            return selected
        
        # Sort by vote_average descending
        serendipity_pool.sort(
            key=lambda x: x['movie'].get('vote_average', 0),
            reverse=True
        )
        
        # Inject at strategic positions (not at top, not at bottom)
        result = selected.copy()
        injected = 0
        
        for i, serendipity_movie in enumerate(serendipity_pool[:injection_count]):
            # Inject at positions 6, 8, etc. (lower but visible)
            position = 5 + (i * 2)
            if position < len(result):
                result[position] = serendipity_movie
                result[position]['reason'] = "A hidden gem you might not expect"
                result[position]['is_serendipity'] = True
                injected += 1
        
        self.serendipity_stats['total_injected'] += injected
        
        logger.info(f"Injected {injected} serendipity recommendations")
        
        return result
    
    def track_click(self, movie_data: Dict, user_id: str = None):
        """
        Track when a serendipitous recommendation is clicked.
        
        Args:
            movie_data: Movie data with is_serendipity flag
            user_id: Optional user ID for per-user tracking
        """
        if not movie_data.get('is_serendipity'):
            return
        
        self.serendipity_stats['total_clicked'] += 1
        
        # Update success rate
        if self.serendipity_stats['total_injected'] > 0:
            self.serendipity_stats['success_rate'] = (
                self.serendipity_stats['total_clicked'] / 
                self.serendipity_stats['total_injected']
            )
        
        # Adjust injection rate based on success
        self._adjust_injection_rate()
        
        # Track per-user if provided
        if user_id:
            if user_id not in self.user_serendipity:
                self.user_serendipity[user_id] = {
                    'injected': 0,
                    'clicked': 0,
                    'success_rate': 0.0
                }
            
            self.user_serendipity[user_id]['clicked'] += 1
            
            if self.user_serendipity[user_id]['injected'] > 0:
                self.user_serendipity[user_id]['success_rate'] = (
                    self.user_serendipity[user_id]['clicked'] /
                    self.user_serendipity[user_id]['injected']
                )
        
        logger.info(
            f"Serendipity click tracked. Success rate: "
            f"{self.serendipity_stats['success_rate']:.3f}"
        )
    
    def _calculate_injection_count(self, total_recommendations: int) -> int:
        """
        Calculate how many serendipity movies to inject.
        
        Args:
            total_recommendations: Total number of recommendations
        
        Returns:
            Number of serendipity movies to inject
        """
        injection_rate = self.serendipity_stats['injection_rate']
        count = int(total_recommendations * injection_rate)
        return max(0, min(count, 3))  # Cap at 3 max
    
    def _adjust_injection_rate(self):
        """
        Dynamically adjust injection rate based on success rate.
        
        If success > 0.2: increase rate (users like surprises)
        If success < 0.1: decrease rate (users prefer safe choices)
        """
        success_rate = self.serendipity_stats['success_rate']
        current_rate = self.serendipity_stats['injection_rate']
        
        # Need minimum sample size
        if self.serendipity_stats['total_injected'] < 20:
            return
        
        if success_rate > 0.2 and current_rate < 0.3:
            # Increase injection rate
            new_rate = min(current_rate + 0.05, 0.3)
            self.serendipity_stats['injection_rate'] = new_rate
            logger.info(
                f"Increased serendipity injection rate: "
                f"{current_rate:.2f} → {new_rate:.2f}"
            )
        
        elif success_rate < 0.1 and current_rate > 0.05:
            # Decrease injection rate
            new_rate = max(current_rate - 0.05, 0.05)
            self.serendipity_stats['injection_rate'] = new_rate
            logger.info(
                f"Decreased serendipity injection rate: "
                f"{current_rate:.2f} → {new_rate:.2f}"
            )
    
    def get_stats(self) -> Dict:
        """Get current serendipity statistics."""
        return {
            **self.serendipity_stats,
            'total_users_tracked': len(self.user_serendipity),
        }
    
    def get_user_stats(self, user_id: str) -> Dict:
        """Get serendipity stats for a specific user."""
        return self.user_serendipity.get(user_id, {
            'injected': 0,
            'clicked': 0,
            'success_rate': 0.0
        })


# Global instance
serendipity_tracker = SerendipityTracker()
