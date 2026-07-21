"""Live integration test for /recommend endpoint.

This test requires the FastAPI server to be running with actual services initialized.
Run with: python test_recommend_live.py
"""

import requests
import json


def test_recommend_endpoint():
    """Test the /recommend endpoint with a live server."""
    base_url = "http://localhost:8000"
    
    print("Testing GET /recommend endpoint...")
    print("-" * 50)
    
    # Test 1: Valid mood with default limit
    print("\n1. Testing valid mood 'mind_bending' with default limit...")
    response = requests.get(f"{base_url}/recommend?mood=mind_bending")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   Mood: {data['mood']}")
        print(f"   Count: {data['count']}")
        print(f"   First recommendation: {data['recommendations'][0]['title']}")
        print(f"   Match score: {data['recommendations'][0]['match_score']:.4f}")
    else:
        print(f"   Error: {response.json()}")
    
    # Test 2: Valid mood with custom limit
    print("\n2. Testing valid mood 'comfort_food' with limit=5...")
    response = requests.get(f"{base_url}/recommend?mood=comfort_food&limit=5")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   Mood: {data['mood']}")
        print(f"   Count: {data['count']}")
        print(f"   Recommendations returned: {len(data['recommendations'])}")
    else:
        print(f"   Error: {response.json()}")
    
    # Test 3: Invalid mood
    print("\n3. Testing invalid mood 'invalid_mood'...")
    response = requests.get(f"{base_url}/recommend?mood=invalid_mood&limit=5")
    print(f"   Status: {response.status_code}")
    if response.status_code == 400:
        data = response.json()
        print(f"   Error: {data['error']}")
        print(f"   Detail: {data['detail']}")
    else:
        print(f"   Unexpected response: {response.json()}")
    
    # Test 4: Invalid limit (too low)
    print("\n4. Testing invalid limit (0)...")
    response = requests.get(f"{base_url}/recommend?mood=mind_bending&limit=0")
    print(f"   Status: {response.status_code}")
    if response.status_code == 422:
        print(f"   Validation error (expected)")
    else:
        print(f"   Response: {response.json()}")
    
    # Test 5: Invalid limit (too high)
    print("\n5. Testing invalid limit (51)...")
    response = requests.get(f"{base_url}/recommend?mood=mind_bending&limit=51")
    print(f"   Status: {response.status_code}")
    if response.status_code == 422:
        print(f"   Validation error (expected)")
    else:
        print(f"   Response: {response.json()}")
    
    # Test 6: All moods
    print("\n6. Testing all available moods...")
    moods = [
        "mind_bending", "comfort_food", "visual_spectacle",
        "cathartic_cry", "hidden_gem", "laugh_out_loud",
        "edge_of_seat", "feel_inspired"
    ]
    for mood in moods:
        response = requests.get(f"{base_url}/recommend?mood={mood}&limit=3")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ {mood}: {data['count']} recommendations")
        else:
            print(f"   ✗ {mood}: Error {response.status_code}")
    
    print("\n" + "-" * 50)
    print("Live integration test completed!")


if __name__ == "__main__":
    try:
        test_recommend_endpoint()
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to server at http://localhost:8000")
        print("Please start the server with: uvicorn main:app --reload")
    except Exception as e:
        print(f"Error: {e}")
