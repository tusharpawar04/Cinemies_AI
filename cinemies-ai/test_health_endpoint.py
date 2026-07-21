"""Test script for /health endpoint."""

import sys
from fastapi.testclient import TestClient

# Import the FastAPI app
from main import app

# Create test client
client = TestClient(app)


def test_health_endpoint_unhealthy():
    """Test /health endpoint returns 503 when FAISS index is not initialized."""
    print("\n" + "="*70)
    print("TEST: /health endpoint - Unhealthy Case (No Index)")
    print("="*70)
    
    # Make request to /health endpoint
    # Note: TestClient doesn't trigger lifespan events, so index won't be initialized
    response = client.get("/health")
    
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response Body: {response.json()}")
    
    # Verify response for unhealthy state
    assert response.status_code == 503, f"Expected 503, got {response.status_code}"
    
    data = response.json()
    assert "status" in data, "Response missing 'status' field"
    assert "indexed_movies" in data, "Response missing 'indexed_movies' field"
    assert "available_moods" in data, "Response missing 'available_moods' field"
    
    assert data["status"] == "unhealthy", f"Expected status='unhealthy', got '{data['status']}'"
    assert data["indexed_movies"] == 0, f"Expected indexed_movies=0, got {data['indexed_movies']}"
    assert len(data["available_moods"]) == 0, f"Expected 0 moods, got {len(data['available_moods'])}"
    
    print("\n✓ All assertions passed!")
    print(f"  - Status: {data['status']}")
    print(f"  - Indexed Movies: {data['indexed_movies']}")
    print(f"  - Available Moods: {len(data['available_moods'])}")
    
    return True


def test_health_endpoint_structure():
    """Test /health endpoint response structure matches HealthResponse model."""
    print("\n" + "="*70)
    print("TEST: /health endpoint - Response Structure")
    print("="*70)
    
    response = client.get("/health")
    data = response.json()
    
    # Verify field types
    assert isinstance(data["status"], str), "status should be string"
    assert isinstance(data["indexed_movies"], int), "indexed_movies should be int"
    assert isinstance(data["available_moods"], list), "available_moods should be list"
    
    # Verify moods are strings (if any)
    for mood in data["available_moods"]:
        assert isinstance(mood, str), f"Mood '{mood}' should be string"
    
    print("\n✓ Response structure is valid!")
    print(f"  - status: {type(data['status']).__name__}")
    print(f"  - indexed_movies: {type(data['indexed_movies']).__name__}")
    print(f"  - available_moods: {type(data['available_moods']).__name__}")
    
    return True


def main():
    """Run all health endpoint tests."""
    print("\n" + "="*70)
    print("CINEMIES AI - /health ENDPOINT TESTS")
    print("="*70)
    
    try:
        # Test 1: Unhealthy case (index not initialized)
        test_health_endpoint_unhealthy()
        
        # Test 2: Response structure
        test_health_endpoint_structure()
        
        print("\n" + "="*70)
        print("ALL TESTS PASSED ✓")
        print("="*70)
        print("\nThe /health endpoint is working correctly!")
        print("  - Returns HTTP 503 when FAISS index is not initialized")
        print("  - Returns status='unhealthy' with indexed_movies=0")
        print("  - Returns empty available_moods list")
        print("  - Response structure matches HealthResponse model")
        print("\nNote: To test the healthy case (HTTP 200), start the server with:")
        print("  uvicorn main:app --reload")
        print("Then visit: http://localhost:8000/health")
        
        return 0
        
    except AssertionError as e:
        print(f"\n✗ TEST FAILED: {e}")
        return 1
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
