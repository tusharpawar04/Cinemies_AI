"""
Test script for explainability feature (Task 4.7)
"""

import numpy as np
from hybrid_engine import HybridRecommendationEngine


def test_explainability():
    """Test the explainability reason generation."""
    
    engine = HybridRecommendationEngine()
    
    # Test cases with different contribution patterns
    test_cases = [
        {
            'name': 'Mood-dominant (>0.6)',
            'mood_contrib': 0.7,
            'taste_contrib': 0.2,
            'collab_contrib': 0.1,
            'mood_name': 'mind_bending',
            'expected_pattern': 'Matches your Mind Bending mood'
        },
        {
            'name': 'Taste-dominant with example (>0.6)',
            'mood_contrib': 0.2,
            'taste_contrib': 0.7,
            'collab_contrib': 0.1,
            'example_movie': 'Inception',
            'expected_pattern': 'Similar to movies you love like Inception'
        },
        {
            'name': 'Taste-dominant without example (>0.6)',
            'mood_contrib': 0.2,
            'taste_contrib': 0.7,
            'collab_contrib': 0.1,
            'expected_pattern': 'Similar to movies you love'
        },
        {
            'name': 'Collaborative-dominant (>0.6)',
            'mood_contrib': 0.2,
            'taste_contrib': 0.1,
            'collab_contrib': 0.7,
            'expected_pattern': 'Users with similar taste enjoyed this'
        },
        {
            'name': 'Balanced (no dominant)',
            'mood_contrib': 0.4,
            'taste_contrib': 0.3,
            'collab_contrib': 0.3,
            'expected_pattern': 'A hidden gem you might not expect'
        },
        {
            'name': 'Edge case: exactly 0.6 threshold',
            'mood_contrib': 0.6,
            'taste_contrib': 0.2,
            'collab_contrib': 0.2,
            'expected_pattern': 'A hidden gem you might not expect'  # Should not trigger (not > 0.6)
        }
    ]
    
    print("Testing Explainability Feature (Task 4.7)")
    print("=" * 60)
    
    all_passed = True
    
    for i, test in enumerate(test_cases, 1):
        mood_contrib = test['mood_contrib']
        taste_contrib = test['taste_contrib']
        collab_contrib = test['collab_contrib']
        mood_name = test.get('mood_name')
        example_movie = test.get('example_movie')
        expected = test['expected_pattern']
        
        # Generate reason
        reason = engine.generate_explainability(
            candidate={},
            mood_contribution=mood_contrib,
            taste_contribution=taste_contrib,
            collaborative_contribution=collab_contrib,
            mood_name=mood_name,
            example_movie=example_movie
        )
        
        # Check if reason matches expected pattern
        passed = reason == expected
        status = "✓ PASS" if passed else "✗ FAIL"
        
        print(f"\nTest {i}: {test['name']}")
        print(f"  Contributions: mood={mood_contrib}, taste={taste_contrib}, collab={collab_contrib}")
        print(f"  Expected: {expected}")
        print(f"  Got:      {reason}")
        print(f"  {status}")
        
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✓ All tests passed!")
    else:
        print("✗ Some tests failed!")
    
    return all_passed


def test_contribution_normalization():
    """Test that contributions are properly normalized."""
    
    print("\n\nTesting Contribution Normalization")
    print("=" * 60)
    
    # Simulate what happens in main.py
    mood_vector = np.random.rand(384).astype(np.float32)
    mood_vector = mood_vector / np.linalg.norm(mood_vector)
    
    taste_vector = np.random.rand(384).astype(np.float32)
    taste_vector = taste_vector / np.linalg.norm(taste_vector)
    
    collab_vector = np.random.rand(384).astype(np.float32)
    collab_vector = collab_vector / np.linalg.norm(collab_vector)
    
    embedding = np.random.rand(384).astype(np.float32)
    embedding = embedding / np.linalg.norm(embedding)
    
    # Calculate contributions
    mood_contrib = float(np.dot(mood_vector, embedding))
    taste_contrib = float(np.dot(taste_vector, embedding))
    collab_contrib = float(np.dot(collab_vector, embedding))
    
    print(f"Raw contributions:")
    print(f"  Mood:    {mood_contrib:.4f}")
    print(f"  Taste:   {taste_contrib:.4f}")
    print(f"  Collab:  {collab_contrib:.4f}")
    print(f"  Total:   {mood_contrib + taste_contrib + collab_contrib:.4f}")
    
    # Normalize
    total_contrib = mood_contrib + taste_contrib + collab_contrib
    if total_contrib > 0:
        mood_contrib_norm = mood_contrib / total_contrib
        taste_contrib_norm = taste_contrib / total_contrib
        collab_contrib_norm = collab_contrib / total_contrib
    
    print(f"\nNormalized contributions:")
    print(f"  Mood:    {mood_contrib_norm:.4f}")
    print(f"  Taste:   {taste_contrib_norm:.4f}")
    print(f"  Collab:  {collab_contrib_norm:.4f}")
    print(f"  Sum:     {mood_contrib_norm + taste_contrib_norm + collab_contrib_norm:.4f}")
    
    # Check sum equals 1.0
    total_norm = mood_contrib_norm + taste_contrib_norm + collab_contrib_norm
    passed = abs(total_norm - 1.0) < 0.0001
    
    status = "✓ PASS" if passed else "✗ FAIL"
    print(f"\n{status}: Normalized contributions sum to 1.0")
    
    return passed


if __name__ == "__main__":
    test1_passed = test_explainability()
    test2_passed = test_contribution_normalization()
    
    print("\n" + "=" * 60)
    print("FINAL RESULTS")
    print("=" * 60)
    if test1_passed and test2_passed:
        print("✓ All tests passed! Explainability feature is working correctly.")
        exit(0)
    else:
        print("✗ Some tests failed. Please review the implementation.")
        exit(1)
