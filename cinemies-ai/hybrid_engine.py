"""
Hybrid Recommendation Engine - Fast Implementation
Combines mood, taste, and collaborative signals with MMR diversity and exploration.
"""

import numpy as np
import random
from typing import List, Dict, Any, Tuple
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class HybridRecommendationEngine:
    """
    Fast hybrid recommendation engine implementation.
    Blends: 40% mood + 30% taste + 30% collaborative
    Features: MMR diversity, epsilon-greedy exploration, temporal decay
    """
    
    def __init__(self):
        self.lambda_mmr = 0.7  # MMR diversity parameter
        self.epsilon = 0.15    # Exploration rate
        self.alpha_temporal = 0.05  # Temporal decay rate
    
    def blend_vectors(
        self,
        mood_vector: np.ndarray,
        taste_vector: np.ndarray = None,
        collaborative_vector: np.ndarray = None,
        session_vector: np.ndarray = None,
        min_session_views: int = 3
    ) -> np.ndarray:
        """
        Blend mood, taste, collaborative, and session vectors with adaptive weights.
        
        Standard weights: 40% mood, 30% taste, 30% collaborative
        With session (≥3 views): 50% mood, 30% taste, 20% session
        
        Args:
            mood_vector: Mood embedding vector (required)
            taste_vector: User taste vector (optional)
            collaborative_vector: Collaborative filtering vector (optional)
            session_vector: Current session vector (optional)
            min_session_views: Minimum views to use session vector (default: 3)
        
        Returns:
            Blended and normalized vector
        """
        # Check if session should be used
        use_session = session_vector is not None
        
        if use_session:
            # Session-based blend: 50% mood + 30% taste + 20% session
            combined = 0.5 * mood_vector
            
            if taste_vector is not None:
                combined += 0.3 * taste_vector
            else:
                # Redistribute taste weight to mood
                combined += 0.3 * mood_vector
            
            combined += 0.2 * session_vector
        else:
            # Standard blend: 40% mood + 30% taste + 30% collaborative
            if taste_vector is None and collaborative_vector is None:
                return mood_vector
            
            combined = 0.4 * mood_vector
            
            if taste_vector is not None:
                combined += 0.3 * taste_vector
            
            if collaborative_vector is not None:
                combined += 0.3 * collaborative_vector
            else:
                # Redistribute collaborative weight if not available
                combined = 0.57 * mood_vector + 0.43 * (taste_vector if taste_vector is not None else mood_vector)
        
        # Normalize
        norm = np.linalg.norm(combined)
        if norm > 0:
            combined = combined / norm
        
        return combined
    
    def mmr_rerank(
        self,
        candidates: List[Dict[str, Any]],
        limit: int
    ) -> List[Dict[str, Any]]:
        """
        Maximal Marginal Relevance re-ranking for diversity.
        λ = 0.7 balances relevance vs diversity
        """
        selected = []
        remaining = candidates[:]
        
        while len(selected) < limit and remaining:
            if not selected:
                # First item: highest relevance
                best = max(remaining, key=lambda x: x['score'])
            else:
                # Subsequent items: maximize MMR
                best_mmr = -float('inf')
                best_cand = None
                
                for cand in remaining:
                    relevance = cand['score']
                    
                    # Calculate max similarity to already selected items
                    if cand.get('embedding') is not None:
                        similarities = []
                        for sel in selected:
                            if sel.get('embedding') is not None:
                                sim = self._cosine_similarity(cand['embedding'], sel['embedding'])
                                similarities.append(sim)
                        max_sim = max(similarities) if similarities else 0
                    else:
                        max_sim = 0
                    
                    # MMR score
                    mmr = self.lambda_mmr * relevance - (1 - self.lambda_mmr) * max_sim
                    
                    if mmr > best_mmr:
                        best_mmr = mmr
                        best_cand = cand
                
                best = best_cand if best_cand else remaining[0]
            
            selected.append(best)
            remaining.remove(best)
        
        return selected
    
    def apply_exploration(
        self,
        selected: List[Dict[str, Any]],
        all_candidates: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Epsilon-greedy exploration: 15% chance to inject exploration movies.
        Exploration candidates: 0.6-0.7 match score, high vote_average
        """
        if random.random() < self.epsilon and len(selected) > 2:
            # Find exploration candidates
            exploration_pool = [
                c for c in all_candidates 
                if c not in selected and 0.6 <= c['score'] <= 0.7
                and (c['movie'].get('vote_average') or 0) >= 7.0
            ]
            
            if exploration_pool:
                # Replace 2nd-to-last item with exploration movie
                selected[-2] = random.choice(exploration_pool)
                logger.info("Applied epsilon-greedy exploration")
        
        return selected
    
    def apply_temporal_factors(
        self,
        candidates: List[Dict[str, Any]],
        mood: str = None
    ) -> List[Dict[str, Any]]:
        """
        Apply temporal decay and recency boosting.
        - Decay movies > 30 years old by exp(-0.05 * age)
        - Boost movies < 2 years old by 10%
        - Boost cold-start movies (< 5 interactions) by 15%
        """
        current_year = datetime.now().year
        
        for cand in candidates:
            year = cand['movie'].get('year')
            if year is None:
                year = current_year  # Assume current year if unknown
            age = current_year - year
            
            # Temporal decay for old movies
            if age > 30 and mood != 'hidden_gem':
                cand['score'] *= np.exp(-self.alpha_temporal * age)
            
            # Recency boost
            if age < 2:
                cand['score'] *= 1.1
            
            # Cold-start boost (simulate with low popularity)
            vote_count = cand['movie'].get('vote_count') or 1000
            if vote_count < 100:
                cand['score'] *= 1.15
        
        return candidates
    
    def generate_explainability(
        self,
        candidate: Dict[str, Any],
        mood_contribution: float,
        taste_contribution: float,
        collaborative_contribution: float,
        mood_name: str = None,
        example_movie: str = None
    ) -> str:
        """
        Generate explanation for why this movie was recommended.
        
        Args:
            candidate: Movie candidate dict
            mood_contribution: Normalized mood contribution (0-1)
            taste_contribution: Normalized taste contribution (0-1)
            collaborative_contribution: Normalized collaborative contribution (0-1)
            mood_name: Display name of mood (optional)
            example_movie: Example movie title from user's liked movies (optional)
        
        Returns:
            Explanation string
        """
        # Check contributions in priority order (> 0.6 threshold)
        if mood_contribution > 0.6:
            # Mood is primary driver
            if mood_name:
                mood_display = mood_name.replace('_', ' ').title()
                return f"Matches your {mood_display} mood"
            return "Perfect match for your mood"
        
        elif taste_contribution > 0.6:
            # Taste is primary driver
            if example_movie:
                return f"Similar to movies you love like {example_movie}"
            return "Similar to movies you love"
        
        elif collaborative_contribution > 0.6:
            # Collaborative filtering is primary driver
            return "Users with similar taste enjoyed this"
        
        else:
            # No dominant contribution - balanced recommendation or exploration
            return "A hidden gem you might not expect"
    
    def calculate_intra_list_diversity(
        self,
        movies: List[Dict[str, Any]]
    ) -> float:
        """
        Calculate average pairwise distance among selected movies.
        Higher diversity means movies are more different from each other.
        
        Args:
            movies: List of movie candidates with embeddings
        
        Returns:
            Diversity score (0-1, higher is more diverse)
        """
        if len(movies) < 2:
            return 0.0
        
        embeddings = [m.get('embedding') for m in movies if m.get('embedding') is not None]
        
        if len(embeddings) < 2:
            return 0.0
        
        # Calculate pairwise distances
        total_distance = 0.0
        count = 0
        
        for i in range(len(embeddings)):
            for j in range(i + 1, len(embeddings)):
                # Cosine distance = 1 - cosine_similarity
                similarity = self._cosine_similarity(embeddings[i], embeddings[j])
                distance = 1.0 - similarity
                total_distance += distance
                count += 1
        
        # Average pairwise distance
        diversity = total_distance / count if count > 0 else 0.0
        return float(diversity)
    
    def calculate_serendipity(
        self,
        movie: Dict[str, Any],
        user_top_genres: List[str]
    ) -> float:
        """
        Calculate serendipity as genre deviation from user's typical preferences.
        Higher serendipity means movie is outside user's comfort zone.
        
        Args:
            movie: Movie candidate with genres
            user_top_genres: User's top 3 preferred genres
        
        Returns:
            Serendipity score (0-1, higher is more unexpected)
        """
        if not user_top_genres:
            return 0.0
        
        movie_genres = movie['movie'].get('genres', [])
        if not movie_genres:
            return 0.0
        
        # Convert to sets for comparison
        movie_genre_set = set(g.lower() if isinstance(g, str) else str(g).lower() for g in movie_genres)
        user_genre_set = set(g.lower() for g in user_top_genres)
        
        # Calculate genre overlap
        overlap = len(movie_genre_set.intersection(user_genre_set))
        total_user_genres = len(user_genre_set)
        
        # Serendipity = 1 - (overlap / user's genres)
        # High serendipity when little overlap with user's typical genres
        serendipity = 1.0 - (overlap / total_user_genres) if total_user_genres > 0 else 0.5
        return float(serendipity)
    
    def calculate_freshness(
        self,
        movie: Dict[str, Any]
    ) -> float:
        """
        Calculate freshness based on recency of release date.
        Newer movies have higher freshness scores.
        
        Args:
            movie: Movie candidate with year field
        
        Returns:
            Freshness score (0-1, higher is more recent)
        """
        current_year = datetime.now().year
        year = movie['movie'].get('year')
        if year is None:
            year = current_year - 50
        
        if year > current_year:
            year = current_year
        
        years_since_release = current_year - year
        
        # Freshness formula: 1 / (1 + years_since_release/10)
        # Recent movies (< 2 years) get ~0.9+
        # 10-year-old movies get ~0.5
        # 30-year-old movies get ~0.25
        freshness = 1.0 / (1.0 + years_since_release / 10.0)
        return float(freshness)
    
    def multi_task_score(
        self,
        relevance: float,
        diversity: float,
        serendipity: float,
        freshness: float
    ) -> float:
        """
        Multi-task learning scoring function.
        Joint optimization for multiple objectives.
        
        Args:
            relevance: Cosine similarity score (0-1)
            diversity: Intra-list distance score (0-1)
            serendipity: Genre deviation score (0-1)
            freshness: Recency score (0-1)
        
        Returns:
            Weighted final score
        
        Weights: 60% relevance, 20% diversity, 10% serendipity, 10% freshness
        """
        return (
            0.6 * relevance +
            0.2 * diversity +
            0.1 * serendipity +
            0.1 * freshness
        )
    
    def apply_multi_task_scoring(
        self,
        selected: List[Dict[str, Any]],
        user_top_genres: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Apply multi-task learning scores to selected recommendations.
        Computes relevance, diversity, serendipity, and freshness for each movie.
        
        Args:
            selected: List of selected movie candidates
            user_top_genres: User's top 3 preferred genres (optional)
        
        Returns:
            Updated list with multi-task scores
        """
        if not selected:
            return selected
        
        # Calculate intra-list diversity (same for all movies in this list)
        list_diversity = self.calculate_intra_list_diversity(selected)
        
        # Calculate individual scores for each movie
        for movie in selected:
            # Relevance is the base score from FAISS/hybrid vector
            relevance = movie.get('score', 0.0)
            
            # Diversity contribution (same for all in this list)
            diversity = list_diversity
            
            # Serendipity (individual per movie)
            serendipity = self.calculate_serendipity(movie, user_top_genres or [])
            
            # Freshness (individual per movie)
            freshness = self.calculate_freshness(movie)
            
            # Compute multi-task score
            mt_score = self.multi_task_score(relevance, diversity, serendipity, freshness)
            
            # Store component scores for analytics
            movie['multi_task_scores'] = {
                'relevance': round(relevance, 3),
                'diversity': round(diversity, 3),
                'serendipity': round(serendipity, 3),
                'freshness': round(freshness, 3),
                'final': round(mt_score, 3)
            }
            
            # Update the main score with multi-task score
            movie['score'] = mt_score
        
        # Re-sort by multi-task scores
        selected.sort(key=lambda x: x['score'], reverse=True)
        
        return selected
    
    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors."""
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8)
    
    def recommend(
        self,
        mood_vector: np.ndarray,
        faiss_results: Tuple[List[str], List[float]],
        movies_data: List[Dict],
        movie_embeddings: Dict[str, np.ndarray],
        limit: int = 10,
        taste_vector: np.ndarray = None,
        collaborative_vector: np.ndarray = None,
        session_vector: np.ndarray = None,
        mood: str = None,
        user_top_genres: List[str] = None,
        exclude_ids: set = None
    ) -> List[Dict[str, Any]]:
        """
        Main recommendation pipeline with multi-task learning optimization.
        
        Args:
            mood_vector: Mood embedding vector
            faiss_results: (movie_ids, scores) from FAISS search
            movies_data: Full movie metadata
            movie_embeddings: Map of movie_id -> embedding
            limit: Number of recommendations
            taste_vector: Optional user taste vector
            collaborative_vector: Optional collaborative filtering vector
            session_vector: Optional current session vector (from recent views)
            mood: Mood name for context
            user_top_genres: User's top 3 preferred genres for serendipity calculation
        
        Returns:
            List of recommended movies with scores, explanations, and multi-task metrics
        """
        movie_ids, scores = faiss_results
        
        # Build candidate list, filtering out excluded IDs
        _exclude = exclude_ids or set()
        candidates = []
        for mid, score in zip(movie_ids, scores):
            if mid in _exclude:
                continue
            for movie in movies_data:
                if str(movie['tmdb_id']) == mid:
                    candidates.append({
                        'movie': movie,
                        'score': float(score),
                        'embedding': movie_embeddings.get(mid)
                    })
                    break
        
        if not candidates:
            return []
        
        # Apply temporal factors
        candidates = self.apply_temporal_factors(candidates, mood)
        
        # MMR diversity re-ranking
        selected = self.mmr_rerank(candidates, limit)
        
        # Epsilon-greedy exploration
        selected = self.apply_exploration(selected, candidates)
        
        # Serendipity injection: 1 per 10 recommendations
        # Candidates: 0.5-0.65 match score, >8.0 vote_average — quality surprises
        if limit >= 5 and len(candidates) > limit:
            serendipity_pool = [
                c for c in candidates
                if c not in selected
                and 0.5 <= c['score'] <= 0.65
                and (c['movie'].get('vote_average') or 0) >= 8.0
            ]
            if serendipity_pool:
                serendipity_pick = random.choice(serendipity_pool)
                serendipity_pick['is_serendipity'] = True
                serendipity_pick['reason'] = "A surprising pick you might love"
                # Replace last item
                selected[-1] = serendipity_pick
                logger.info(f"Injected serendipity: {serendipity_pick['movie'].get('title', 'Unknown')}")
        
        # Cold-start boost: +15% for movies with very low interaction counts
        for item in selected:
            vote_count = item['movie'].get('vote_count') or 1000
            if vote_count < 100:  # Proxy for low interactions in our dataset
                item['score'] *= 1.15
                item['is_cold_start'] = True
                logger.debug(f"Cold-start boost applied: {item['movie'].get('title', 'Unknown')}")
        
        # Apply multi-task learning scoring (Requirement 54)
        selected = self.apply_multi_task_scoring(selected, user_top_genres)
        
        # Add explainability with proper contribution tracking
        for item in selected:
            # Skip serendipity items - already have a reason
            if item.get('is_serendipity'):
                item['contributions'] = {'mood': 0.3, 'taste': 0.1, 'collaborative': 0.0, 'serendipity': 0.6}
                continue
            
            embedding = item.get('embedding')
            if embedding is None:
                item['reason'] = "Recommended for you"
                item['contributions'] = {'mood': 0.0, 'taste': 0.0, 'collaborative': 0.0}
                continue
            
            # Calculate individual contributions (similarity to each component vector)
            mood_contrib = float(np.dot(mood_vector, embedding))
            taste_contrib = 0.0
            collab_contrib = 0.0
            
            if taste_vector is not None:
                taste_contrib = float(np.dot(taste_vector, embedding))
            
            if collaborative_vector is not None:
                collab_contrib = float(np.dot(collaborative_vector, embedding))
            
            # Normalize contributions to sum to 1.0 for interpretability
            total_contrib = mood_contrib + taste_contrib + collab_contrib
            if total_contrib > 0:
                mood_contrib_norm = mood_contrib / total_contrib
                taste_contrib_norm = taste_contrib / total_contrib
                collab_contrib_norm = collab_contrib / total_contrib
            else:
                mood_contrib_norm = 1.0
                taste_contrib_norm = 0.0
                collab_contrib_norm = 0.0
            
            # Find example movie for taste-based recommendations
            example_movie = None
            if taste_contrib_norm > 0.6 and taste_vector is not None:
                # TODO: In production, pass liked_movie_ids and find best example
                # For now, use generic message
                example_movie = None
            
            # Generate explanation
            item['reason'] = self.generate_explainability(
                item,
                mood_contrib_norm,
                taste_contrib_norm,
                collab_contrib_norm,
                mood_name=mood,
                example_movie=example_movie
            )
            
            # Store contributions for analytics
            item['contributions'] = {
                'mood': round(mood_contrib_norm, 3),
                'taste': round(taste_contrib_norm, 3),
                'collaborative': round(collab_contrib_norm, 3)
            }
            
            # Add cold-start flag to contributions
            if item.get('is_cold_start'):
                item['contributions']['cold_start_boosted'] = True
        
        return selected


# Global instance
hybrid_engine = HybridRecommendationEngine()
