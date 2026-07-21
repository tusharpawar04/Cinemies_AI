"""FAISS Index Manager for movie embeddings."""

import faiss
import numpy as np
from typing import List, Tuple


class FAISSIndexManager:
    """Manages FAISS index for movie embeddings."""
    
    def __init__(self, dimension: int = 384):
        """
        Initialize FAISS index with specified dimension.
        
        Args:
            dimension: Dimension of embedding vectors (default: 384)
        """
        self.dimension = dimension
        self.index = faiss.IndexFlatIP(dimension)
        self.movie_ids: List[str] = []
    
    def add_embeddings(self, embeddings: np.ndarray, movie_ids: List[str]) -> None:
        """
        Add movie embeddings to the index.
        
        Args:
            embeddings: Array of shape (N, 384) containing movie embeddings
            movie_ids: List of movie identifiers corresponding to embeddings
        
        Raises:
            ValueError: If embeddings shape doesn't match expected dimension
            ValueError: If number of embeddings doesn't match number of movie_ids
        """
        if embeddings.ndim != 2:
            raise ValueError(f"Expected 2D array, got shape {embeddings.shape}")
        
        if embeddings.shape[1] != self.dimension:
            raise ValueError(
                f"Embedding dimension {embeddings.shape[1]} doesn't match "
                f"index dimension {self.dimension}"
            )
        
        if embeddings.shape[0] != len(movie_ids):
            raise ValueError(
                f"Number of embeddings ({embeddings.shape[0]}) doesn't match "
                f"number of movie_ids ({len(movie_ids)})"
            )
        
        # Convert to float32 if needed (FAISS requires float32)
        if embeddings.dtype != np.float32:
            embeddings = embeddings.astype(np.float32)
        
        # Add to FAISS index
        self.index.add(embeddings)
        
        # Maintain movie ID mapping
        self.movie_ids.extend(movie_ids)
    
    def search(self, query_vector: np.ndarray, k: int = 10) -> Tuple[List[str], List[float]]:
        """
        Search for top-k most similar movies.
        
        Args:
            query_vector: Query embedding of shape (384,)
            k: Number of results to return
            
        Returns:
            Tuple of (movie_ids, similarity_scores)
            
        Raises:
            ValueError: If query_vector has incorrect shape
            ValueError: If k is less than 1
        """
        if query_vector.ndim != 1:
            raise ValueError(f"Expected 1D array, got shape {query_vector.shape}")
        
        if query_vector.shape[0] != self.dimension:
            raise ValueError(
                f"Query vector dimension {query_vector.shape[0]} doesn't match "
                f"index dimension {self.dimension}"
            )
        
        if k < 1:
            raise ValueError(f"k must be at least 1, got {k}")
        
        # Limit k to index size
        k = min(k, self.get_index_size())
        
        if k == 0:
            return [], []
        
        # Convert to float32 and reshape for FAISS (expects 2D array)
        if query_vector.dtype != np.float32:
            query_vector = query_vector.astype(np.float32)
        query_vector = query_vector.reshape(1, -1)
        
        # Search FAISS index
        distances, indices = self.index.search(query_vector, k)
        
        # Convert results to lists
        distances = distances[0].tolist()
        indices = indices[0].tolist()
        
        # Map indices to movie IDs
        result_movie_ids = [self.movie_ids[idx] for idx in indices]
        
        return result_movie_ids, distances
    
    def get_index_size(self) -> int:
        """
        Return the number of vectors in the index.
        
        Returns:
            Number of indexed vectors
        """
        return self.index.ntotal
