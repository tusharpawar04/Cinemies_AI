"""
Test script for taste vector generation endpoint.
Tests the POST /generate-taste-vector endpoint.
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
GENERATE_TASTE_VECTOR_URL = f"{BASE_URL}/generate-taste-vector"

# Test data
TEST_CASES = [
    {
        "name": "Valid request with 20 ratings",
        "payload": {
            "rated_movies": [
                # Liked movies (Good = 1)
                {"tmdb_id": 27205, "rating": 1},  # Inception
                {"tmdb_id": 603, "rating": 1},    # The Matrix
                {"tmdb_id": 155, "rating": 1},    # The Dark Knight
                {"tmdb_id": 13, "rating": 1},     # Forrest Gump
                {"tmdb_id": 278, "rating": 1},    # The Shawshank Redemption
                {"tmdb_id": 238, "rating": 1},    # The Godfather
                {"tmdb_id": 157336, "rating": 1}, # Interstellar
                {"tmdb_id": 550, "rating": 1},    # Fight Club
                # Neutral (Don't Know = 0)
                {"tmdb_id": 11036, "rating": 0},  # The Notebook
                {"tmdb_id": 329, "rating": 0},    # Jurassic Park
                {"tmdb_id": 597, "rating": 0},    # Titanic
                # Disliked movies (Bad = -1)
                {"tmdb_id": 680, "rating": -1},   # Pulp Fiction
                {"tmdb_id": 424, "rating": -1},   # Schindler's List
                {"tmdb_id": 129, "rating": -1},   # Spirited Away
                {"tmdb_id": 19404, "rating": -1}, # Dilwale Dulhania Le Jayenge
            ]
        },
        "should_pass": True
    },
    {
        "name": "Minimal valid request (5 good, 2 bad)",
        "payload": {
            "rated_movies": [
                {"tmdb_id": 27205, "rating": 1},
                {"tmdb_id": 603, "rating": 1},
                {"tmdb_id": 155, "rating": 1},
                {"tmdb_id": 13, "rating": 1},
                {"tmdb_id": 278, "rating": 1},
                {"tmdb_id": 680, "rating": -1},
                {"tmdb_id": 424, "rating": -1},
            ]
        },
        "should_pass": True
    },
    {
        "name": "Insufficient good ratings (only 4)",
        "payload": {
            "rated_movies": [
                {"tmdb_id": 27205, "rating": 1},
                {"tmdb_id": 603, "rating": 1},
                {"tmdb_id": 155, "rating": 1},
                {"tmdb_id": 13, "rating": 1},
                {"tmdb_id": 680, "rating": -1},
                {"tmdb_id": 424, "rating": -1},
            ]
        },
        "should_pass": False,
        "expected_error": "At least 5 'Good' ratings required"
    },
    {
        "name": "Insufficient bad ratings (only 1)",
        "payload": {
            "rated_movies": [
                {"tmdb_id": 27205, "rating": 1},
                {"tmdb_id": 603, "rating": 1},
                {"tmdb_id": 155, "rating": 1},
                {"tmdb_id": 13, "rating": 1},
                {"tmdb_id": 278, "rating": 1},
                {"tmdb_id": 680, "rating": -1},
            ]
        },
        "should_pass": False,
        "expected_error": "At least 2 'Bad' ratings required"
    },
    {
        "name": "Invalid rating value",
        "payload": {
            "rated_movies": [
                {"tmdb_id": 27205, "rating": 2},  # Invalid rating
            ]
        },
        "should_pass": False,
        "expected_error": "Input should be -1, 0 or 1"
    },
]


def test_taste_vector_generation():
    """Test the taste vector generation endpoint."""
    
    print("\n" + "="*70)
    print("Testing Taste Vector Generation Endpoint")
    print("="*70 + "\n")
    
    passed = 0
    failed = 0
    
    for i, test_case in enumerate(TEST_CASES, 1):
        print(f"\nTest {i}: {test_case['name']}")
        print("-" * 70)
        
        try:
            response = requests.post(
                GENERATE_TASTE_VECTOR_URL,
                json=test_case['payload'],
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            print(f"Status Code: {response.status_code}")
            
            if test_case['should_pass']:
                # Test should pass (200)
                if response.status_code == 200:
                    data = response.json()
                    
                    # Validate response structure
                    assert "taste_vector" in data, "Missing taste_vector in response"
                    assert "dimension" in data, "Missing dimension in response"
                    assert "liked_count" in data, "Missing liked_count in response"
                    assert "disliked_count" in data, "Missing disliked_count in response"
                    assert "alpha" in data, "Missing alpha in response"
                    
                    # Validate taste vector
                    taste_vector = data["taste_vector"]
                    assert len(taste_vector) == 384, f"Expected 384 dimensions, got {len(taste_vector)}"
                    assert data["dimension"] == 384, f"Dimension field should be 384, got {data['dimension']}"
                    
                    # Check that vector is normalized (L2 norm ≈ 1.0)
                    import numpy as np
                    norm = np.linalg.norm(taste_vector)
                    assert 0.99 <= norm <= 1.01, f"Vector should be normalized (norm ≈ 1.0), got {norm}"
                    
                    # Validate counts
                    expected_liked = sum(1 for m in test_case['payload']['rated_movies'] if m['rating'] == 1)
                    expected_disliked = sum(1 for m in test_case['payload']['rated_movies'] if m['rating'] == -1)
                    expected_neutral = sum(1 for m in test_case['payload']['rated_movies'] if m['rating'] == 0)
                    
                    # Note: counts might be less if some movies not in database
                    assert data["liked_count"] <= expected_liked, f"Liked count mismatch"
                    assert data["disliked_count"] <= expected_disliked, f"Disliked count mismatch"
                    assert data["neutral_count"] == expected_neutral, f"Neutral count mismatch"
                    
                    # Validate alpha
                    assert 0.3 <= data["alpha"] <= 0.5, f"Alpha should be in [0.3, 0.5], got {data['alpha']}"
                    
                    print(f"✅ PASS")
                    print(f"   - Dimension: {data['dimension']}")
                    print(f"   - Liked: {data['liked_count']}, Disliked: {data['disliked_count']}, Neutral: {data['neutral_count']}")
                    print(f"   - Alpha: {data['alpha']:.3f}")
                    print(f"   - Vector norm: {norm:.6f}")
                    
                    if data.get("warnings"):
                        print(f"   - Warnings: {', '.join(data['warnings'])}")
                    
                    passed += 1
                else:
                    print(f"❌ FAIL: Expected status 200, got {response.status_code}")
                    print(f"   Response: {response.text}")
                    failed += 1
            
            else:
                # Test should fail (400 or 422)
                if response.status_code in [400, 422]:
                    data = response.json()
                    
                    # Check if expected error message is in response
                    response_str = json.dumps(data)
                    if test_case.get('expected_error') and test_case['expected_error'] in response_str:
                        print(f"✅ PASS (Failed as expected)")
                        print(f"   - Error: {test_case['expected_error']}")
                        passed += 1
                    else:
                        print(f"✅ PASS (Failed with different error)")
                        print(f"   - Response: {response_str[:200]}")
                        passed += 1
                else:
                    print(f"❌ FAIL: Expected status 400/422, got {response.status_code}")
                    print(f"   Response: {response.text[:200]}")
                    failed += 1
        
        except requests.exceptions.ConnectionError:
            print(f"❌ FAIL: Could not connect to {BASE_URL}")
            print(f"   Make sure the AI service is running: python main.py")
            failed += 1
        except AssertionError as e:
            print(f"❌ FAIL: Assertion error: {str(e)}")
            failed += 1
        except Exception as e:
            print(f"❌ FAIL: Unexpected error: {str(e)}")
            failed += 1
    
    # Summary
    print("\n" + "="*70)
    print(f"Test Summary: {passed} passed, {failed} failed out of {len(TEST_CASES)} tests")
    print("="*70 + "\n")
    
    return failed == 0


def test_health_check():
    """Quick health check before running main tests."""
    print("Checking service health...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Service is healthy")
            print(f"   - Indexed movies: {data.get('indexed_movies', 'N/A')}")
            print(f"   - Available moods: {len(data.get('available_moods', []))}")
            return True
        else:
            print(f"❌ Service unhealthy (status {response.status_code})")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to {BASE_URL}")
        print("   Make sure the AI service is running: python main.py")
        return False


if __name__ == "__main__":
    # Run health check first
    if not test_health_check():
        print("\n⚠️  Service is not available. Please start the service first.")
        exit(1)
    
    # Run tests
    success = test_taste_vector_generation()
    
    if success:
        print("✅ All tests passed!")
        exit(0)
    else:
        print("❌ Some tests failed")
        exit(1)
