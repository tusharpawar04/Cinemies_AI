"""Test personalization feature - comparing recommendations with and without favorites."""

import requests
import json

API_BASE_URL = "http://localhost:8000"

def test_personalization():
    """Test that personalization changes recommendations."""
    
    print("=" * 80)
    print("TESTING PERSONALIZATION FEATURE")
    print("=" * 80)
    
    # Test 1: Pure mood-based recommendations
    print("\n1. Testing PURE MOOD-BASED recommendations (no favorites)")
    print("-" * 80)
    
    response = requests.get(f"{API_BASE_URL}/recommend", params={
        "mood": "mind_bending",
        "limit": 5
    })
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Got {data['count']} recommendations for mood: {data['mood']}")
        print("\nTop 5 movies (pure mood):")
        for i, movie in enumerate(data['recommendations'], 1):
            print(f"  {i}. {movie['title']} (match: {movie['match_score']:.3f})")
        
        pure_mood_titles = [m['title'] for m in data['recommendations']]
    else:
        print(f"✗ Error: {response.status_code}")
        print(response.text)
        return
    
    # Test 2: Personalized with action movie favorites
    print("\n\n2. Testing PERSONALIZED recommendations (action movie favorites)")
    print("-" * 80)
    print("Favorites: Inception (27205), The Matrix (603), Tenet (577922)")
    
    response = requests.get(f"{API_BASE_URL}/recommend", params={
        "mood": "mind_bending",
        "limit": 5,
        "favorite_movie_ids": "27205,603,577922"
    })
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Got {data['count']} personalized recommendations")
        print("\nTop 5 movies (personalized with action favorites):")
        for i, movie in enumerate(data['recommendations'], 1):
            print(f"  {i}. {movie['title']} (match: {movie['match_score']:.3f})")
        
        action_titles = [m['title'] for m in data['recommendations']]
    else:
        print(f"✗ Error: {response.status_code}")
        print(response.text)
        return
    
    # Test 3: Personalized with romantic movie favorites
    print("\n\n3. Testing PERSONALIZED recommendations (romantic movie favorites)")
    print("-" * 80)
    print("Favorites: The Notebook (11036), La La Land (313369), Titanic (597)")
    
    response = requests.get(f"{API_BASE_URL}/recommend", params={
        "mood": "mind_bending",
        "limit": 5,
        "favorite_movie_ids": "11036,313369,597"
    })
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Got {data['count']} personalized recommendations")
        print("\nTop 5 movies (personalized with romantic favorites):")
        for i, movie in enumerate(data['recommendations'], 1):
            print(f"  {i}. {movie['title']} (match: {movie['match_score']:.3f})")
        
        romantic_titles = [m['title'] for m in data['recommendations']]
    else:
        print(f"✗ Error: {response.status_code}")
        print(response.text)
        return
    
    # Test 4: Compare results
    print("\n\n4. COMPARISON ANALYSIS")
    print("=" * 80)
    
    # Check if results are different
    pure_vs_action = len(set(pure_mood_titles) - set(action_titles))
    pure_vs_romantic = len(set(pure_mood_titles) - set(romantic_titles))
    action_vs_romantic = len(set(action_titles) - set(romantic_titles))
    
    print(f"\nDifferences between recommendation sets:")
    print(f"  Pure mood vs Action favorites: {pure_vs_action}/5 different movies")
    print(f"  Pure mood vs Romantic favorites: {pure_vs_romantic}/5 different movies")
    print(f"  Action vs Romantic favorites: {action_vs_romantic}/5 different movies")
    
    if pure_vs_action > 0 or pure_vs_romantic > 0:
        print("\n✓ PERSONALIZATION WORKING: Results differ based on user favorites!")
    else:
        print("\n⚠ WARNING: Personalization may not be working - results are identical")
    
    # Test 5: Invalid favorite IDs
    print("\n\n5. Testing ERROR HANDLING (invalid favorite IDs)")
    print("-" * 80)
    
    response = requests.get(f"{API_BASE_URL}/recommend", params={
        "mood": "mind_bending",
        "limit": 5,
        "favorite_movie_ids": "999999,888888,777777"
    })
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Gracefully handled invalid IDs, returned {data['count']} recommendations")
        print("  (Falls back to pure mood-based recommendations)")
    else:
        print(f"✗ Error: {response.status_code}")
    
    # Test 6: Empty favorites
    print("\n\n6. Testing EMPTY FAVORITES parameter")
    print("-" * 80)
    
    response = requests.get(f"{API_BASE_URL}/recommend", params={
        "mood": "mind_bending",
        "limit": 5,
        "favorite_movie_ids": ""
    })
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Handled empty favorites, returned {data['count']} recommendations")
    else:
        print(f"✗ Error: {response.status_code}")
    
    print("\n" + "=" * 80)
    print("PERSONALIZATION TEST COMPLETE")
    print("=" * 80)


def test_all_moods_with_personalization():
    """Test personalization across all 8 moods."""
    
    print("\n\n" + "=" * 80)
    print("TESTING PERSONALIZATION ACROSS ALL MOODS")
    print("=" * 80)
    
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
    
    # Use Inception, The Matrix, Tenet as favorites
    favorites = "27205,603,577922"
    
    for mood in moods:
        print(f"\n{mood.upper().replace('_', ' ')}")
        print("-" * 40)
        
        response = requests.get(f"{API_BASE_URL}/recommend", params={
            "mood": mood,
            "limit": 3,
            "favorite_movie_ids": favorites
        })
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Top 3 personalized recommendations:")
            for i, movie in enumerate(data['recommendations'], 1):
                print(f"  {i}. {movie['title'][:50]}")
        else:
            print(f"✗ Error: {response.status_code}")


if __name__ == "__main__":
    try:
        # Check if server is running
        response = requests.get(f"{API_BASE_URL}/health")
        if response.status_code != 200:
            print("ERROR: Server is not healthy")
            print(response.text)
            exit(1)
        
        print("✓ Server is healthy and ready")
        
        # Run tests
        test_personalization()
        test_all_moods_with_personalization()
        
    except requests.exceptions.ConnectionError:
        print("ERROR: Cannot connect to server at http://localhost:8000")
        print("Please start the server first: uvicorn main:app --reload")
        exit(1)
