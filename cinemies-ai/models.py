"""Pydantic models for API request/response validation."""

from pydantic import BaseModel, Field, field_validator
from typing import List, Literal


class MovieRecommendation(BaseModel):
    """Single movie recommendation with metadata."""
    title: str
    overview: str
    tmdb_id: int
    poster_url: str
    vote_average: float
    genres: List[str]
    match_score: float = Field(..., ge=0.0, le=1.0)
    reason: str = Field(default="Recommended for you", description="Explainability reason for recommendation")


class RecommendationResponse(BaseModel):
    """Response model for /recommend endpoint."""
    mood: str
    recommendations: List[MovieRecommendation]
    count: int


class HealthResponse(BaseModel):
    """Response model for /health endpoint."""
    status: str
    indexed_movies: int
    available_moods: List[str]


class ErrorResponse(BaseModel):
    """Error response model."""
    error: str
    detail: str


# Taste Vector Generation Models

class RatedMovie(BaseModel):
    """A single rated movie during taste calibration."""
    tmdb_id: int = Field(..., description="TMDB movie ID")
    rating: Literal[-1, 0, 1] = Field(..., description="Rating: 1 (Good), 0 (Don't Know), -1 (Bad)")


class TasteVectorRequest(BaseModel):
    """Request model for /generate-taste-vector endpoint."""
    rated_movies: List[RatedMovie] = Field(..., min_length=1, description="Array of rated movies")
    
    @field_validator('rated_movies')
    @classmethod
    def validate_ratings(cls, v: List[RatedMovie]) -> List[RatedMovie]:
        """Validate that sufficient good and bad ratings are provided."""
        good_count = sum(1 for m in v if m.rating == 1)
        bad_count = sum(1 for m in v if m.rating == -1)
        
        if good_count < 3:
            raise ValueError(f"At least 3 'Good' ratings required, got {good_count}")
        
        
        return v


class TasteVectorResponse(BaseModel):
    """Response model for /generate-taste-vector endpoint."""
    taste_vector: List[float] = Field(..., description="384-dimensional taste vector")
    dimension: int = Field(384, description="Vector dimensionality")
    liked_count: int = Field(..., description="Number of 'Good' movies processed")
    disliked_count: int = Field(..., description="Number of 'Bad' movies processed")
    neutral_count: int = Field(..., description="Number of 'Don't Know' movies")
    alpha: float = Field(..., description="Alpha parameter used in computation")
    warnings: List[str] = Field(default_factory=list, description="Optional warnings about vector quality")


# Real-time Taste Vector Update Models

class UpdateTasteVectorRequest(BaseModel):
    """Request model for /update-taste-vector endpoint."""
    user_id: str = Field(..., description="User ID")
    clicked_movie_ids: List[int] = Field(..., min_length=1, description="Array of clicked movie TMDB IDs")
    current_taste_vector: List[float] = Field(..., min_length=384, max_length=384, description="Current 384-dimensional taste vector")
    interaction_count: int = Field(0, ge=0, description="Total post-calibration interactions (used for S-curve blending alpha)")


class UpdateTasteVectorResponse(BaseModel):
    """Response model for /update-taste-vector endpoint."""
    updated_taste_vector: List[float] = Field(..., description="Updated 384-dimensional taste vector")
    dimension: int = Field(384, description="Vector dimensionality")
    clicked_count: int = Field(..., description="Number of clicked movies processed")
    similarity_to_old: float = Field(..., ge=0.0, le=1.0, description="Cosine similarity between old and new taste vectors")
    major_taste_shift: bool = Field(False, description="Whether a major taste shift was detected (similarity < 0.5)")
    warnings: List[str] = Field(default_factory=list, description="Optional warnings")


# Collaborative Filtering Models

class UserTasteVector(BaseModel):
    """A single user's taste vector for collaborative filtering."""
    user_id: str = Field(..., description="User ID")
    taste_vector: List[float] = Field(..., min_length=384, max_length=384, description="384-dimensional taste vector")


class CollaborativeVectorRequest(BaseModel):
    """Request model for /collaborative-vector endpoint."""
    user_id: str = Field(..., description="The requesting user's ID")
    current_taste_vector: List[float] = Field(..., min_length=384, max_length=384, description="Requesting user's 384-dimensional taste vector")
    other_users: List[UserTasteVector] = Field(..., description="List of other users' taste vectors to compare against")
    min_similarity: float = Field(0.6, ge=0.0, le=1.0, description="Minimum cosine similarity threshold for similar users")
    min_similar_users: int = Field(3, ge=1, description="Minimum number of similar users required to compute vector")


class CollaborativeVectorResponse(BaseModel):
    """Response model for /collaborative-vector endpoint."""
    collaborative_vector: List[float] = Field(default_factory=list, description="Computed collaborative vector (empty if insufficient similar users)")
    similar_user_count: int = Field(0, description="Number of users found above similarity threshold")
    available: bool = Field(False, description="Whether a collaborative vector was successfully computed")
    avg_similarity: float = Field(0.0, description="Average cosine similarity among similar users")

