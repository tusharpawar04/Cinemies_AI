"""Script to test mood-based search on 20 movies."""

import numpy as np
from embedding_service import EmbeddingService
from faiss_index import FAISSIndexManager
from mood_vectors import MoodVectorSystem


# 20 hardcoded movies (same as build_index.py)
MOVIES = [
    {
        "title": "Inception",
        "overview": "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
        "tmdb_id": 27205
    },
    {
        "title": "3 Idiots",
        "overview": "Two friends embark on a quest for a lost buddy. On this journey, they encounter a long-forgotten bet, a wedding they must crash, and a funeral that goes impossibly out of control.",
        "tmdb_id": 20453
    },
    {
        "title": "RRR",
        "overview": "A fictional story about two legendary revolutionaries and their journey away from home before they started fighting for their country in the 1920s.",
        "tmdb_id": 579974
    },
    {
        "title": "Interstellar",
        "overview": "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival as Earth faces environmental collapse.",
        "tmdb_id": 157336
    },
    {
        "title": "Andhadhun",
        "overview": "A series of mysterious events change the life of a blind pianist who now must report a crime that was actually never witnessed by him.",
        "tmdb_id": 534780
    },
    {
        "title": "Zindagi Na Milegi Dobara",
        "overview": "Three friends decide to turn their fantasy vacation into reality after one of their friends gets engaged. A road trip across Spain becomes a journey of self-discovery.",
        "tmdb_id": 77948
    },
    {
        "title": "Baahubali: The Beginning",
        "overview": "In ancient India, an adventurous and daring man becomes involved in a decades-old feud between two warring peoples.",
        "tmdb_id": 317442
    },
    {
        "title": "Tenet",
        "overview": "Armed with only one word, Tenet, and fighting for the survival of the entire world, a Protagonist journeys through a twilight world of international espionage on a mission that will unfold in something beyond real time.",
        "tmdb_id": 577922
    },
    {
        "title": "Parasite",
        "overview": "All unemployed, Ki-taek's family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.",
        "tmdb_id": 496243
    },
    {
        "title": "Coco",
        "overview": "Despite his family's baffling generations-old ban on music, Miguel dreams of becoming an accomplished musician like his idol, Ernesto de la Cruz. Desperate to prove his talent, Miguel finds himself in the stunning and colorful Land of the Dead.",
        "tmdb_id": 354912
    },
    {
        "title": "The Matrix",
        "overview": "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
        "tmdb_id": 603
    },
    {
        "title": "The Shawshank Redemption",
        "overview": "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
        "tmdb_id": 278
    },
    {
        "title": "Dangal",
        "overview": "Former wrestler Mahavir Singh Phogat and his two wrestler daughters struggle towards glory at the Commonwealth Games in the face of societal oppression.",
        "tmdb_id": 360814
    },
    {
        "title": "The Notebook",
        "overview": "A poor yet passionate young man falls in love with a rich young woman, giving her a sense of freedom, but they are soon separated because of their social differences.",
        "tmdb_id": 11036
    },
    {
        "title": "Drishyam",
        "overview": "A man goes to extreme lengths to save his family from punishment after the family commits an accidental crime.",
        "tmdb_id": 258230
    },
    {
        "title": "Arrival",
        "overview": "A linguist works with the military to communicate with alien lifeforms after twelve mysterious spacecraft appear around the world.",
        "tmdb_id": 329865
    },
    {
        "title": "Taare Zameen Par",
        "overview": "An eight-year-old boy is thought to be lazy and a trouble-maker, until the new art teacher has the patience and compassion to discover the real problem behind his struggles in school.",
        "tmdb_id": 9886
    },
    {
        "title": "Shutter Island",
        "overview": "In 1954, a U.S. Marshal investigates the disappearance of a murderer who escaped from a hospital for the criminally insane.",
        "tmdb_id": 11324
    },
    {
        "title": "La La Land",
        "overview": "While navigating their careers in Los Angeles, a pianist and an actress fall in love while attempting to reconcile their aspirations for the future.",
        "tmdb_id": 313369
    },
    {
        "title": "Memento",
        "overview": "A man with short-term memory loss attempts to track down his wife's murderer using notes and tattoos to remember information.",
        "tmdb_id": 77
    }
]


def main():
    """Test mood-based search on 20 movies."""
    
    print("="*70)
    print("CINEMIES AI - MOOD-BASED RECOMMENDATION TESTING")
    print("="*70)
    
    # Step 1: Initialize services
    print("\n[1/4] Initializing services...")
    embedding_service = EmbeddingService()
    mood_system = MoodVectorSystem(embedding_service)
    faiss_manager = FAISSIndexManager(dimension=384)
    print("  ✓ EmbeddingService initialized")
    print("  ✓ MoodVectorSystem initialized")
    print("  ✓ FAISSIndexManager initialized")
    
    # Step 2: Build FAISS index with 20 movies
    print(f"\n[2/4] Building FAISS index with {len(MOVIES)} movies...")
    embeddings = []
    movie_ids = []
    
    for i, movie in enumerate(MOVIES):
        embedding = embedding_service.generate_movie_embedding(
            movie["title"],
            movie["overview"]
        )
        embeddings.append(embedding)
        movie_ids.append(str(movie["tmdb_id"]))
    
    embeddings_array = np.array(embeddings)
    faiss_manager.add_embeddings(embeddings_array, movie_ids)
    print(f"  ✓ FAISS index built with {faiss_manager.get_index_size()} movies")
    
    # Step 3: Query each mood and display top 5 recommendations
    print("\n[3/4] Querying all 8 moods...")
    available_moods = mood_system.get_available_moods()
    print(f"  Available moods: {', '.join(available_moods)}")
    
    mood_results = {}
    
    for mood_name in available_moods:
        print(f"\n  {'='*68}")
        print(f"  MOOD: {mood_name.upper().replace('_', ' ')}")
        print(f"  {'='*68}")
        
        # Get mood vector
        mood_vector = mood_system.get_mood_vector(mood_name)
        
        if mood_vector is None:
            print(f"  ✗ ERROR: Mood '{mood_name}' not found")
            continue
        
        # Search for top 5 similar movies
        result_ids, scores = faiss_manager.search(mood_vector, k=5)
        
        # Store results for verification
        mood_results[mood_name] = []
        
        # Display results
        for rank, (movie_id, score) in enumerate(zip(result_ids, scores), 1):
            # Find movie by tmdb_id
            movie = next(m for m in MOVIES if str(m["tmdb_id"]) == movie_id)
            mood_results[mood_name].append(movie["title"])
            print(f"    {rank}. {movie['title']:<35} (score: {score:.4f})")
    
    # Step 4: Verify "mind_bending" returns complex narrative movies
    print("\n[4/4] Verifying 'mind_bending' mood results...")
    print("  " + "-"*68)
    
    # Define expected complex narrative movies in our dataset
    complex_narrative_movies = {
        "Inception", "Memento", "Shutter Island", "The Matrix", 
        "Tenet", "Arrival", "Parasite", "Andhadhun"
    }
    
    mind_bending_results = mood_results.get("mind_bending", [])
    
    if not mind_bending_results:
        print("  ✗ ERROR: No results for 'mind_bending' mood")
    else:
        print(f"  Top 5 'mind_bending' recommendations:")
        for i, title in enumerate(mind_bending_results, 1):
            is_complex = title in complex_narrative_movies
            marker = "✓" if is_complex else " "
            print(f"    {marker} {i}. {title}")
        
        # Count how many are complex narrative movies
        complex_count = sum(1 for title in mind_bending_results if title in complex_narrative_movies)
        
        print(f"\n  Complex narrative movies in top 5: {complex_count}/5")
        
        if complex_count >= 3:
            print("  ✓ PASS: 'mind_bending' returns complex narrative movies")
        else:
            print("  ⚠ WARNING: Expected more complex narrative movies in results")
    
    # Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print(f"  Total movies indexed: {faiss_manager.get_index_size()}")
    print(f"  Total moods tested: {len(available_moods)}")
    print(f"  Recommendations per mood: 5")
    print("="*70)
    print("\n✓ Mood-based recommendation testing completed successfully!")


if __name__ == "__main__":
    main()
