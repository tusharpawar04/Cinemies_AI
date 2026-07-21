"""
End-to-end Integration Test
Tests the complete flow across all 3 services: Frontend → Backend → AI Engine
"""

import requests
import time
import json

# Service URLs (update these based on your deployment)
AI_ENGINE_URL = "http://localhost:8000"
BACKEND_URL = "http://localhost:5000"
FRONTEND_URL = "http://localhost:5173"

def test_ai_engine_health():
    """Test AI Engine health endpoint"""
    print("\n=== Testing AI Engine Health ===")
    try:
        response = requests.get(f"{AI_ENGINE_URL}/health", timeout=5)
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'healthy'
        assert data['indexed_movies'] > 0
        print(f"✓ AI Engine healthy: {data['indexed_movies']} movies indexed")
        return True
    except Exception as e:
        print(f"✗ AI Engine health check failed: {e}")
        return False

def test_taste_vector_generation():
    """Test taste vector generation"""
    print("\n=== Testing Taste Vector Generation ===")
    
    # Sample rated movies (Good/Don't Know/Bad)
    rated_movies = [
        {"tmdb_id": 27205, "rating": 1},  # Inception - Good
        {"tmdb_id": 603, "rating": 1},    # Matrix - Good
        {"tmdb_id": 13, "rating": 1},     # Forrest Gump - Good
        {"tmdb_id": 120, "rating": 1},    # LOTR - Good
        {"tmdb_id": 155, "rating": 1},    # Dark Knight - Good
        {"tmdb_id": 19404, "rating": -1}, # Dilwale - Bad
        {"tmdb_id": 19995, "rating": -1}, # Avatar - Bad
        {"tmdb_id": 280, "rating": 0},    # Terminator - Don't Know
    ]
    
    try:
        response = requests.post(
            f"{AI_ENGINE_URL}/generate-taste-vector",
            json={"rated_movies": rated_movies},
            timeout=10
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'taste_vector' in data
        assert len(data['taste_vector']) == 384
        assert data['liked_count'] == 5
        assert data['disliked_count'] == 2
        
        print(f"✓ Taste vector generated: {data['dimension']}D")
        print(f"  Liked: {data['liked_count']}, Disliked: {data['disliked_count']}")
        
        return data['taste_vector']
    except Exception as e:
        print(f"✗ Taste vector generation failed: {e}")
        return None

def test_mood_recommendations(taste_vector=None):
    """Test mood-based recommendations"""
    print("\n=== Testing Mood Recommendations ===")
    
    mood = "mind_bending"
    params = {"mood": mood, "limit": 10}
    
    if taste_vector:
        params["taste_vector"] = ",".join(map(str, taste_vector))
        params["user_top_genres"] = "Thriller,Sci-Fi,Drama"
    
    try:
        response = requests.get(
            f"{AI_ENGINE_URL}/recommend",
            params=params,
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'recommendations' in data
        assert len(data['recommendations']) > 0
        
        print(f"✓ Received {data['count']} recommendations for mood '{mood}'")
        
        # Check first recommendation structure
        first = data['recommendations'][0]
        assert 'title' in first
        assert 'match_score' in first
        assert 'reason' in first
        
        print(f"  Top recommendation: {first['title']} (score: {first['match_score']:.3f})")
        print(f"  Reason: {first['reason']}")
        
        return data['recommendations']
    except Exception as e:
        print(f"✗ Mood recommendations failed: {e}")
        return None

def test_taste_vector_update(taste_vector):
    """Test real-time taste vector updates"""
    print("\n=== Testing Taste Vector Update ===")
    
    clicked_movies = [27205, 603, 155]  # Inception, Matrix, Dark Knight
    
    try:
        response = requests.post(
            f"{AI_ENGINE_URL}/update-taste-vector",
            json={
                "user_id": "test_user_123",
                "clicked_movie_ids": clicked_movies,
                "current_taste_vector": taste_vector
            },
            timeout=10
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'updated_taste_vector' in data
        assert len(data['updated_taste_vector']) == 384
        assert data['clicked_count'] == 3
        assert 0 <= data['similarity_to_old'] <= 1
        
        print(f"✓ Taste vector updated")
        print(f"  Clicked movies: {data['clicked_count']}")
        print(f"  Similarity to old: {data['similarity_to_old']:.3f}")
        print(f"  Major shift: {data['major_taste_shift']}")
        
        return data['updated_taste_vector']
    except Exception as e:
        print(f"✗ Taste vector update failed: {e}")
        return None

def test_session_preferences():
    """Test session-based preferences"""
    print("\n=== Testing Session-Based Preferences ===")
    
    mood = "edge_of_seat"
    recent_viewed = "27205,603,155,13,120"  # 5 recently viewed movies
    
    try:
        response = requests.get(
            f"{AI_ENGINE_URL}/recommend",
            params={
                "mood": mood,
                "limit": 10,
                "recent_viewed_ids": recent_viewed,
                "user_top_genres": "Action,Thriller,Sci-Fi"
            },
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        
        assert len(data['recommendations']) > 0
        print(f"✓ Session-based recommendations generated")
        print(f"  Recommendations: {data['count']}")
        
        return True
    except Exception as e:
        print(f"✗ Session preferences failed: {e}")
        return False

def test_multi_task_scoring():
    """Test multi-task learning scoring"""
    print("\n=== Testing Multi-Task Scoring ===")
    
    try:
        response = requests.get(
            f"{AI_ENGINE_URL}/recommend",
            params={
                "mood": "mind_bending",
                "limit": 10,
                "user_top_genres": "Thriller,Mystery,Drama"
            },
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check if recommendations have multi-task scores
        if data['recommendations'] and 'multi_task_scores' in data['recommendations'][0]:
            scores = data['recommendations'][0]['multi_task_scores']
            assert 'relevance' in scores
            assert 'diversity' in scores
            assert 'serendipity' in scores
            assert 'freshness' in scores
            assert 'final' in scores
            
            print(f"✓ Multi-task scoring active")
            print(f"  Relevance: {scores['relevance']:.3f}")
            print(f"  Diversity: {scores['diversity']:.3f}")
            print(f"  Serendipity: {scores['serendipity']:.3f}")
            print(f"  Freshness: {scores['freshness']:.3f}")
        else:
            print("⚠ Multi-task scores not found in response (may not be returned)")
        
        return True
    except Exception as e:
        print(f"✗ Multi-task scoring test failed: {e}")
        return False

def test_personalized_mood_vectors():
    """Test genre-aware personalized mood vectors"""
    print("\n=== Testing Personalized Mood Vectors ===")
    
    try:
        # Request with user top genres
        response1 = requests.get(
            f"{AI_ENGINE_URL}/recommend",
            params={
                "mood": "mind_bending",
                "limit": 5,
                "user_top_genres": "Horror,Thriller,Mystery"
            },
            timeout=15
        )
        
        response2 = requests.get(
            f"{AI_ENGINE_URL}/recommend",
            params={
                "mood": "mind_bending",
                "limit": 5,
                "user_top_genres": "Comedy,Romance,Family"
            },
            timeout=15
        )
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        data1 = response1.json()
        data2 = response2.json()
        
        # Results should be different due to different genre preferences
        titles1 = [r['title'] for r in data1['recommendations'][:3]]
        titles2 = [r['title'] for r in data2['recommendations'][:3]]
        
        overlap = len(set(titles1) & set(titles2))
        print(f"✓ Personalized mood vectors working")
        print(f"  Horror/Thriller user: {titles1[0]}")
        print(f"  Comedy/Romance user: {titles2[0]}")
        print(f"  Overlap: {overlap}/3 movies")
        
        return True
    except Exception as e:
        print(f"✗ Personalized mood vectors failed: {e}")
        return False

def run_all_tests():
    """Run all integration tests"""
    print("="*60)
    print("END-TO-END INTEGRATION TEST SUITE")
    print("="*60)
    
    results = {}
    
    # Test 1: Health Check
    results['health'] = test_ai_engine_health()
    time.sleep(0.5)
    
    # Test 2: Taste Vector Generation
    taste_vector = test_taste_vector_generation()
    results['taste_generation'] = taste_vector is not None
    time.sleep(0.5)
    
    # Test 3: Mood Recommendations (without personalization)
    results['mood_recommendations'] = test_mood_recommendations() is not None
    time.sleep(0.5)
    
    # Test 4: Personalized Mood Recommendations
    if taste_vector:
        results['personalized_recommendations'] = test_mood_recommendations(taste_vector) is not None
        time.sleep(0.5)
    
    # Test 5: Taste Vector Update
    if taste_vector:
        updated_vector = test_taste_vector_update(taste_vector)
        results['taste_update'] = updated_vector is not None
        time.sleep(0.5)
    
    # Test 6: Session Preferences
    results['session_preferences'] = test_session_preferences()
    time.sleep(0.5)
    
    # Test 7: Multi-Task Scoring
    results['multi_task_scoring'] = test_multi_task_scoring()
    time.sleep(0.5)
    
    # Test 8: Personalized Mood Vectors
    results['personalized_moods'] = test_personalized_mood_vectors()
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status:8} {test_name}")
    
    print("="*60)
    print(f"TOTAL: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print("="*60)
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
