"""Script to build FAISS index with 20 movies and test semantic search."""

import numpy as np
from embedding_service import EmbeddingService
from faiss_index import FAISSIndexManager


# 20 hardcoded movies (same as embed_movies.py)
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
    """Build FAISS index with 20 movies and test semantic search."""
    
    print("="*70)
    print("CINEMIES AI - FAISS INDEX BUILDER")
    print("="*70)
    
    # Step 1: Initialize services
    print("\n[1/5] Initializing services...")
    embedding_service = EmbeddingService()
    faiss_manager = FAISSIndexManager(dimension=384)
    print("  ✓ EmbeddingService initialized")
    print("  ✓ FAISSIndexManager initialized")
    
    # Step 2: Generate embeddings for all movies
    print(f"\n[2/5] Generating embeddings for {len(MOVIES)} movies...")
    embeddings = []
    movie_ids = []
    
    for i, movie in enumerate(MOVIES):
        embedding = embedding_service.generate_movie_embedding(
            movie["title"],
            movie["overview"]
        )
        embeddings.append(embedding)
        movie_ids.append(str(movie["tmdb_id"]))
        print(f"  [{i+1}/{len(MOVIES)}] {movie['title']}")
    
    embeddings_array = np.array(embeddings)
    print(f"  ✓ Generated embeddings with shape: {embeddings_array.shape}")
    
    # Step 3: Build FAISS index
    print("\n[3/5] Building FAISS index...")
    faiss_manager.add_embeddings(embeddings_array, movie_ids)
    print(f"  ✓ FAISS index built with {faiss_manager.get_index_size()} movies")
    
    # Step 4: Test self-similarity
    print("\n[4/5] Testing self-similarity property...")
    print("  (Each movie should be its own top result with score ≈ 1.0)")
    
    test_movies = ["Inception", "The Matrix", "3 Idiots"]
    all_passed = True
    
    for movie_title in test_movies:
        # Find the movie in our list
        movie_idx = next(i for i, m in enumerate(MOVIES) if m["title"] == movie_title)
        movie_embedding = embeddings_array[movie_idx]
        
        # Search with the movie's own embedding
        result_ids, scores = faiss_manager.search(movie_embedding, k=1)
        
        # Check if the top result is the movie itself
        expected_id = str(MOVIES[movie_idx]["tmdb_id"])
        actual_id = result_ids[0]
        score = scores[0]
        
        if actual_id == expected_id and score >= 0.99:
            print(f"  ✓ {movie_title}: score={score:.4f} (PASS)")
        else:
            print(f"  ✗ {movie_title}: score={score:.4f}, expected ID={expected_id}, got ID={actual_id} (FAIL)")
            all_passed = False
    
    if all_passed:
        print("  ✓ Self-similarity test PASSED")
    else:
        print("  ✗ Self-similarity test FAILED")
    
    # Step 5: Test semantic search with text queries
    print("\n[5/5] Testing semantic search with text queries...")
    
    test_queries = [
        "mind bending thriller with twist ending",
        "heartwarming family movie about music and culture",
        "epic action movie with stunning visuals",
        "romantic love story",
        "space exploration and science fiction"
    ]
    
    for query_text in test_queries:
        print(f"\n  Query: \"{query_text}\"")
        print("  " + "-"*66)
        
        # Generate embedding for the query
        query_embedding = embedding_service.generate_embedding(query_text)
        
        # Search for top 5 similar movies
        result_ids, scores = faiss_manager.search(query_embedding, k=5)
        
        # Display results
        for rank, (movie_id, score) in enumerate(zip(result_ids, scores), 1):
            # Find movie by tmdb_id
            movie = next(m for m in MOVIES if str(m["tmdb_id"]) == movie_id)
            print(f"    {rank}. {movie['title']:<30} (score: {score:.4f})")
    
    # Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print(f"  Total movies indexed: {faiss_manager.get_index_size()}")
    print(f"  Embedding dimension: {embeddings_array.shape[1]}")
    print(f"  Self-similarity test: {'PASSED' if all_passed else 'FAILED'}")
    print(f"  Semantic search queries tested: {len(test_queries)}")
    print("="*70)
    print("\n✓ FAISS index testing completed successfully!")


if __name__ == "__main__":
    main()
