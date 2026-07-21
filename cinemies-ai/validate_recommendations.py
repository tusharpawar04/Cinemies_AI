"""Manual validation of recommendations - review 50 random recommendations."""

import requests
import random
from mongodb_connector import MongoDBConnector
from config import MONGODB_CONNECTION_STRING, MONGODB_DATABASE, MONGODB_COLLECTION

API_BASE_URL = "http://localhost:8000"

def validate_mood_recommendations():
    """Manually review recommendations for each mood."""
    
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
    
    print("=" * 100)
    print("MANUAL VALIDATION OF RECOMMENDATIONS")
    print("=" * 100)
    print("\nInstructions: Review each recommendation and mark if it matches the mood.")
    print("Press Enter to continue, or type 'skip' to skip a mood.\n")
    
    validation_results = {}
    
    for mood in moods:
        print("\n" + "=" * 100)
        print(f"MOOD: {mood.upper().replace('_', ' ')}")
        print("=" * 100)
        
        # Get recommendations
        response = requests.get(f"{API_BASE_URL}/recommend", params={
            "mood": mood,
            "limit": 10
        })
        
        if response.status_code != 200:
            print(f"Error getting recommendations: {response.status_code}")
            continue
        
        data = response.json()
        recommendations = data['recommendations']
        
        print(f"\nTop 10 recommendations for '{mood}':\n")
        
        correct = 0
        total = 0
        
        for i, movie in enumerate(recommendations, 1):
            print(f"\n{i}. {movie['title']}")
            print(f"   Overview: {movie['overview'][:150]}...")
            print(f"   Genres: {', '.join(movie['genres'])}")
            print(f"   Rating: {movie['vote_average']:.1f}/10")
            print(f"   Match Score: {movie['match_score']:.3f}")
            
            # Ask for validation
            response_input = input(f"   Does this match '{mood}'? (y/n/skip): ").strip().lower()
            
            if response_input == 'skip':
                break
            elif response_input == 'y':
                correct += 1
                total += 1
            elif response_input == 'n':
                total += 1
                print(f"   ⚠ MISMATCH: {movie['title']} doesn't match {mood}")
        
        if total > 0:
            accuracy = (correct / total) * 100
            validation_results[mood] = {
                'correct': correct,
                'total': total,
                'accuracy': accuracy
            }
            print(f"\n{mood} accuracy: {correct}/{total} = {accuracy:.1f}%")
    
    # Summary
    print("\n\n" + "=" * 100)
    print("VALIDATION SUMMARY")
    print("=" * 100)
    
    for mood, results in validation_results.items():
        print(f"{mood:20} {results['correct']:2}/{results['total']:2} = {results['accuracy']:5.1f}%")
    
    if validation_results:
        overall_correct = sum(r['correct'] for r in validation_results.values())
        overall_total = sum(r['total'] for r in validation_results.values())
        overall_accuracy = (overall_correct / overall_total) * 100
        
        print(f"\n{'OVERALL':20} {overall_correct:2}/{overall_total:2} = {overall_accuracy:5.1f}%")
        
        if overall_accuracy >= 80:
            print("\n✅ EXCELLENT: Recommendation quality is very good (>= 80%)")
        elif overall_accuracy >= 70:
            print("\n✓ GOOD: Recommendation quality is acceptable (>= 70%)")
        else:
            print("\n⚠ NEEDS IMPROVEMENT: Recommendation quality below 70%")


def analyze_cross_industry():
    """Analyze Bollywood vs Hollywood distribution in recommendations."""
    
    print("\n\n" + "=" * 100)
    print("CROSS-INDUSTRY ANALYSIS (Bollywood + Hollywood)")
    print("=" * 100)
    
    # Connect to MongoDB to get movie metadata
    connector = MongoDBConnector(
        connection_string=MONGODB_CONNECTION_STRING,
        database=MONGODB_DATABASE,
        collection=MONGODB_COLLECTION
    )
    connector.connect()
    all_movies = connector.fetch_movies()
    connector.close()
    
    # Create lookup for original language
    movie_language = {}
    for movie in all_movies:
        movie_language[movie['tmdb_id']] = movie.get('original_language', 'en')
    
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
    
    for mood in moods:
        response = requests.get(f"{API_BASE_URL}/recommend", params={
            "mood": mood,
            "limit": 20
        })
        
        if response.status_code != 200:
            continue
        
        data = response.json()
        recommendations = data['recommendations']
        
        # Count by language
        languages = {}
        for movie in recommendations:
            lang = movie_language.get(movie['tmdb_id'], 'en')
            languages[lang] = languages.get(lang, 0) + 1
        
        print(f"\n{mood.upper().replace('_', ' ')}:")
        print(f"  English (Hollywood): {languages.get('en', 0)}/20")
        print(f"  Hindi (Bollywood): {languages.get('hi', 0)}/20")
        print(f"  Telugu (Tollywood): {languages.get('te', 0)}/20")
        print(f"  Other: {sum(v for k, v in languages.items() if k not in ['en', 'hi', 'te'])}/20")
        
        # Check diversity
        if len(languages) > 1:
            print(f"  ✓ Diverse: {len(languages)} languages represented")
        else:
            print(f"  ⚠ Not diverse: Only {list(languages.keys())[0]} movies")


def find_misclassified_movies():
    """Find movies that appear in wrong moods."""
    
    print("\n\n" + "=" * 100)
    print("FINDING MISCLASSIFIED MOVIES")
    print("=" * 100)
    
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
    
    # Get top 5 for each mood
    mood_movies = {}
    for mood in moods:
        response = requests.get(f"{API_BASE_URL}/recommend", params={
            "mood": mood,
            "limit": 5
        })
        
        if response.status_code == 200:
            data = response.json()
            mood_movies[mood] = [m['title'] for m in data['recommendations']]
    
    # Find movies appearing in multiple moods
    movie_moods = {}
    for mood, movies in mood_movies.items():
        for movie in movies:
            if movie not in movie_moods:
                movie_moods[movie] = []
            movie_moods[movie].append(mood)
    
    # Report movies in multiple moods
    print("\nMovies appearing in multiple moods (top 5):")
    for movie, moods_list in movie_moods.items():
        if len(moods_list) > 1:
            print(f"  {movie[:50]:50} → {', '.join(moods_list)}")


def test_hidden_gem_quality():
    """Validate that hidden_gem returns high-rated, lesser-known movies."""
    
    print("\n\n" + "=" * 100)
    print("VALIDATING 'HIDDEN GEM' MOOD")
    print("=" * 100)
    
    response = requests.get(f"{API_BASE_URL}/recommend", params={
        "mood": "hidden_gem",
        "limit": 10
    })
    
    if response.status_code != 200:
        print("Error getting hidden gem recommendations")
        return
    
    data = response.json()
    recommendations = data['recommendations']
    
    print("\nHidden Gem recommendations:")
    print("(Should be: high rating, indie/lesser-known films)\n")
    
    high_rated = 0
    for i, movie in enumerate(recommendations, 1):
        rating = movie['vote_average']
        genres = ', '.join(movie['genres'])
        
        print(f"{i}. {movie['title'][:50]:50} | Rating: {rating:.1f} | {genres}")
        
        if rating >= 7.0:
            high_rated += 1
    
    print(f"\nHigh-rated movies (>= 7.0): {high_rated}/10")
    
    if high_rated >= 7:
        print("✓ Hidden gem quality is good")
    else:
        print("⚠ Hidden gem needs improvement - not enough high-rated movies")


if __name__ == "__main__":
    try:
        # Check if server is running
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code != 200:
            print("ERROR: Server is not healthy")
            exit(1)
        
        print("✓ Server is running\n")
        
        # Run validation
        print("Choose validation type:")
        print("1. Manual validation (review recommendations)")
        print("2. Cross-industry analysis")
        print("3. Find misclassified movies")
        print("4. Test hidden gem quality")
        print("5. Run all")
        
        choice = input("\nEnter choice (1-5): ").strip()
        
        if choice == '1':
            validate_mood_recommendations()
        elif choice == '2':
            analyze_cross_industry()
        elif choice == '3':
            find_misclassified_movies()
        elif choice == '4':
            test_hidden_gem_quality()
        elif choice == '5':
            analyze_cross_industry()
            find_misclassified_movies()
            test_hidden_gem_quality()
            print("\n\nFor manual validation, run: python validate_recommendations.py")
            print("Then choose option 1")
        else:
            print("Invalid choice")
        
    except requests.exceptions.ConnectionError:
        print("ERROR: Cannot connect to server at http://localhost:8000")
        print("Please start the server first: uvicorn main:app --reload")
        exit(1)
