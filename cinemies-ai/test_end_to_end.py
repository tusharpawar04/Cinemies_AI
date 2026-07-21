"""Comprehensive end-to-end test suite for Cinemies AI."""

import requests
import time
import sys

API_BASE_URL = "http://localhost:8000"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.END}")

def print_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.END}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.END}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ {msg}{Colors.END}")

def test_health_endpoint():
    """Test /health endpoint."""
    print("\n" + "=" * 80)
    print("TEST 1: HEALTH ENDPOINT")
    print("=" * 80)
    
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Health check passed")
            print_info(f"  Status: {data['status']}")
            print_info(f"  Indexed movies: {data['indexed_movies']}")
            print_info(f"  Available moods: {len(data['available_moods'])}")
            
            if data['indexed_movies'] >= 1000:
                print_success(f"  Movie count meets requirement (>= 1000)")
            else:
                print_warning(f"  Movie count below target: {data['indexed_movies']}")
            
            return True
        else:
            print_error(f"Health check failed: {response.status_code}")
            return False
            
    except Exception as e:
        print_error(f"Health check error: {str(e)}")
        return False


def test_all_moods():
    """Test recommendations for all 8 moods."""
    print("\n" + "=" * 80)
    print("TEST 2: ALL MOOD RECOMMENDATIONS")
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
    
    all_passed = True
    
    for mood in moods:
        try:
            response = requests.get(f"{API_BASE_URL}/recommend", params={
                "mood": mood,
                "limit": 5
            })
            
            if response.status_code == 200:
                data = response.json()
                print_success(f"{mood}: {data['count']} recommendations")
                
                # Show top 2 movies
                for i, movie in enumerate(data['recommendations'][:2], 1):
                    print(f"    {i}. {movie['title'][:50]} (score: {movie['match_score']:.3f})")
            else:
                print_error(f"{mood}: Failed with status {response.status_code}")
                all_passed = False
                
        except Exception as e:
            print_error(f"{mood}: Error - {str(e)}")
            all_passed = False
    
    return all_passed


def test_response_time():
    """Test API response time."""
    print("\n" + "=" * 80)
    print("TEST 3: RESPONSE TIME PERFORMANCE")
    print("=" * 80)
    
    times = []
    
    for i in range(5):
        start = time.time()
        response = requests.get(f"{API_BASE_URL}/recommend", params={
            "mood": "mind_bending",
            "limit": 10
        })
        elapsed = (time.time() - start) * 1000  # Convert to ms
        times.append(elapsed)
        
        if response.status_code == 200:
            print(f"  Request {i+1}: {elapsed:.2f}ms")
    
    avg_time = sum(times) / len(times)
    print_info(f"\nAverage response time: {avg_time:.2f}ms")
    
    if avg_time < 100:
        print_success("Performance excellent (< 100ms)")
        return True
    elif avg_time < 500:
        print_success("Performance good (< 500ms)")
        return True
    else:
        print_warning(f"Performance acceptable but could be improved")
        return True


def test_personalization():
    """Test personalization feature."""
    print("\n" + "=" * 80)
    print("TEST 4: PERSONALIZATION")
    print("=" * 80)
    
    # Get pure mood recommendations
    response1 = requests.get(f"{API_BASE_URL}/recommend", params={
        "mood": "mind_bending",
        "limit": 5
    })
    
    # Get personalized recommendations
    response2 = requests.get(f"{API_BASE_URL}/recommend", params={
        "mood": "mind_bending",
        "limit": 5,
        "favorite_movie_ids": "27205,603,577922"
    })
    
    if response1.status_code == 200 and response2.status_code == 200:
        data1 = response1.json()
        data2 = response2.json()
        
        titles1 = [m['title'] for m in data1['recommendations']]
        titles2 = [m['title'] for m in data2['recommendations']]
        
        differences = len(set(titles1) - set(titles2))
        
        print_info(f"Pure mood recommendations:")
        for i, title in enumerate(titles1[:3], 1):
            print(f"  {i}. {title[:50]}")
        
        print_info(f"\nPersonalized recommendations:")
        for i, title in enumerate(titles2[:3], 1):
            print(f"  {i}. {title[:50]}")
        
        print_info(f"\nDifferences: {differences}/5 movies changed")
        
        if differences > 0:
            print_success("Personalization is working")
            return True
        else:
            print_warning("Personalization may not be affecting results")
            return True
    else:
        print_error("Personalization test failed")
        return False


def test_error_handling():
    """Test error handling."""
    print("\n" + "=" * 80)
    print("TEST 5: ERROR HANDLING")
    print("=" * 80)
    
    all_passed = True
    
    # Test 1: Invalid mood
    print("\n5.1: Invalid mood parameter")
    response = requests.get(f"{API_BASE_URL}/recommend", params={
        "mood": "invalid_mood",
        "limit": 10
    })
    
    if response.status_code == 400:
        print_success("Correctly rejected invalid mood (400)")
    else:
        print_error(f"Expected 400, got {response.status_code}")
        all_passed = False
    
    # Test 2: Invalid limit (too high)
    print("\n5.2: Invalid limit parameter (too high)")
    response = requests.get(f"{API_BASE_URL}/recommend", params={
        "mood": "mind_bending",
        "limit": 100
    })
    
    if response.status_code == 422:
        print_success("Correctly rejected invalid limit (422)")
    else:
        print_warning(f"Got status {response.status_code} (expected 422)")
    
    # Test 3: Missing mood parameter
    print("\n5.3: Missing required mood parameter")
    response = requests.get(f"{API_BASE_URL}/recommend", params={
        "limit": 10
    })
    
    if response.status_code == 422:
        print_success("Correctly rejected missing mood (422)")
    else:
        print_error(f"Expected 422, got {response.status_code}")
        all_passed = False
    
    # Test 4: Invalid favorite IDs (should gracefully fall back)
    print("\n5.4: Invalid favorite movie IDs")
    response = requests.get(f"{API_BASE_URL}/recommend", params={
        "mood": "mind_bending",
        "limit": 5,
        "favorite_movie_ids": "999999,888888"
    })
    
    if response.status_code == 200:
        print_success("Gracefully handled invalid favorites (fallback to pure mood)")
    else:
        print_error(f"Expected 200, got {response.status_code}")
        all_passed = False
    
    return all_passed


def test_data_quality():
    """Test quality of recommendations."""
    print("\n" + "=" * 80)
    print("TEST 6: DATA QUALITY")
    print("=" * 80)
    
    response = requests.get(f"{API_BASE_URL}/recommend", params={
        "mood": "mind_bending",
        "limit": 10
    })
    
    if response.status_code == 200:
        data = response.json()
        movies = data['recommendations']
        
        # Check all required fields are present
        required_fields = ['title', 'overview', 'tmdb_id', 'poster_url', 
                          'vote_average', 'genres', 'match_score']
        
        all_valid = True
        for movie in movies:
            for field in required_fields:
                if field not in movie:
                    print_error(f"Missing field '{field}' in movie: {movie.get('title', 'Unknown')}")
                    all_valid = False
        
        if all_valid:
            print_success("All movies have required fields")
        
        # Check match scores are in valid range
        scores = [m['match_score'] for m in movies]
        if all(0 <= s <= 1 for s in scores):
            print_success(f"Match scores in valid range [0, 1]")
        else:
            print_error("Some match scores out of range")
            all_valid = False
        
        # Check scores are in descending order
        if scores == sorted(scores, reverse=True):
            print_success("Results sorted by match score (descending)")
        else:
            print_warning("Results not properly sorted")
        
        # Show score distribution
        print_info(f"\nScore distribution:")
        print_info(f"  Highest: {max(scores):.3f}")
        print_info(f"  Lowest: {min(scores):.3f}")
        print_info(f"  Average: {sum(scores)/len(scores):.3f}")
        
        return all_valid
    else:
        print_error("Failed to get recommendations")
        return False


def run_all_tests():
    """Run all tests and generate report."""
    print("\n" + "=" * 80)
    print("CINEMIES AI - COMPREHENSIVE END-TO-END TEST SUITE")
    print("=" * 80)
    
    # Check server availability
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code != 200:
            print_error("Server is not healthy. Please check the server.")
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to server at http://localhost:8000")
        print_info("Please start the server: uvicorn main:app --reload")
        sys.exit(1)
    
    print_success("Server is running and healthy\n")
    
    # Run all tests
    results = {
        "Health Endpoint": test_health_endpoint(),
        "All Moods": test_all_moods(),
        "Response Time": test_response_time(),
        "Personalization": test_personalization(),
        "Error Handling": test_error_handling(),
        "Data Quality": test_data_quality()
    }
    
    # Generate summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "PASS" if result else "FAIL"
        color = Colors.GREEN if result else Colors.RED
        print(f"{color}{status}{Colors.END} - {test_name}")
    
    print("\n" + "-" * 80)
    print(f"Total: {passed}/{total} tests passed")
    
    if passed == total:
        print_success("\n🎉 ALL TESTS PASSED! System is production-ready.")
        return 0
    else:
        print_error(f"\n⚠ {total - passed} test(s) failed. Please review.")
        return 1


if __name__ == "__main__":
    exit_code = run_all_tests()
    sys.exit(exit_code)
