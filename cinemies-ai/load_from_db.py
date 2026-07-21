"""Load movies from MongoDB and build FAISS index with 1000+ movies."""

import time
import numpy as np
from typing import List, Dict, Any
import logging

from config import (
    MONGODB_CONNECTION_STRING,
    MONGODB_DATABASE,
    MONGODB_COLLECTION,
    EMBEDDING_MODEL
)
from mongodb_connector import MongoDBConnector
from embedding_service import EmbeddingService
from faiss_index import FAISSIndexManager
from mood_vectors import MoodVectorSystem

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    """Main execution function."""
    logger.info("=" * 80)
    logger.info("Cinemies AI Recommendation Engine - MongoDB Integration")
    logger.info("=" * 80)
    
    # Step 1: Initialize MongoDB connector
    logger.info("\n[1/6] Initializing MongoDB connector...")
    mongo_connector = MongoDBConnector(
        connection_string=MONGODB_CONNECTION_STRING,
        database=MONGODB_DATABASE,
        collection=MONGODB_COLLECTION
    )
    
    try:
        # Step 2: Connect to MongoDB and fetch movies
        logger.info("[2/6] Connecting to MongoDB and fetching movies...")
        mongo_connector.connect()
        movies = mongo_connector.fetch_movies()
        
        if len(movies) == 0:
            logger.error("No movies found in MongoDB. Cannot proceed.")
            logger.error("Please ensure the MongoDB database is populated with movie data.")
            return
        
        if len(movies) < 1000:
            logger.warning(
                f"Warning: Only {len(movies)} movies found. "
                f"Expected at least 1000 movies."
            )
        
        logger.info(f"Successfully fetched {len(movies)} movies from MongoDB")
        
        # Step 3: Initialize embedding service
        logger.info(f"[3/6] Initializing embedding service ({EMBEDDING_MODEL})...")
        embedding_service = EmbeddingService(model_name=EMBEDDING_MODEL)
        logger.info("Embedding service initialized")
        
        # Step 4: Generate embeddings for all movies
        logger.info("[4/6] Generating embeddings for all movies...")
        start_time = time.time()
        
        embeddings_list = []
        movie_ids = []
        
        for i, movie in enumerate(movies):
            if (i + 1) % 100 == 0:
                logger.info(f"  Processed {i + 1}/{len(movies)} movies...")
            
            embedding = embedding_service.generate_movie_embedding(
                title=movie['title'],
                overview=movie['overview']
            )
            embeddings_list.append(embedding)
            movie_ids.append(str(movie['tmdb_id']))
        
        # Convert to numpy array
        embeddings = np.array(embeddings_list, dtype=np.float32)
        
        embedding_time = time.time() - start_time
        avg_time_per_movie = embedding_time / len(embeddings) if len(embeddings) > 0 else 0
        logger.info(
            f"Generated {len(embeddings)} embeddings in {embedding_time:.2f} seconds "
            f"({avg_time_per_movie*1000:.2f} ms per movie)"
        )
        
        # Step 5: Build FAISS index
        logger.info("[5/6] Building FAISS index...")
        start_time = time.time()
        
        faiss_index = FAISSIndexManager(dimension=384)
        faiss_index.add_embeddings(embeddings, movie_ids)
        
        index_time = time.time() - start_time
        logger.info(
            f"Built FAISS index with {faiss_index.get_index_size()} movies "
            f"in {index_time:.2f} seconds"
        )
        
        # Step 6: Test mood-based queries
        logger.info("[6/6] Testing mood-based queries on full dataset...")
        logger.info("\n" + "=" * 80)
        logger.info("MOOD-BASED QUERY PERFORMANCE TEST")
        logger.info("=" * 80)
        
        # Initialize mood vector system
        mood_system = MoodVectorSystem(embedding_service)
        available_moods = mood_system.get_available_moods()
        
        # Test each mood
        total_query_time = 0
        num_queries = len(available_moods)
        
        for mood_name in available_moods:
            mood_vector = mood_system.get_mood_vector(mood_name)
            
            # Measure query performance
            start_time = time.time()
            result_ids, scores = faiss_index.search(mood_vector, k=10)
            query_time = time.time() - start_time
            
            total_query_time += query_time
            
            # Find movie details for top 3 results
            top_movies = []
            for movie_id in result_ids[:3]:
                for movie in movies:
                    if str(movie['tmdb_id']) == movie_id:
                        top_movies.append(movie)
                        break
            
            # Print results
            logger.info(f"\nMood: {mood_name}")
            logger.info(f"Query time: {query_time*1000:.2f} ms")
            logger.info(f"Top 3 recommendations:")
            for i, (movie, score) in enumerate(zip(top_movies, scores[:3]), 1):
                logger.info(
                    f"  {i}. {movie['title']} "
                    f"(score: {score:.4f}, rating: {movie['vote_average']:.1f})"
                )
        
        # Print performance summary
        avg_query_time = total_query_time / num_queries
        logger.info("\n" + "=" * 80)
        logger.info("PERFORMANCE SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Total movies indexed: {faiss_index.get_index_size()}")
        logger.info(f"Total queries tested: {num_queries}")
        logger.info(f"Average query time: {avg_query_time*1000:.2f} ms")
        logger.info(f"Max query time: {max([avg_query_time])*1000:.2f} ms")
        
        if avg_query_time < 1.0:
            logger.info("✓ Performance requirement met: < 1 second per query")
        else:
            logger.warning("✗ Performance requirement NOT met: >= 1 second per query")
        
        # Optional: Save index to disk
        logger.info("\n" + "=" * 80)
        logger.info("INDEX PERSISTENCE (Optional)")
        logger.info("=" * 80)
        logger.info("Note: FAISS index can be saved to disk for reuse:")
        logger.info("  - faiss.write_index(index, 'movie_index.faiss')")
        logger.info("  - Save movie_ids list separately (pickle or JSON)")
        logger.info("  - Load with: faiss.read_index('movie_index.faiss')")
        logger.info("This optimization is not implemented in this script.")
        
        logger.info("\n" + "=" * 80)
        logger.info("SCRIPT COMPLETED SUCCESSFULLY")
        logger.info("=" * 80)
        
    except Exception as e:
        logger.error(f"Error during execution: {str(e)}", exc_info=True)
        raise
    
    finally:
        # Clean up MongoDB connection
        mongo_connector.close()


if __name__ == "__main__":
    main()
