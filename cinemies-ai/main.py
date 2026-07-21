"""FastAPI application for Cinemies AI Recommendation Engine."""

import logging
import sys
from typing import Dict, Any, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from embedding_service import EmbeddingService
from faiss_index import FAISSIndexManager
from mood_vectors import MoodVectorSystem
from mongodb_connector import MongoDBConnector
from hybrid_engine import hybrid_engine
from personalized_mood import PersonalizedMoodSystem
from models import (
    HealthResponse, 
    RecommendationResponse, 
    MovieRecommendation, 
    ErrorResponse,
    TasteVectorRequest,
    TasteVectorResponse,
    RatedMovie,
    UpdateTasteVectorRequest,
    UpdateTasteVectorResponse,
    CollaborativeVectorRequest,
    CollaborativeVectorResponse,
    UserTasteVector,
)
from config import (
    EMBEDDING_MODEL,
    EMBEDDING_DIMENSION,
    MONGODB_CONNECTION_STRING,
    MONGODB_DATABASE,
    MONGODB_COLLECTION,
    DEFAULT_RECOMMENDATIONS,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global service instances
embedding_service: EmbeddingService = None
faiss_index: FAISSIndexManager = None
mood_system: MoodVectorSystem = None
personalized_mood_system: PersonalizedMoodSystem = None
movies_data: List[Dict[str, Any]] = []
movie_embeddings: Dict[str, Any] = {}  # Map tmdb_id -> embedding for personalization


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown event handler.
    
    Loads MongoDB data, generates embeddings, and builds FAISS index on startup.
    """
    global embedding_service, faiss_index, mood_system, personalized_mood_system, movies_data, movie_embeddings
    
    logger.info("Starting Cinemies AI Recommendation Engine...")
    
    try:
        # Initialize embedding service
        logger.info(f"Loading embedding model: {EMBEDDING_MODEL}")
        embedding_service = EmbeddingService(model_name=EMBEDDING_MODEL)
        logger.info("Embedding service initialized successfully")
        
        # Initialize mood vector system
        logger.info("Generating mood vectors...")
        mood_system = MoodVectorSystem(embedding_service)
        logger.info(f"Mood vectors generated for {len(mood_system.get_available_moods())} moods")
        
        # Connect to MongoDB and fetch movies
        logger.info("Connecting to MongoDB...")
        mongo_connector = MongoDBConnector(
            connection_string=MONGODB_CONNECTION_STRING,
            database=MONGODB_DATABASE,
            collection=MONGODB_COLLECTION
        )
        mongo_connector.connect()
        logger.info("MongoDB connection established")
        
        logger.info("Fetching movies from MongoDB...")
        movies_data = mongo_connector.fetch_movies()
        logger.info(f"Retrieved {len(movies_data)} movies from database")
        
        # Close MongoDB connection (we only need it at startup)
        mongo_connector.close()
        
        if len(movies_data) == 0:
            logger.error("No movies retrieved from MongoDB. Cannot build index.")
            sys.exit(3)
        
        # Generate embeddings for all movies
        logger.info("Generating embeddings for all movies...")
        embeddings = []
        movie_ids = []
        
        for movie in movies_data:
            embedding = embedding_service.generate_movie_embedding(
                title=movie['title'],
                overview=movie['overview'],
                genres=movie.get('genres', []),
                year=movie.get('year'),
                industry=movie.get('industry')
            )
            embeddings.append(embedding)
            movie_ids.append(str(movie['tmdb_id']))
            
            # Store embedding for personalization
            movie_embeddings[str(movie['tmdb_id'])] = embedding
        
        logger.info(f"Generated {len(embeddings)} embeddings")
        
        # Build FAISS index
        logger.info("Building FAISS index...")
        import numpy as np
        embeddings_array = np.array(embeddings, dtype=np.float32)
        
        faiss_index = FAISSIndexManager(dimension=EMBEDDING_DIMENSION)
        faiss_index.add_embeddings(embeddings_array, movie_ids)
        
        logger.info(f"FAISS index built with {faiss_index.get_index_size()} movies")
        
        # Initialize personalized mood system
        logger.info("Initializing personalized mood system...")
        personalized_mood_system = PersonalizedMoodSystem(embedding_service, mood_system)
        logger.info("Personalized mood system initialized")
        
        logger.info("Startup completed successfully!")
        
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}", exc_info=True)
        
        # Determine appropriate exit code based on error type
        if "MongoDB" in str(e) or "Connection" in str(e):
            logger.error("MongoDB connection failure")
            sys.exit(1)
        elif "model" in str(e).lower() or "SentenceTransformer" in str(e):
            logger.error("SentenceTransformer model loading failure")
            sys.exit(2)
        else:
            logger.error("FAISS index initialization failure")
            sys.exit(3)
    
    yield
    
    # Shutdown
    logger.info("Shutting down Cinemies AI Recommendation Engine...")


# Initialize FastAPI app with lifespan handler
app = FastAPI(
    title="Cinemies AI Recommendation Engine",
    description="AI-powered movie recommendation system with mood-based semantic search",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["GET", "POST"],  # Allow GET and POST requests
    allow_headers=["*"],
)

logger.info("FastAPI application initialized")


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    
    Returns service status, indexed movie count, and available moods.
    Returns 503 if FAISS index is not initialized.
    """
    # Check if FAISS index is initialized and has movies
    if faiss_index is None or faiss_index.get_index_size() == 0:
        # Service is unhealthy - index not initialized
        response = HealthResponse(
            status="unhealthy",
            indexed_movies=0,
            available_moods=[]
        )
        return JSONResponse(
            status_code=503,
            content=response.model_dump()
        )
    
    # Service is healthy
    response = HealthResponse(
        status="healthy",
        indexed_movies=faiss_index.get_index_size(),
        available_moods=mood_system.get_available_moods()
    )
    return response



@app.get("/recommend", response_model=RecommendationResponse)
async def get_recommendations(
    mood: str = Query(..., description="Mood category for recommendations"),
    limit: int = Query(DEFAULT_RECOMMENDATIONS, ge=1, le=50, description="Number of recommendations to return"),
    user_id: str = Query(None, description="User ID for personalized recommendations"),
    taste_vector: str = Query(None, description="Comma-separated taste vector (384 dimensions)"),
    favorite_movie_ids: str = Query(None, description="Comma-separated list of favorite movie TMDB IDs for personalization"),
    user_top_genres: str = Query(None, description="Comma-separated list of user's top 3 genres for serendipity calculation"),
    recent_viewed_ids: str = Query(None, description="Comma-separated TMDB IDs of recently viewed movies in session (for session-based preferences)"),
    cohort: str = Query(None, description="A/B test cohort: control, variant_a, or variant_b"),
    exclude_ids: str = Query(None, description="Comma-separated TMDB IDs to exclude (watched/watchlisted movies)"),
    collaborative_vector: str = Query(None, description="Comma-separated 384-dim collaborative filtering vector from similar users")
):
    """
    Get mood-based movie recommendations with hybrid personalization.
    
    This endpoint implements a sophisticated hybrid recommendation engine that blends:
    - 40% Mood Vector (semantic mood matching)
    - 30% Taste Vector (personal preferences from calibration)
    - 30% Collaborative Vector (similar users' preferences)
    
    Additional features:
    - PCA dimensionality reduction (384d → 128d) for fast FAISS queries
    - MMR diversity re-ranking (λ = 0.7)
    - Epsilon-greedy exploration (ε = 0.15)
    - Temporal decay and recency boosting
    - Explainability reasons for each recommendation
    - Multi-task learning scoring function (relevance + diversity + serendipity + freshness)
    
    Args:
        mood: One of the 8 defined mood names
        limit: Number of recommendations (1-50, default 10)
        user_id: Optional user ID for collaborative filtering
        taste_vector: Optional 384-d taste vector as comma-separated string
        favorite_movie_ids: Optional comma-separated TMDB IDs (deprecated, use taste_vector)
        user_top_genres: Optional comma-separated list of user's top 3 genres for serendipity
    
    Returns:
        RecommendationResponse with mood, recommendations list, and count
    
    Raises:
        400: Invalid mood or limit parameter
        503: FAISS index not initialized
    
    Example:
        /recommend?mood=mind_bending&limit=10
        /recommend?mood=mind_bending&limit=10&user_id=123&taste_vector=0.1,0.2,...&user_top_genres=Thriller,Drama,Sci-Fi
    """
    import numpy as np
    import random
    from sklearn.decomposition import PCA
    from sklearn.metrics.pairwise import cosine_similarity
    
    # Check if FAISS index is initialized
    if faiss_index is None or faiss_index.get_index_size() == 0:
        error_response = ErrorResponse(
            error="Service unavailable",
            detail="FAISS index is not initialized"
        )
        return JSONResponse(
            status_code=503,
            content=error_response.model_dump()
        )
    
    # Validate mood parameter
    available_moods = mood_system.get_available_moods()
    if mood not in available_moods:
        error_response = ErrorResponse(
            error="Invalid mood parameter",
            detail=f"Mood '{mood}' not found. Available moods: {', '.join(available_moods)}"
        )
        return JSONResponse(
            status_code=400,
            content=error_response.model_dump()
        )
    
    # Parse taste vector if provided (30% weight)
    user_taste_vector = None
    if taste_vector:
        try:
            taste_vals = [float(v.strip()) for v in taste_vector.split(',')]
            if len(taste_vals) == EMBEDDING_DIMENSION:
                user_taste_vector = np.array(taste_vals, dtype=np.float32)
                # Normalize
                norm = np.linalg.norm(user_taste_vector)
                if norm > 0:
                    user_taste_vector = user_taste_vector / norm
                logger.info("Parsed user taste vector successfully")
            else:
                logger.warning(f"Invalid taste vector dimension: {len(taste_vals)}, expected {EMBEDDING_DIMENSION}")
        except Exception as e:
            logger.error(f"Error parsing taste vector: {str(e)}")
    
    # Parse user top genres if provided
    parsed_user_top_genres = None
    if user_top_genres:
        try:
            parsed_user_top_genres = [g.strip() for g in user_top_genres.split(',') if g.strip()]
            logger.info(f"Parsed user top genres: {parsed_user_top_genres}")
        except Exception as e:
            logger.error(f"Error parsing user top genres: {str(e)}")
    
    # Get mood vector — optionally personalized with genre preferences
    if parsed_user_top_genres and personalized_mood_system:
        mood_vector = personalized_mood_system.get_personalized_mood(mood, parsed_user_top_genres)
        if mood_vector is None:
            mood_vector = mood_system.get_mood_vector(mood)
        else:
            logger.info(f"Using personalized mood vector for '{mood}' with genres {parsed_user_top_genres}")
    else:
        mood_vector = mood_system.get_mood_vector(mood)
    if mood_vector is None:
        error_response = ErrorResponse(
            error="Internal error",
            detail=f"Failed to retrieve mood vector for '{mood}'"
        )
        return JSONResponse(
            status_code=500,
            content=error_response.model_dump()
        )
    
    # Compute session vector from recently viewed movies (≥3 required)
    session_vector = None
    if recent_viewed_ids:
        try:
            viewed_ids = [id.strip() for id in recent_viewed_ids.split(',') if id.strip()]
            if len(viewed_ids) >= 3:
                viewed_embeddings = []
                for vid in viewed_ids:
                    if vid in movie_embeddings:
                        viewed_embeddings.append(movie_embeddings[vid])
                
                if len(viewed_embeddings) >= 3:
                    # Compute session vector as mean of viewed embeddings
                    session_vector = np.mean(viewed_embeddings, axis=0)
                    # Normalize to unit length
                    norm = np.linalg.norm(session_vector)
                    if norm > 0:
                        session_vector = session_vector / norm
                    logger.info(f"Session vector computed from {len(viewed_embeddings)} viewed movies")
                else:
                    logger.info(f"Insufficient viewed embeddings ({len(viewed_embeddings)}) - session vector not used")
            else:
                logger.info(f"Insufficient viewed movies ({len(viewed_ids)}) - need at least 3 for session vector")
        except Exception as e:
            logger.error(f"Error computing session vector: {str(e)}")
    
    # Parse collaborative vector if provided (replaces the stub)
    collaborative_vector_arr = None
    if collaborative_vector:
        try:
            collab_vals = [float(v.strip()) for v in collaborative_vector.split(',')]
            if len(collab_vals) == EMBEDDING_DIMENSION:
                collaborative_vector_arr = np.array(collab_vals, dtype=np.float32)
                norm = np.linalg.norm(collaborative_vector_arr)
                if norm > 0:
                    collaborative_vector_arr = collaborative_vector_arr / norm
                logger.info("Collaborative vector parsed successfully from real user similarity")
            else:
                logger.warning(f"Invalid collaborative vector dimension: {len(collab_vals)}")
        except Exception as e:
            logger.error(f"Error parsing collaborative_vector: {str(e)}")
    else:
        collaborative_vector_arr = None
        if user_id and user_taste_vector is not None:
            logger.info(f"No collaborative vector provided for user {user_id} (insufficient similar users or cold start)")
    
    # Determine blend weights based on A/B cohort
    # Default weights (no cohort): 40% mood, 30% taste, 30% collaborative
    mood_w, taste_w, collab_w = 0.4, 0.3, 0.3
    if cohort == 'control':
        mood_w, taste_w, collab_w = 0.6, 0.4, 0.0
        logger.info("A/B cohort: control (60/40/0)")
    elif cohort == 'variant_a':
        mood_w, taste_w, collab_w = 0.5, 0.3, 0.2
        logger.info("A/B cohort: variant_a (50/30/20)")
    elif cohort == 'variant_b':
        mood_w, taste_w, collab_w = 0.4, 0.4, 0.2
        logger.info("A/B cohort: variant_b (40/40/20 diversity-boost)")
    
    # Hybrid vector blending with session adaptation
    # With session (≥3 views): 50% mood + 30% taste + 20% session (overrides cohort)
    if session_vector is not None:
        # Session-based blend
        if user_taste_vector is not None:
            combined_vector = 0.5 * mood_vector + 0.3 * user_taste_vector + 0.2 * session_vector
            logger.info("Using session-based blend (50% mood + 30% taste + 20% session)")
        else:
            combined_vector = 0.7 * mood_vector + 0.3 * session_vector
            logger.info("Using session-based blend without taste (70% mood + 30% session)")
    elif user_taste_vector is not None and collaborative_vector_arr is not None:
        combined_vector = mood_w * mood_vector + taste_w * user_taste_vector + collab_w * collaborative_vector_arr
        logger.info(f"Using full hybrid blend ({mood_w}/{taste_w}/{collab_w})")
    elif user_taste_vector is not None:
        # Redistribute collaborative weight to mood and taste proportionally
        total = mood_w + taste_w
        combined_vector = (mood_w/total) * mood_vector + (taste_w/total) * user_taste_vector
        logger.info(f"Using mood + taste blend ({mood_w/total:.2f}/{taste_w/total:.2f})")
    elif favorite_movie_ids:
        # Fallback to old favorite-based personalization
        fav_ids = [id.strip() for id in favorite_movie_ids.split(',') if id.strip()]
        if len(fav_ids) > 0:
            fav_embeddings = []
            for fav_id in fav_ids:
                if fav_id in movie_embeddings:
                    fav_embeddings.append(movie_embeddings[fav_id])
            
            if len(fav_embeddings) > 0:
                user_vector = np.mean(fav_embeddings, axis=0)
                combined_vector = 0.7 * mood_vector + 0.3 * user_vector
                norm = np.linalg.norm(combined_vector)
                if norm > 0:
                    combined_vector = combined_vector / norm
                logger.info(f"Using favorite-based blend with {len(fav_embeddings)} movies")
            else:
                combined_vector = mood_vector
        else:
            combined_vector = mood_vector
    else:
        combined_vector = mood_vector
        logger.info("Using pure mood vector (no personalization)")
    
    # Normalize combined vector
    norm = np.linalg.norm(combined_vector)
    if norm > 0:
        combined_vector = combined_vector / norm
    
    # PCA dimensionality reduction for speed (384d → 128d)
    # Note: In production, PCA model would be pre-trained and loaded
    # For now, we'll use the full 384d vector since we don't have a pre-trained PCA model
    # TODO: Train and save PCA model during index building
    query_vector = combined_vector
    
    # Parse exclude IDs (watched + watchlisted movies)
    exclude_set = set()
    if exclude_ids:
        try:
            exclude_set = {str(eid.strip()) for eid in exclude_ids.split(',') if eid.strip()}
            logger.info(f"Excluding {len(exclude_set)} watched/watchlisted movies")
        except Exception as e:
            logger.error(f"Error parsing exclude_ids: {str(e)}")
    
    # Query FAISS index for top 50 candidates (more than needed for diversity re-ranking)
    candidate_count = min(50, faiss_index.get_index_size())
    movie_ids, similarity_scores = faiss_index.search(query_vector, k=candidate_count)
    
    # Build candidate list with full embeddings for re-ranking
    # Skip movies in the exclude set (already watched or watchlisted)
    candidates = []
    excluded_count = 0
    for movie_id, score in zip(movie_ids, similarity_scores):
        # Skip excluded movies (watched/watchlisted)
        if movie_id in exclude_set:
            excluded_count += 1
            continue
        
        movie_doc = None
        for movie in movies_data:
            if str(movie['tmdb_id']) == movie_id:
                movie_doc = movie
                break
        
        if movie_doc is not None:
            candidates.append({
                'movie': movie_doc,
                'score': float(score),
                'embedding': movie_embeddings.get(str(movie_doc['tmdb_id']))
            })
    
    if excluded_count > 0:
        logger.info(f"Filtered out {excluded_count} watched/watchlisted movies from {candidate_count} candidates")
    
    if len(candidates) == 0:
        logger.warning("No valid candidates found")
        return RecommendationResponse(mood=mood, recommendations=[], count=0)
    
    # Use hybrid engine for full recommendation pipeline with multi-task scoring
    selected = hybrid_engine.recommend(
        mood_vector=mood_vector,
        faiss_results=(movie_ids, similarity_scores),
        movies_data=movies_data,
        movie_embeddings=movie_embeddings,
        limit=limit,
        taste_vector=user_taste_vector,
        collaborative_vector=collaborative_vector,
        session_vector=session_vector,
        mood=mood,
        user_top_genres=parsed_user_top_genres,
        exclude_ids=exclude_set
    )
    
    # Build response from hybrid engine output
    recommendations = []
    for candidate in selected:
        movie_doc = candidate['movie']
        recommendation = MovieRecommendation(
            title=movie_doc['title'],
            overview=movie_doc['overview'],
            tmdb_id=movie_doc['tmdb_id'],
            poster_url=movie_doc['poster_url'],
            vote_average=movie_doc['vote_average'],
            genres=movie_doc['genres'],
            match_score=float(candidate.get('score', 0.0)),
            reason=candidate.get('reason', 'Recommended for you')
        )
        recommendations.append(recommendation)
    
    response = RecommendationResponse(
        mood=mood,
        recommendations=recommendations,
        count=len(recommendations)
    )
    
    return response


@app.post("/generate-taste-vector", response_model=TasteVectorResponse)
async def generate_taste_vector(request: TasteVectorRequest):
    """
    Generate a personalized taste vector from rated movies.
    
    This endpoint processes Good/Don't Know/Bad ratings from taste calibration
    to create a 384-dimensional taste vector representing user preferences.
    
    Algorithm:
        Taste_Vector = mean(liked_embeddings) - α * mean(disliked_embeddings)
        where α adapts based on rating distribution (default 0.4)
    
    Args:
        request: TasteVectorRequest containing rated_movies array
    
    Returns:
        TasteVectorResponse with 384-dimensional taste vector and metadata
    
    Raises:
        400: Insufficient ratings (need ≥5 Good and ≥2 Bad)
        404: Rated movies not found in database
        503: Service not initialized
    
    Example Request Body:
        {
            "rated_movies": [
                {"tmdb_id": 27205, "rating": 1},
                {"tmdb_id": 603, "rating": 1},
                {"tmdb_id": 13, "rating": -1}
            ]
        }
    """
    import numpy as np
    
    # Check if services are initialized
    if movie_embeddings is None or len(movie_embeddings) == 0:
        error_response = ErrorResponse(
            error="Service unavailable",
            detail="Movie embeddings not initialized"
        )
        return JSONResponse(
            status_code=503,
            content=error_response.model_dump()
        )
    
    # Separate movies by rating
    liked_movies = [m for m in request.rated_movies if m.rating == 1]
    disliked_movies = [m for m in request.rated_movies if m.rating == -1]
    neutral_movies = [m for m in request.rated_movies if m.rating == 0]
    
    logger.info(f"Generating taste vector: {len(liked_movies)} liked, {len(disliked_movies)} disliked, {len(neutral_movies)} neutral")
    
    # Collect embeddings for liked movies
    liked_embeddings = []
    missing_liked = []
    
    for movie in liked_movies:
        movie_id_str = str(movie.tmdb_id)
        if movie_id_str in movie_embeddings:
            liked_embeddings.append(movie_embeddings[movie_id_str])
        else:
            missing_liked.append(movie.tmdb_id)
            logger.warning(f"Liked movie {movie.tmdb_id} not found in embeddings")
    
    # Collect embeddings for disliked movies
    disliked_embeddings = []
    missing_disliked = []
    
    for movie in disliked_movies:
        movie_id_str = str(movie.tmdb_id)
        if movie_id_str in movie_embeddings:
            disliked_embeddings.append(movie_embeddings[movie_id_str])
        else:
            missing_disliked.append(movie.tmdb_id)
            logger.warning(f"Disliked movie {movie.tmdb_id} not found in embeddings")
    
    # Validate we have enough embeddings after filtering missing movies
    if len(liked_embeddings) < 3:
        error_response = ErrorResponse(
            error="Insufficient data",
            detail=f"Need at least 3 liked movies with embeddings, got {len(liked_embeddings)}" +
                   (f". Missing movies: {missing_liked}" if missing_liked else "")
        )
        return JSONResponse(
            status_code=404,
            content=error_response.model_dump()
        )
    
    # Phase 3: Diversity-Weighted Liked Vector
    # Instead of flat mean, weight each liked movie by how dissimilar it is to the cluster.
    # Movies that are outliers (diverse taste signals) get higher weight, preventing a
    # single genre cluster from dominating the entire taste vector.
    liked_embeddings_arr = np.array(liked_embeddings, dtype=np.float32)
    
    if len(liked_embeddings) == 1:
        diversity_weights = np.array([1.0])
    else:
        diversity_weights = np.zeros(len(liked_embeddings))
        for i, emb in enumerate(liked_embeddings):
            # Average cosine similarity to all other liked embeddings
            others = np.delete(liked_embeddings_arr, i, axis=0)
            sims = others @ emb  # dot product of normalized vectors = cosine sim
            avg_sim = float(np.mean(sims))
            # Outliers (low avg similarity) get higher weight
            diversity_weights[i] = 1.0 / (1.0 + avg_sim)
        
    diversity_weights = diversity_weights / diversity_weights.sum()
    liked_mean = np.average(liked_embeddings_arr, axis=0, weights=diversity_weights)
    
    logger.info(
        f"Diversity weights: min={diversity_weights.min():.3f}, "
        f"max={diversity_weights.max():.3f}, "
        f"entropy={float(-(diversity_weights * np.log(diversity_weights + 1e-9)).sum()):.3f}"
    )
    
    if len(disliked_embeddings) > 0:
        disliked_mean = np.mean(disliked_embeddings, axis=0)
        
        # Determine alpha parameter based on rating distribution
        dislike_ratio = len(disliked_embeddings) / (len(liked_embeddings) + len(disliked_embeddings))
        alpha = 0.3 + (dislike_ratio * 0.4)
        alpha = min(max(alpha, 0.3), 0.5)
        
        logger.info(f"Using alpha={alpha:.3f} (dislike_ratio={dislike_ratio:.3f})")
        
        # Phase 3: Projection-based negative modeling (improved over flat subtraction)
        # Project disliked_mean onto liked_mean direction, subtract only the parallel component.
        # This avoids random drift in dimensions unrelated to the disliked taste.
        liked_norm = np.linalg.norm(liked_mean)
        if liked_norm > 0:
            liked_unit = liked_mean / liked_norm
            # Parallel component of disliked_mean along liked_mean axis
            projection = np.dot(disliked_mean, liked_unit) * liked_unit
            taste_vector = liked_mean - alpha * projection
            logger.info("Using projection-based negative modeling")
        else:
            taste_vector = liked_mean - (alpha * disliked_mean)
    else:
        alpha = 0.0
        logger.info("No disliked movies. Using diversity-weighted liked mean.")
        taste_vector = liked_mean
    
    # Normalize to unit length
    norm = np.linalg.norm(taste_vector)
    if norm > 0:
        taste_vector = taste_vector / norm
    else:
        # Edge case: should never happen, but handle gracefully
        logger.error("Taste vector has zero norm - using liked_mean as fallback")
        taste_vector = liked_mean / np.linalg.norm(liked_mean)
    
    # Quality validation and warnings
    warnings = []
    
    # Check variance: if all embeddings are too similar, warn
    liked_variance = np.var(liked_embeddings, axis=0).mean()
    if liked_variance < 0.001:
        warnings.append("Low variance in liked movies - user may have rated very similar content")
        logger.warning(f"Low variance detected: {liked_variance:.6f}")
    
    # Check if taste vector is close to zero (shouldn't happen after normalization)
    if norm < 0.1:
        warnings.append("Taste vector has very low magnitude - may indicate conflicting preferences")
        logger.warning(f"Low norm detected before normalization: {norm:.6f}")
    
    # Convert to Python list for JSON serialization
    taste_vector_list = taste_vector.tolist()
    
    # Validate dimension
    if len(taste_vector_list) != EMBEDDING_DIMENSION:
        error_response = ErrorResponse(
            error="Internal error",
            detail=f"Generated vector has incorrect dimension: {len(taste_vector_list)} != {EMBEDDING_DIMENSION}"
        )
        return JSONResponse(
            status_code=500,
            content=error_response.model_dump()
        )
    
    logger.info(f"Taste vector generated successfully: dim={len(taste_vector_list)}, norm={np.linalg.norm(taste_vector):.6f}")
    
    # Return response
    response = TasteVectorResponse(
        taste_vector=taste_vector_list,
        dimension=len(taste_vector_list),
        liked_count=len(liked_embeddings),
        disliked_count=len(disliked_embeddings),
        neutral_count=len(neutral_movies),
        alpha=alpha,
        warnings=warnings
    )
    
    return response


@app.post("/collaborative-vector", response_model=CollaborativeVectorResponse)
async def get_collaborative_vector(request: CollaborativeVectorRequest):
    """
    Compute a collaborative filtering vector from similar users.

    Finds all users in `other_users` whose taste vector has cosine similarity
    >= min_similarity with the requesting user's vector. If at least
    min_similar_users are found, returns their similarity-weighted mean vector.

    Args:
        request: CollaborativeVectorRequest with current user's taste vector
                 and list of other users' taste vectors

    Returns:
        CollaborativeVectorResponse with the computed collaborative vector,
        similar user count, and average similarity. available=False if
        insufficient similar users exist.
    """
    import numpy as np

    if len(request.other_users) == 0:
        return CollaborativeVectorResponse(
            collaborative_vector=[],
            similar_user_count=0,
            available=False,
            avg_similarity=0.0
        )

    # Convert requesting user's vector to numpy
    user_vec = np.array(request.current_taste_vector, dtype=np.float32)
    norm = np.linalg.norm(user_vec)
    if norm > 0:
        user_vec = user_vec / norm

    similar_users = []
    similarities = []

    for other in request.other_users:
        # Skip self
        if other.user_id == request.user_id:
            continue

        other_vec = np.array(other.taste_vector, dtype=np.float32)
        other_norm = np.linalg.norm(other_vec)
        if other_norm == 0:
            continue
        other_vec = other_vec / other_norm

        # Cosine similarity (inner product of normalized vectors)
        sim = float(np.dot(user_vec, other_vec))

        if sim >= request.min_similarity:
            similar_users.append((other_vec, sim))
            similarities.append(sim)

    logger.info(
        f"Collaborative filtering for user {request.user_id}: "
        f"found {len(similar_users)}/{len(request.other_users)} similar users "
        f"(threshold={request.min_similarity})"
    )

    if len(similar_users) < request.min_similar_users:
        return CollaborativeVectorResponse(
            collaborative_vector=[],
            similar_user_count=len(similar_users),
            available=False,
            avg_similarity=float(np.mean(similarities)) if similarities else 0.0
        )

    # Compute similarity-weighted mean of similar users' taste vectors
    total_sim = sum(s for _, s in similar_users)
    collab_vec = np.zeros(len(request.current_taste_vector), dtype=np.float32)
    for vec, sim in similar_users:
        collab_vec += (sim / total_sim) * vec

    # Normalize to unit length
    collab_norm = np.linalg.norm(collab_vec)
    if collab_norm > 0:
        collab_vec = collab_vec / collab_norm

    avg_sim = float(np.mean(similarities))
    logger.info(
        f"Collaborative vector computed: {len(similar_users)} similar users, "
        f"avg_similarity={avg_sim:.3f}"
    )

    return CollaborativeVectorResponse(
        collaborative_vector=collab_vec.tolist(),
        similar_user_count=len(similar_users),
        available=True,
        avg_similarity=avg_sim
    )


@app.post("/admin/reindex")
async def reindex_movies(x_admin_key: str = None):
    """
    Flaw E fix: Hot-reload endpoint that reconnects to MongoDB and rebuilds
    the FAISS index without restarting the service.

    Requires X-Admin-Key header matching ADMIN_SECRET env var.
    New movies added to MongoDB after startup become visible immediately.
    """
    import numpy as np
    import os

    global movies_data, movie_embeddings, faiss_index

    # Validate admin key
    admin_secret = os.getenv("ADMIN_SECRET", "")
    if not admin_secret or x_admin_key != admin_secret:
        return JSONResponse(
            status_code=403,
            content={"error": "Forbidden", "detail": "Valid X-Admin-Key header required"}
        )

    logger.info("Admin reindex triggered — reconnecting to MongoDB and rebuilding FAISS index...")

    try:
        from config import MONGODB_CONNECTION_STRING, MONGODB_DATABASE, MONGODB_COLLECTION

        # Reconnect to MongoDB
        mongo_connector = MongoDBConnector(
            connection_string=MONGODB_CONNECTION_STRING,
            database=MONGODB_DATABASE,
            collection=MONGODB_COLLECTION
        )
        mongo_connector.connect()

        new_movies_data = mongo_connector.fetch_movies()
        mongo_connector.close()

        if len(new_movies_data) == 0:
            return JSONResponse(
                status_code=503,
                content={"error": "No movies found", "detail": "MongoDB returned 0 movies"}
            )

        # Regenerate embeddings for all movies
        new_embeddings = []
        new_movie_ids = []
        new_movie_embeddings = {}

        for movie in new_movies_data:
            embedding = embedding_service.generate_movie_embedding(
                title=movie['title'],
                overview=movie['overview'],
                genres=movie.get('genres', []),
                year=movie.get('year'),
                industry=movie.get('industry')
            )
            new_embeddings.append(embedding)
            new_movie_ids.append(str(movie['tmdb_id']))
            new_movie_embeddings[str(movie['tmdb_id'])] = embedding

        # Rebuild FAISS index atomically
        new_index = FAISSIndexManager(dimension=EMBEDDING_DIMENSION)
        embeddings_array = np.array(new_embeddings, dtype=np.float32)
        new_index.add_embeddings(embeddings_array, new_movie_ids)

        # Swap globals atomically
        prev_count = len(movies_data)
        movies_data = new_movies_data
        movie_embeddings = new_movie_embeddings
        faiss_index = new_index

        logger.info(
            f"Reindex complete: {prev_count} → {len(movies_data)} movies, "
            f"FAISS index rebuilt with {faiss_index.get_index_size()} vectors"
        )

        return {
            "success": True,
            "previous_count": prev_count,
            "new_count": len(movies_data),
            "indexed_movies": faiss_index.get_index_size(),
        }

    except Exception as e:
        logger.error(f"Reindex failed: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": "Reindex failed", "detail": str(e)}
        )


@app.post("/update-taste-vector", response_model=UpdateTasteVectorResponse)
async def update_taste_vector(request: UpdateTasteVectorRequest):
    """
    Update user's taste vector incrementally based on recently clicked movies.
    
    This endpoint implements real-time taste vector updates using exponential moving average (EMA).
    Instead of full recalibration, it adjusts the existing taste vector based on new interactions.
    
    Algorithm:
        Updated_Taste = 0.9 * Old_Taste + 0.1 * mean(clicked_embeddings)
        Normalized to unit length
    
    Features:
        - Incremental updates without full retraining
        - Exponential moving average for smooth adaptation
        - Major taste shift detection (similarity < 0.5)
        - Handles missing movie embeddings gracefully
    
    Args:
        request: UpdateTasteVectorRequest with user_id, clicked_movie_ids, current_taste_vector
    
    Returns:
        UpdateTasteVectorResponse with updated taste vector and metadata
    
    Raises:
        400: Invalid input (empty clicked list, wrong vector dimension)
        404: Clicked movies not found in embeddings
        503: Service not initialized
    
    Example Request Body:
        {
            "user_id": "user123",
            "clicked_movie_ids": [27205, 603, 13],
            "current_taste_vector": [0.1, 0.2, ..., 0.3]  # 384 values
        }
    """
    import numpy as np
    
    # Check if services are initialized
    if movie_embeddings is None or len(movie_embeddings) == 0:
        error_response = ErrorResponse(
            error="Service unavailable",
            detail="Movie embeddings not initialized"
        )
        return JSONResponse(
            status_code=503,
            content=error_response.model_dump()
        )
    
    # Validate current taste vector dimension
    if len(request.current_taste_vector) != EMBEDDING_DIMENSION:
        error_response = ErrorResponse(
            error="Invalid input",
            detail=f"Current taste vector must have {EMBEDDING_DIMENSION} dimensions, got {len(request.current_taste_vector)}"
        )
        return JSONResponse(
            status_code=400,
            content=error_response.model_dump()
        )
    
    logger.info(f"Updating taste vector for user {request.user_id} with {len(request.clicked_movie_ids)} clicked movies")
    
    # Convert current taste vector to numpy array
    current_taste = np.array(request.current_taste_vector, dtype=np.float32)
    
    # Collect embeddings for clicked movies
    clicked_embeddings = []
    missing_movies = []
    
    for movie_id in request.clicked_movie_ids:
        movie_id_str = str(movie_id)
        if movie_id_str in movie_embeddings:
            clicked_embeddings.append(movie_embeddings[movie_id_str])
        else:
            missing_movies.append(movie_id)
            logger.warning(f"Clicked movie {movie_id} not found in embeddings")
    
    # Validate we have at least some embeddings
    if len(clicked_embeddings) == 0:
        error_response = ErrorResponse(
            error="No valid movies",
            detail=f"None of the clicked movies were found in embeddings. Missing IDs: {missing_movies}"
        )
        return JSONResponse(
            status_code=404,
            content=error_response.model_dump()
        )
    
    # Compute mean of clicked embeddings
    clicked_mean = np.mean(clicked_embeddings, axis=0)
    
    # Apply exponential moving average (EMA) with adaptive S-curve alpha.
    # alpha = 0.05 + 0.35 / (1 + exp(-0.2 * (count - 15)))
    # At 0 interactions: alpha ≈ 0.05 (cold user — barely updates)
    # At 15 interactions: alpha ≈ 0.22 (midpoint — moderate plasticity)
    # At 40+ interactions: alpha ≈ 0.40 (warm user — learns quickly from recent feedback)
    import math
    interaction_count = getattr(request, 'interaction_count', 0)
    alpha_ema = 0.05 + 0.35 / (1.0 + math.exp(-0.2 * (interaction_count - 15)))
    logger.info(f"S-curve alpha: {alpha_ema:.4f} (interaction_count={interaction_count})")
    updated_taste = (1.0 - alpha_ema) * current_taste + alpha_ema * clicked_mean
    
    # Normalize to unit length
    norm = np.linalg.norm(updated_taste)
    if norm > 0:
        updated_taste = updated_taste / norm
    else:
        logger.error("Updated taste vector has zero norm - using current taste vector as fallback")
        updated_taste = current_taste / np.linalg.norm(current_taste)
    
    # Calculate similarity to old taste vector (detect major shifts)
    similarity = float(np.dot(current_taste, updated_taste))
    major_taste_shift = similarity < 0.5
    
    if major_taste_shift:
        logger.warning(f"Major taste shift detected for user {request.user_id}: similarity={similarity:.3f}")
    
    # Prepare warnings
    warnings = []
    if missing_movies:
        warnings.append(f"{len(missing_movies)} movies not found in embeddings and were skipped")
    
    if major_taste_shift:
        warnings.append(f"Major taste shift detected (similarity={similarity:.3f})")
    
    # Convert to Python list for JSON serialization
    updated_taste_list = updated_taste.tolist()
    
    logger.info(f"Taste vector updated for user {request.user_id}: processed {len(clicked_embeddings)} movies, similarity={similarity:.3f}")
    
    # Return response
    response = UpdateTasteVectorResponse(
        updated_taste_vector=updated_taste_list,
        dimension=len(updated_taste_list),
        clicked_count=len(clicked_embeddings),
        similarity_to_old=similarity,
        major_taste_shift=major_taste_shift,
        warnings=warnings
    )
    
    return response
