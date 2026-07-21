"""
Test script for multi-task learning scoring function.
Verifies that all components (relevance, diversity, serendipity, freshness) are calculated correctly.
"""

import numpy as np
from hybrid_engine import hybrid_engine

def test_multi_task_score():
    """Test the multi_task_score function with known values."""
    
    # Test case 1: High relevance, low diversity
    relevance = 0.9
    diversity = 0.2
    serendipity = 0.1
    freshness = 0.8
    
    score = hybrid_engine.multi_task_score(relevance, diversity, serendipity, freshness)
    expected = 0.6 * 0.9 + 0.2 * 0.2 + 0.1 * 0.1 + 0.1 * 0.8
    assert abs(score - expected) < 0.001, f"Expected {expected}, got {score}"
    print(f"✓ Test 1 passed: score={score:.3f} (expected {expected:.3f})")
    
    # Test case 2: Balanced scores
    score = hybrid_engine.multi_task_score(0.5, 0.5, 0.5, 0.5)
    expected = 0.5
    assert abs(score - expected) < 0.001, f"Expected {expected}, got {score}"
    print(f"✓ Test 2 passed: score={score:.3f} (expected {expected:.3f})")
    
    # Test case 3: All zeros
    score = hybrid_engine.multi_task_score(0.0, 0.0, 0.0, 0.0)
    expected = 0.0
    assert abs(score - expected) < 0.001, f"Expected {expected}, got {score}"
    print(f"✓ Test 3 passed: score={score:.3f} (expected {expected:.3f})")
    
    # Test case 4: All ones
    score = hybrid_engine.multi_task_score(1.0, 1.0, 1.0, 1.0)
    expected = 1.0
    assert abs(score - expected) < 0.001, f"Expected {expected}, got {score}"
    print(f"✓ Test 4 passed: score={score:.3f} (expected {expected:.3f})")
    
    print("\n✅ All multi_task_score tests passed!")


def test_calculate_intra_list_diversity():
    """Test the intra-list diversity calculation."""
    
    # Create mock movies with embeddings
    emb1 = np.array([1.0, 0.0, 0.0])
    emb2 = np.array([0.0, 1.0, 0.0])
    emb3 = np.array([0.0, 0.0, 1.0])
    
    # Normalize
    emb1 = emb1 / np.linalg.norm(emb1)
    emb2 = emb2 / np.linalg.norm(emb2)
    emb3 = emb3 / np.linalg.norm(emb3)
    
    movies = [
        {'movie': {'title': 'Movie 1'}, 'embedding': emb1},
        {'movie': {'title': 'Movie 2'}, 'embedding': emb2},
        {'movie': {'title': 'Movie 3'}, 'embedding': emb3},
    ]
    
    diversity = hybrid_engine.calculate_intra_list_diversity(movies)
    
    # These are orthogonal vectors, so cosine similarity = 0, distance = 1.0
    # Average pairwise distance should be 1.0
    expected = 1.0
    assert abs(diversity - expected) < 0.001, f"Expected {expected}, got {diversity}"
    print(f"✓ Diversity test passed: diversity={diversity:.3f} (expected {expected:.3f})")
    
    # Test with similar vectors (low diversity)
    emb_similar1 = np.array([1.0, 0.1, 0.0])
    emb_similar2 = np.array([1.0, 0.2, 0.0])
    emb_similar1 = emb_similar1 / np.linalg.norm(emb_similar1)
    emb_similar2 = emb_similar2 / np.linalg.norm(emb_similar2)
    
    similar_movies = [
        {'movie': {'title': 'Movie A'}, 'embedding': emb_similar1},
        {'movie': {'title': 'Movie B'}, 'embedding': emb_similar2},
    ]
    
    diversity = hybrid_engine.calculate_intra_list_diversity(similar_movies)
    assert diversity < 0.5, f"Expected low diversity (< 0.5), got {diversity}"
    print(f"✓ Low diversity test passed: diversity={diversity:.3f} (< 0.5)")
    
    print("\n✅ All diversity tests passed!")


def test_calculate_serendipity():
    """Test the serendipity calculation."""
    
    # Test case 1: Movie matches all user genres (low serendipity)
    movie = {
        'movie': {
            'title': 'Thriller Movie',
            'genres': ['Thriller', 'Drama', 'Mystery']
        }
    }
    user_top_genres = ['Thriller', 'Drama', 'Mystery']
    
    serendipity = hybrid_engine.calculate_serendipity(movie, user_top_genres)
    expected = 0.0  # Perfect match = no serendipity
    assert abs(serendipity - expected) < 0.001, f"Expected {expected}, got {serendipity}"
    print(f"✓ Perfect match test passed: serendipity={serendipity:.3f} (expected {expected:.3f})")
    
    # Test case 2: Movie has no overlap with user genres (high serendipity)
    movie_different = {
        'movie': {
            'title': 'Comedy Movie',
            'genres': ['Comedy', 'Romance', 'Family']
        }
    }
    
    serendipity = hybrid_engine.calculate_serendipity(movie_different, user_top_genres)
    expected = 1.0  # No overlap = maximum serendipity
    assert abs(serendipity - expected) < 0.001, f"Expected {expected}, got {serendipity}"
    print(f"✓ No overlap test passed: serendipity={serendipity:.3f} (expected {expected:.3f})")
    
    # Test case 3: Partial overlap (medium serendipity)
    movie_partial = {
        'movie': {
            'title': 'Action Thriller',
            'genres': ['Action', 'Thriller', 'Sci-Fi']
        }
    }
    
    serendipity = hybrid_engine.calculate_serendipity(movie_partial, user_top_genres)
    # 1 genre overlap (Thriller) out of 3 user genres = 1 - (1/3) = 0.667
    expected = 0.667
    assert abs(serendipity - expected) < 0.01, f"Expected ~{expected}, got {serendipity}"
    print(f"✓ Partial overlap test passed: serendipity={serendipity:.3f} (expected ~{expected:.3f})")
    
    print("\n✅ All serendipity tests passed!")


def test_calculate_freshness():
    """Test the freshness calculation."""
    from datetime import datetime
    
    current_year = datetime.now().year
    
    # Test case 1: Brand new movie (this year)
    movie_new = {
        'movie': {
            'title': 'New Movie',
            'year': current_year
        }
    }
    
    freshness = hybrid_engine.calculate_freshness(movie_new)
    expected = 1.0  # 1 / (1 + 0/10) = 1.0
    assert abs(freshness - expected) < 0.001, f"Expected {expected}, got {freshness}"
    print(f"✓ New movie test passed: freshness={freshness:.3f} (expected {expected:.3f})")
    
    # Test case 2: 10-year-old movie
    movie_10y = {
        'movie': {
            'title': '10 Year Old Movie',
            'year': current_year - 10
        }
    }
    
    freshness = hybrid_engine.calculate_freshness(movie_10y)
    expected = 1.0 / (1.0 + 10.0 / 10.0)  # 1 / (1 + 1) = 0.5
    assert abs(freshness - expected) < 0.001, f"Expected {expected}, got {freshness}"
    print(f"✓ 10-year movie test passed: freshness={freshness:.3f} (expected {expected:.3f})")
    
    # Test case 3: 30-year-old movie
    movie_30y = {
        'movie': {
            'title': '30 Year Old Movie',
            'year': current_year - 30
        }
    }
    
    freshness = hybrid_engine.calculate_freshness(movie_30y)
    expected = 1.0 / (1.0 + 30.0 / 10.0)  # 1 / (1 + 3) = 0.25
    assert abs(freshness - expected) < 0.001, f"Expected {expected}, got {freshness}"
    print(f"✓ 30-year movie test passed: freshness={freshness:.3f} (expected {expected:.3f})")
    
    print("\n✅ All freshness tests passed!")


def test_apply_multi_task_scoring():
    """Test the full multi-task scoring pipeline."""
    
    # Create mock selected movies with embeddings
    emb1 = np.array([1.0, 0.0, 0.0])
    emb2 = np.array([0.0, 1.0, 0.0])
    emb1 = emb1 / np.linalg.norm(emb1)
    emb2 = emb2 / np.linalg.norm(emb2)
    
    from datetime import datetime
    current_year = datetime.now().year
    
    selected = [
        {
            'movie': {
                'title': 'Movie 1',
                'genres': ['Action', 'Thriller'],
                'year': current_year
            },
            'score': 0.85,
            'embedding': emb1
        },
        {
            'movie': {
                'title': 'Movie 2',
                'genres': ['Drama', 'Romance'],
                'year': current_year - 5
            },
            'score': 0.80,
            'embedding': emb2
        }
    ]
    
    user_top_genres = ['Comedy', 'Sci-Fi', 'Horror']
    
    # Apply multi-task scoring
    result = hybrid_engine.apply_multi_task_scoring(selected, user_top_genres)
    
    # Verify structure
    assert len(result) == 2, f"Expected 2 movies, got {len(result)}"
    
    for movie in result:
        assert 'multi_task_scores' in movie, "Missing multi_task_scores"
        scores = movie['multi_task_scores']
        
        assert 'relevance' in scores, "Missing relevance score"
        assert 'diversity' in scores, "Missing diversity score"
        assert 'serendipity' in scores, "Missing serendipity score"
        assert 'freshness' in scores, "Missing freshness score"
        assert 'final' in scores, "Missing final score"
        
        # All scores should be between 0 and 1
        for key, value in scores.items():
            assert 0.0 <= value <= 1.0, f"{key} score {value} out of range [0, 1]"
        
        print(f"✓ {movie['movie']['title']}: {scores}")
    
    # Verify movies are sorted by score
    assert result[0]['score'] >= result[1]['score'], "Movies not sorted by score"
    
    print("\n✅ All apply_multi_task_scoring tests passed!")


if __name__ == '__main__':
    print("=" * 60)
    print("Testing Multi-Task Learning Scoring Function")
    print("=" * 60)
    print()
    
    test_multi_task_score()
    print()
    test_calculate_intra_list_diversity()
    print()
    test_calculate_serendipity()
    print()
    test_calculate_freshness()
    print()
    test_apply_multi_task_scoring()
    
    print()
    print("=" * 60)
    print("✅ ALL TESTS PASSED!")
    print("=" * 60)
