"""Unit tests for FAISSIndexManager."""

import pytest
import numpy as np
from faiss_index import FAISSIndexManager


class TestFAISSIndexManager:
    """Test suite for FAISSIndexManager class."""
    
    def test_init_creates_index_with_correct_dimension(self):
        """Test that initialization creates an index with the specified dimension."""
        manager = FAISSIndexManager(dimension=384)
        assert manager.dimension == 384
        assert manager.get_index_size() == 0
        assert manager.movie_ids == []
    
    def test_init_with_custom_dimension(self):
        """Test initialization with a custom dimension."""
        manager = FAISSIndexManager(dimension=128)
        assert manager.dimension == 128
    
    def test_add_embeddings_single_vector(self):
        """Test adding a single embedding vector."""
        manager = FAISSIndexManager(dimension=384)
        embedding = np.random.rand(1, 384).astype(np.float32)
        movie_ids = ["movie_1"]
        
        manager.add_embeddings(embedding, movie_ids)
        
        assert manager.get_index_size() == 1
        assert manager.movie_ids == ["movie_1"]
    
    def test_add_embeddings_multiple_vectors(self):
        """Test adding multiple embedding vectors."""
        manager = FAISSIndexManager(dimension=384)
        embeddings = np.random.rand(5, 384).astype(np.float32)
        movie_ids = ["movie_1", "movie_2", "movie_3", "movie_4", "movie_5"]
        
        manager.add_embeddings(embeddings, movie_ids)
        
        assert manager.get_index_size() == 5
        assert manager.movie_ids == movie_ids
    
    def test_add_embeddings_maintains_previous_entries(self):
        """Test that adding embeddings preserves previously indexed movies (monotonic growth)."""
        manager = FAISSIndexManager(dimension=384)
        
        # Add first batch
        embeddings1 = np.random.rand(3, 384).astype(np.float32)
        movie_ids1 = ["movie_1", "movie_2", "movie_3"]
        manager.add_embeddings(embeddings1, movie_ids1)
        
        # Add second batch
        embeddings2 = np.random.rand(2, 384).astype(np.float32)
        movie_ids2 = ["movie_4", "movie_5"]
        manager.add_embeddings(embeddings2, movie_ids2)
        
        assert manager.get_index_size() == 5
        assert manager.movie_ids == ["movie_1", "movie_2", "movie_3", "movie_4", "movie_5"]
    
    def test_add_embeddings_converts_dtype_to_float32(self):
        """Test that embeddings are converted to float32 if needed."""
        manager = FAISSIndexManager(dimension=384)
        embeddings = np.random.rand(2, 384).astype(np.float64)  # float64
        movie_ids = ["movie_1", "movie_2"]
        
        # Should not raise an error
        manager.add_embeddings(embeddings, movie_ids)
        assert manager.get_index_size() == 2
    
    def test_add_embeddings_raises_error_for_wrong_dimension(self):
        """Test that adding embeddings with wrong dimension raises ValueError."""
        manager = FAISSIndexManager(dimension=384)
        embeddings = np.random.rand(2, 256).astype(np.float32)  # Wrong dimension
        movie_ids = ["movie_1", "movie_2"]
        
        with pytest.raises(ValueError, match="doesn't match index dimension"):
            manager.add_embeddings(embeddings, movie_ids)
    
    def test_add_embeddings_raises_error_for_1d_array(self):
        """Test that adding 1D array raises ValueError."""
        manager = FAISSIndexManager(dimension=384)
        embeddings = np.random.rand(384).astype(np.float32)  # 1D array
        movie_ids = ["movie_1"]
        
        with pytest.raises(ValueError, match="Expected 2D array"):
            manager.add_embeddings(embeddings, movie_ids)
    
    def test_add_embeddings_raises_error_for_mismatched_counts(self):
        """Test that mismatched embedding and movie_id counts raises ValueError."""
        manager = FAISSIndexManager(dimension=384)
        embeddings = np.random.rand(3, 384).astype(np.float32)
        movie_ids = ["movie_1", "movie_2"]  # Only 2 IDs for 3 embeddings
        
        with pytest.raises(ValueError, match="doesn't match number of movie_ids"):
            manager.add_embeddings(embeddings, movie_ids)
    
    def test_search_returns_correct_movie_ids(self):
        """Test that search returns the correct movie IDs."""
        manager = FAISSIndexManager(dimension=384)
        
        # Create normalized embeddings
        embeddings = np.random.rand(3, 384).astype(np.float32)
        embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
        movie_ids = ["movie_1", "movie_2", "movie_3"]
        
        manager.add_embeddings(embeddings, movie_ids)
        
        # Search with the first embedding (should return itself as top result)
        query_vector = embeddings[0]
        result_ids, scores = manager.search(query_vector, k=3)
        
        assert len(result_ids) == 3
        assert len(scores) == 3
        assert result_ids[0] == "movie_1"  # Top result should be the query itself
    
    def test_search_returns_top_k_results(self):
        """Test that search returns exactly k results when k < index size."""
        manager = FAISSIndexManager(dimension=384)
        
        embeddings = np.random.rand(10, 384).astype(np.float32)
        movie_ids = [f"movie_{i}" for i in range(10)]
        manager.add_embeddings(embeddings, movie_ids)
        
        query_vector = np.random.rand(384).astype(np.float32)
        result_ids, scores = manager.search(query_vector, k=5)
        
        assert len(result_ids) == 5
        assert len(scores) == 5
    
    def test_search_limits_k_to_index_size(self):
        """Test that search limits k to the actual index size."""
        manager = FAISSIndexManager(dimension=384)
        
        embeddings = np.random.rand(3, 384).astype(np.float32)
        movie_ids = ["movie_1", "movie_2", "movie_3"]
        manager.add_embeddings(embeddings, movie_ids)
        
        query_vector = np.random.rand(384).astype(np.float32)
        result_ids, scores = manager.search(query_vector, k=10)  # Request more than available
        
        assert len(result_ids) == 3  # Should return only 3
        assert len(scores) == 3
    
    def test_search_on_empty_index_returns_empty_lists(self):
        """Test that searching an empty index returns empty lists."""
        manager = FAISSIndexManager(dimension=384)
        
        query_vector = np.random.rand(384).astype(np.float32)
        result_ids, scores = manager.search(query_vector, k=5)
        
        assert result_ids == []
        assert scores == []
    
    def test_search_raises_error_for_wrong_dimension(self):
        """Test that search raises ValueError for wrong query dimension."""
        manager = FAISSIndexManager(dimension=384)
        
        embeddings = np.random.rand(2, 384).astype(np.float32)
        movie_ids = ["movie_1", "movie_2"]
        manager.add_embeddings(embeddings, movie_ids)
        
        query_vector = np.random.rand(256).astype(np.float32)  # Wrong dimension
        
        with pytest.raises(ValueError, match="doesn't match index dimension"):
            manager.search(query_vector, k=5)
    
    def test_search_raises_error_for_2d_query(self):
        """Test that search raises ValueError for 2D query vector."""
        manager = FAISSIndexManager(dimension=384)
        
        embeddings = np.random.rand(2, 384).astype(np.float32)
        movie_ids = ["movie_1", "movie_2"]
        manager.add_embeddings(embeddings, movie_ids)
        
        query_vector = np.random.rand(1, 384).astype(np.float32)  # 2D array
        
        with pytest.raises(ValueError, match="Expected 1D array"):
            manager.search(query_vector, k=5)
    
    def test_search_raises_error_for_k_less_than_1(self):
        """Test that search raises ValueError for k < 1."""
        manager = FAISSIndexManager(dimension=384)
        
        embeddings = np.random.rand(2, 384).astype(np.float32)
        movie_ids = ["movie_1", "movie_2"]
        manager.add_embeddings(embeddings, movie_ids)
        
        query_vector = np.random.rand(384).astype(np.float32)
        
        with pytest.raises(ValueError, match="k must be at least 1"):
            manager.search(query_vector, k=0)
    
    def test_search_converts_dtype_to_float32(self):
        """Test that search converts query vector to float32 if needed."""
        manager = FAISSIndexManager(dimension=384)
        
        embeddings = np.random.rand(2, 384).astype(np.float32)
        movie_ids = ["movie_1", "movie_2"]
        manager.add_embeddings(embeddings, movie_ids)
        
        query_vector = np.random.rand(384).astype(np.float64)  # float64
        
        # Should not raise an error
        result_ids, scores = manager.search(query_vector, k=2)
        assert len(result_ids) == 2
    
    def test_search_self_similarity(self):
        """Test that searching with a movie's own embedding returns it as top result with high score."""
        manager = FAISSIndexManager(dimension=384)
        
        # Create normalized embeddings
        embeddings = np.random.rand(5, 384).astype(np.float32)
        embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
        movie_ids = ["movie_1", "movie_2", "movie_3", "movie_4", "movie_5"]
        
        manager.add_embeddings(embeddings, movie_ids)
        
        # Search with movie_3's embedding
        query_vector = embeddings[2]
        result_ids, scores = manager.search(query_vector, k=5)
        
        # Top result should be movie_3 with score approximately 1.0
        assert result_ids[0] == "movie_3"
        assert scores[0] >= 0.99  # Should be very close to 1.0 for normalized vectors
    
    def test_get_index_size_returns_zero_initially(self):
        """Test that get_index_size returns 0 for a new index."""
        manager = FAISSIndexManager(dimension=384)
        assert manager.get_index_size() == 0
    
    def test_get_index_size_returns_correct_count(self):
        """Test that get_index_size returns the correct number of indexed vectors."""
        manager = FAISSIndexManager(dimension=384)
        
        embeddings = np.random.rand(7, 384).astype(np.float32)
        movie_ids = [f"movie_{i}" for i in range(7)]
        manager.add_embeddings(embeddings, movie_ids)
        
        assert manager.get_index_size() == 7
    
    def test_search_returns_scores_in_descending_order(self):
        """Test that search returns similarity scores in descending order."""
        manager = FAISSIndexManager(dimension=384)
        
        # Create normalized embeddings
        embeddings = np.random.rand(10, 384).astype(np.float32)
        embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
        movie_ids = [f"movie_{i}" for i in range(10)]
        
        manager.add_embeddings(embeddings, movie_ids)
        
        query_vector = np.random.rand(384).astype(np.float32)
        query_vector = query_vector / np.linalg.norm(query_vector)
        
        result_ids, scores = manager.search(query_vector, k=10)
        
        # Verify scores are in descending order
        for i in range(len(scores) - 1):
            assert scores[i] >= scores[i + 1], f"Scores not in descending order: {scores}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
