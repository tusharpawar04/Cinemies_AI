"""Script to generate embeddings for 20 hardcoded movies and test similarity."""

import numpy as np
from embedding_service import EmbeddingService


def main():
    """Generate embeddings for 20 movies and test cosine similarity."""
    
    # Initialize embedding service
    print("Initializing EmbeddingService...")
    embedding_service = EmbeddingService()
    
    # Define 20 hardcoded movies with real plot summaries
    movies = [
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
    
    print(f"\nGenerating embeddings for {len(movies)} movies...")
    
    # Generate embeddings for all movies
    embeddings = []
    for i, movie in enumerate(movies):
        embedding = embedding_service.generate_movie_embedding(
            movie["title"], 
            movie["overview"]
        )
        embeddings.append(embedding)
        print(f"  [{i+1}/{len(movies)}] Generated embedding for '{movie['title']}'")
    
    # Convert to numpy array
    embeddings_array = np.array(embeddings)
    
    # Print embedding information
    print(f"\n{'='*60}")
    print("EMBEDDING INFORMATION")
    print(f"{'='*60}")
    print(f"Total movies: {len(movies)}")
    print(f"Embeddings shape: {embeddings_array.shape}")
    print(f"Embedding dimension: {embeddings_array.shape[1]}")
    print(f"Data type: {embeddings_array.dtype}")
    
    # Print sample embedding values
    print(f"\n{'='*60}")
    print("SAMPLE EMBEDDING (Inception - first 10 values)")
    print(f"{'='*60}")
    print(embeddings_array[0][:10])
    
    # Verify normalization
    print(f"\n{'='*60}")
    print("NORMALIZATION VERIFICATION")
    print(f"{'='*60}")
    for i in range(min(5, len(movies))):
        norm = np.linalg.norm(embeddings_array[i])
        print(f"  {movies[i]['title']}: L2 norm = {norm:.6f}")
    
    # Test cosine similarity between similar movies
    print(f"\n{'='*60}")
    print("COSINE SIMILARITY TESTS")
    print(f"{'='*60}")
    
    def cosine_similarity(vec1, vec2):
        """Calculate cosine similarity between two vectors."""
        # Since vectors are already normalized, dot product = cosine similarity
        return np.dot(vec1, vec2)
    
    # Find indices of specific movies
    movie_indices = {movie["title"]: i for i, movie in enumerate(movies)}
    
    # Test 1: Sci-fi movies (Inception vs Tenet)
    inception_idx = movie_indices["Inception"]
    tenet_idx = movie_indices["Tenet"]
    similarity_scifi = cosine_similarity(
        embeddings_array[inception_idx], 
        embeddings_array[tenet_idx]
    )
    print(f"\nSci-fi similarity:")
    print(f"  Inception <-> Tenet: {similarity_scifi:.4f}")
    
    # Test 2: Inception vs Romance movie (The Notebook)
    notebook_idx = movie_indices["The Notebook"]
    similarity_romance = cosine_similarity(
        embeddings_array[inception_idx], 
        embeddings_array[notebook_idx]
    )
    print(f"\nCross-genre similarity:")
    print(f"  Inception <-> The Notebook: {similarity_romance:.4f}")
    
    # Test 3: Mind-bending movies (Inception vs Memento)
    memento_idx = movie_indices["Memento"]
    similarity_mindbending = cosine_similarity(
        embeddings_array[inception_idx], 
        embeddings_array[memento_idx]
    )
    print(f"\nMind-bending similarity:")
    print(f"  Inception <-> Memento: {similarity_mindbending:.4f}")
    
    # Test 4: Bollywood movies (3 Idiots vs Dangal)
    idiots_idx = movie_indices["3 Idiots"]
    dangal_idx = movie_indices["Dangal"]
    similarity_bollywood = cosine_similarity(
        embeddings_array[idiots_idx], 
        embeddings_array[dangal_idx]
    )
    print(f"\nBollywood similarity:")
    print(f"  3 Idiots <-> Dangal: {similarity_bollywood:.4f}")
    
    # Verify that similar movies have higher similarity
    print(f"\n{'='*60}")
    print("SIMILARITY VALIDATION")
    print(f"{'='*60}")
    if similarity_scifi > similarity_romance:
        print("✓ PASS: Inception-Tenet (sci-fi) similarity > Inception-Notebook (romance)")
    else:
        print("✗ FAIL: Expected sci-fi movies to be more similar than cross-genre")
    
    if similarity_mindbending > similarity_romance:
        print("✓ PASS: Inception-Memento (mind-bending) similarity > Inception-Notebook (romance)")
    else:
        print("✗ FAIL: Expected mind-bending movies to be more similar than cross-genre")
    
    # Save embeddings to file
    output_file = "cinemies-ai/movie_embeddings.npy"
    np.save(output_file, embeddings_array)
    print(f"\n{'='*60}")
    print(f"Embeddings saved to: {output_file}")
    print(f"{'='*60}")
    
    # Print top 5 most similar movies to Inception
    print(f"\n{'='*60}")
    print("TOP 5 MOST SIMILAR MOVIES TO INCEPTION")
    print(f"{'='*60}")
    inception_embedding = embeddings_array[inception_idx]
    similarities = []
    for i, movie in enumerate(movies):
        if i != inception_idx:  # Skip Inception itself
            sim = cosine_similarity(inception_embedding, embeddings_array[i])
            similarities.append((movie["title"], sim))
    
    # Sort by similarity (descending)
    similarities.sort(key=lambda x: x[1], reverse=True)
    
    for rank, (title, sim) in enumerate(similarities[:5], 1):
        print(f"  {rank}. {title}: {sim:.4f}")
    
    print(f"\n{'='*60}")
    print("SCRIPT COMPLETED SUCCESSFULLY")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
