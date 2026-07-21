"""Embedding generation service using SentenceTransformers."""

import numpy as np
from sentence_transformers import SentenceTransformer


class EmbeddingService:
    """Generates normalized embeddings using SentenceTransformers."""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize the embedding model.
        
        Args:
            model_name: Name of the SentenceTransformer model to load
        """
        self.model = SentenceTransformer(model_name)
    
    def generate_embedding(self, text: str) -> np.ndarray:
        """
        Generate a normalized 384-dimensional embedding.
        
        Args:
            text: Input text to embed
            
        Returns:
            Normalized numpy array of shape (384,)
        """
        # Generate embedding using the model
        embedding = self.model.encode(text, convert_to_numpy=True)
        
        # L2 normalize the embedding to unit length
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        
        return embedding
    
    def generate_movie_embedding(self, title: str, overview: str, genres: list = None, year: int = None, industry: str = None) -> np.ndarray:
        """
        Generate embedding from movie title, overview, and metadata.
        
        Args:
            title: Movie title
            overview: Movie plot overview
            genres: List of genre strings (optional)
            year: Release year (optional)
            industry: Movie industry e.g. 'hollywood' (optional)
            
        Returns:
            Normalized embedding vector
        """
        # Build a rich text representation including metadata
        parts = [title]
        if overview:
            parts.append(overview)
        if genres:
            parts.append(f"Genres: {', '.join(genres)}")
        if year:
            parts.append(f"Released in {year}")
        if industry:
            parts.append(f"{industry} film")
        
        combined_text = " ".join(parts)
        
        # Generate and return the normalized embedding
        return self.generate_embedding(combined_text)
