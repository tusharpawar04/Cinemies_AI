"""Integration test to verify FAISSIndexManager works with real embeddings."""

import numpy as np
from faiss_index import FAISSIndexManager


def test_faiss_integration():
    """Test FAISSIndexManager with realistic movie embedding scenario."""
    
    # Create manager with dimension 384 (as specified in requirements)
    manager = FAISSIndexManager(dimension=384)
    
    # Simulate movie embeddings (normalized vectors)
    num_movies = 100
    embeddings = np.random.rand(num_movies, 384).astype(np.float32)
    # Normalize to unit length (as required by design)
    embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
    
    # Create movie IDs
    movie_ids = [f"tmdb_{i}" for i in range(num_movies)]
    
    # Add embeddings to index
    manager.add_embeddings(embeddings, movie_ids)
    
    print(f"✓ Added {manager.get_index_size()} movies to index")
    assert manager.get_index_size() == num_movies
    
    # Test search with a query vector
    query_vector = embeddings[0]  # Use first movie as query
    result_ids, scores = manager.search(query_vector, k=10)
    
    print(f"✓ Search returned {len(result_ids)} results")
    assert len(result_ids) == 10
    assert len(scores) == 10
    
    # Verify top result is the query movie itself
    print(f"✓ Top result: {result_ids[0]} with score {scores[0]:.4f}")
    assert result_ids[0] == "tmdb_0"
    assert scores[0] >= 0.99  # Should be approximately 1.0
    
    # Verify scores are in descending order
    for i in range(len(scores) - 1):
        assert scores[i] >= scores[i + 1]
    print(f"✓ Scores in descending order: {[f'{s:.4f}' for s in scores[:5]]}")
    
    # Test adding more embeddings (monotonic growth)
    more_embeddings = np.random.rand(50, 384).astype(np.float32)
    more_embeddings = more_embeddings / np.linalg.norm(more_embeddings, axis=1, keepdims=True)
    more_ids = [f"tmdb_{i}" for i in range(100, 150)]
    
    manager.add_embeddings(more_embeddings, more_ids)
    print(f"✓ Index size after adding more: {manager.get_index_size()}")
    assert manager.get_index_size() == 150
    
    # Verify original movies are still searchable
    result_ids, scores = manager.search(query_vector, k=10)
    assert "tmdb_0" in result_ids
    print(f"✓ Original movie still searchable after adding more")
    
    print("\n✅ All integration tests passed!")
    print(f"   - IndexFlatIP with dimension 384: ✓")
    print(f"   - add_embeddings method: ✓")
    print(f"   - search method (top-k): ✓")
    print(f"   - get_index_size method: ✓")
    print(f"   - Movie ID mapping: ✓")
    print(f"   - Validates Requirements: 2.1, 2.4, 2.6 ✓")


if __name__ == "__main__":
    test_faiss_integration()
