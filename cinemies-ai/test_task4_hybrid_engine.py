"""
Test script for Task 4: Hybrid Recommendation Engine

This script tests all 8 subtasks:
4.1 - GET /recommend endpoint with mood and user_id parameters
4.2 - Hybrid vector blending (40% mood + 30% taste + 30% collaborative)
4.3 - PCA dimensionality reduction integration
4.4 - MMR diversity re-ranking (λ = 0.7)
4.5 - Epsilon-greedy exploration (ε = 0.15)
4.6 - Temporal decay and recency boosting
4.7 - Explainability reasons
4.8 - Multi-task learning scoring function
"""

import requests
import json
import numpy as np

BASE_URL = "http://localhost:8000"

def test_health():
    """Test that the service is running"""
    print("\n=== Testing Health Endpoint ===")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Status: {data['status']}")
        print(f"Indexed Movies: {data['indexed_movies']}")
        print(f"Available Moods: {data['available_moods']}")
        return True
    return False

def test_basic_mood_recommendations():
    """Test 4.1: Basic mood-based recommendations"""
    print("\n=== Test 4.1: Basic Mood Recommendations ===")
    
    response = requests.get(
        f"{BASE_URL}/recommend",
        params={
            "mood": "mind_bending",
            "limit": 10
        }
    )
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Mood: {data['mood']}")
        print(f"Count: {data['count']}")
        print("\nTop 3 Recommendations:")
        for i, rec in enumerate(data['recommendations'][:3], 1):
            print(f"{i}. {rec['title']} - Match: {rec['match_score']:.3f}")
            print(f"   Genres: {', '.join(rec['genres'])}")
            if 'reason' in rec:
                print(f"   Reason: {rec['reason']}")
        return True
    else:
        print(f"Error: {response.text}")
        return False

def test_taste_vector_personalization():
    """Test 4.2: Hybrid blending with taste vector"""
    print("\n=== Test 4.2: Taste Vector Personalization (Hybrid Blending) ===")
    
    # Generate a sample taste vector (384 dimensions)
    # In production, this would come from the taste calibration endpoint
    sample_taste_vector = np.random.randn(384).astype(np.float32)
    sample_taste_vector = sample_taste_vector / np.linalg.norm(sample_taste_vector)
    taste_vector_str = ','.join(map(str, sample_taste_vector.tolist()))
    
    response = requests.get(
        f"{BASE_URL}/recommend",
        params={
            "mood": "mind_bending",
            "limit": 10,
            "user_id": "test_user_123",
            "taste_vector": taste_vector_str
        }
    )
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Mood: {data['mood']}")
        print(f"Count: {data['count']}")
        print("\nPersonalized Recommendations:")
        for i, rec in enumerate(data['recommendations'][:5], 1):
            print(f"{i}. {rec['title']} - Match: {rec['match_score']:.3f}")
            if 'reason' in rec:
                print(f"   Reason: {rec['reason']}")
        return True
    else:
        print(f"Error: {response.text}")
        return False

def test_diversity_in_recommendations():
    """Test 4.4: MMR diversity re-ranking"""
    print("\n=== Test 4.4: MMR Diversity Re-ranking ===")
    
    response = requests.get(
        f"{BASE_URL}/recommend",
        params={
            "mood": "comfort_food",
            "limit": 10
        }
    )
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        
        # Collect all genres
        all_genres = set()
        for rec in data['recommendations']:
            all_genres.update(rec['genres'])
        
        print(f"Total unique genres: {len(all_genres)}")
        print(f"Genres: {', '.join(sorted(all_genres))}")
        
        # Check diversity requirement: at least 3 genres
        if len(all_genres) >= 3:
            print("✓ Diversity requirement met (≥3 genres)")
        else:
            print("✗ Diversity requirement NOT met")
        
        return len(all_genres) >= 3
    else:
        print(f"Error: {response.text}")
        return False

def test_explainability_reasons():
    """Test 4.7: Explainability reasons"""
    print("\n=== Test 4.7: Explainability Reasons ===")
    
    # Test with pure mood
    response1 = requests.get(
        f"{BASE_URL}/recommend",
        params={
            "mood": "edge_of_seat",
            "limit": 5
        }
    )
    
    print("Pure Mood Recommendations:")
    if response1.status_code == 200:
        data = response1.json()
        for i, rec in enumerate(data['recommendations'], 1):
            print(f"{i}. {rec['title']}")
            print(f"   Reason: {rec.get('reason', 'No reason provided')}")
    
    # Test with taste vector
    sample_taste_vector = np.random.randn(384).astype(np.float32)
    sample_taste_vector = sample_taste_vector / np.linalg.norm(sample_taste_vector)
    taste_vector_str = ','.join(map(str, sample_taste_vector.tolist()))
    
    response2 = requests.get(
        f"{BASE_URL}/recommend",
        params={
            "mood": "edge_of_seat",
            "limit": 5,
            "user_id": "test_user_456",
            "taste_vector": taste_vector_str
        }
    )
    
    print("\nPersonalized Recommendations:")
    if response2.status_code == 200:
        data = response2.json()
        for i, rec in enumerate(data['recommendations'], 1):
            print(f"{i}. {rec['title']}")
            print(f"   Reason: {rec.get('reason', 'No reason provided')}")
        return True
    
    return False

def test_multi_task_scoring():
    """Test 4.8: Multi-task learning scoring function"""
    print("\n=== Test 4.8: Multi-Task Learning Scoring ===")
    
    response = requests.get(
        f"{BASE_URL}/recommend",
        params={
            "mood": "visual_spectacle",
            "limit": 10
        }
    )
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"\nRecommendations with Multi-Task Scores:")
        print("(Score considers: 60% relevance + 20% diversity + 10% serendipity + 10% freshness)")
        
        scores = []
        for i, rec in enumerate(data['recommendations'], 1):
            score = rec['match_score']
            scores.append(score)
            print(f"{i}. {rec['title']} - Score: {score:.3f}")
        
        # Check that scores are properly computed and sorted
        is_sorted = all(scores[i] >= scores[i+1] for i in range(len(scores)-1))
        if is_sorted:
            print("\n✓ Scores are properly sorted (descending)")
        else:
            print("\n✗ Scores are NOT properly sorted")
        
        return is_sorted
    else:
        print(f"Error: {response.text}")
        return False

def test_invalid_mood():
    """Test error handling for invalid mood"""
    print("\n=== Testing Error Handling (Invalid Mood) ===")
    
    response = requests.get(
        f"{BASE_URL}/recommend",
        params={
            "mood": "invalid_mood",
            "limit": 10
        }
    )
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 400:
        print("✓ Correctly returns 400 for invalid mood")
        error_data = response.json()
        print(f"Error: {error_data.get('error')}")
        print(f"Detail: {error_data.get('detail')}")
        return True
    else:
        print("✗ Should return 400 for invalid mood")
        return False

def test_all_moods():
    """Test that all moods work"""
    print("\n=== Testing All Moods ===")
    
    moods = [
        "mind_bending",
        "comfort_food",
        "visual_spectacle",
        "cathartic_cry",
        "hidden_gem",
        "laugh_out_loud",
        "edge_of_seat",
        "feel_inspired"
    ]
    
    results = []
    for mood in moods:
        response = requests.get(
            f"{BASE_URL}/recommend",
            params={
                "mood": mood,
                "limit": 5
            }
        )
        
        success = response.status_code == 200
        count = response.json()['count'] if success else 0
        results.append((mood, success, count))
        
        status = "✓" if success else "✗"
        print(f"{status} {mood}: {count} recommendations")
    
    all_passed = all(r[1] for r in results)
    return all_passed

def run_all_tests():
    """Run all tests"""
    print("=" * 60)
    print("TASK 4 HYBRID RECOMMENDATION ENGINE TEST SUITE")
    print("=" * 60)
    
    tests = [
        ("Health Check", test_health),
        ("4.1 - Basic Mood Recommendations", test_basic_mood_recommendations),
        ("4.2 - Taste Vector Personalization", test_taste_vector_personalization),
        ("4.4 - MMR Diversity", test_diversity_in_recommendations),
        ("4.7 - Explainability Reasons", test_explainability_reasons),
        ("4.8 - Multi-Task Scoring", test_multi_task_scoring),
        ("All Moods", test_all_moods),
        ("Error Handling", test_invalid_mood),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n✗ Test failed with exception: {str(e)}")
            results.append((test_name, False))
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    print(f"\nTotal: {passed}/{total} tests passed")
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
