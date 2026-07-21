/**
 * AI Service
 * Communicates with Python FastAPI recommendation engine
 * Handles: recommendations, taste vector generation, taste vector updates
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { ServiceUnavailableError } = require('../middleware/errorHandler');

// In-flight request deduplication map
const inFlightRequests = new Map();

class AIService {
  constructor() {
    this.baseURL = config.ai.url;
    this.timeout = config.ai.timeout;
    this.retryAttempts = config.ai.retryAttempts || 2;
    
    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('AI Service Request', {
          url: config.url,
          method: config.method,
          params: config.params,
        });
        return config;
      },
      (error) => {
        logger.error('AI Service Request Error', error);
        return Promise.reject(error);
      }
    );
    
    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('AI Service Response', {
          url: response.config.url,
          status: response.status,
        });
        return response;
      },
      (error) => {
        logger.error('AI Service Response Error', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Retry wrapper with exponential backoff
   */
  async withRetry(fn, operation = 'AI request') {
    let lastError;
    
    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on validation errors (4xx)
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          throw error;
        }
        
        if (attempt < this.retryAttempts) {
          const delay = Math.pow(2, attempt) * 500; // 500ms, 1000ms
          logger.warn(`${operation} failed (attempt ${attempt + 1}/${this.retryAttempts + 1}), retrying in ${delay}ms`, {
            error: error.message,
          });
          await this.sleep(delay);
        }
      }
    }
    
    logger.error(`${operation} failed after ${this.retryAttempts + 1} attempts`);
    throw lastError;
  }
  
  /**
   * Request deduplication - prevents duplicate AI calls for same params
   */
  async deduplicated(key, fn) {
    if (inFlightRequests.has(key)) {
      logger.debug('Deduplicating request', { key });
      return inFlightRequests.get(key);
    }
    
    const promise = fn().finally(() => {
      inFlightRequests.delete(key);
    });
    
    inFlightRequests.set(key, promise);
    return promise;
  }
  
  /**
   * Check AI service health
   */
  async checkHealth() {
    try {
      const response = await this.client.get('/health');
      return {
        status: response.data.status,
        indexedMovies: response.data.indexed_movies,
        availableMoods: response.data.available_moods,
      };
    } catch (error) {
      logger.error('AI health check failed', error);
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }
  
  /**
   * Get mood-based recommendations with full personalization support
   * @param {string} mood - Mood name
   * @param {Object} options - Options including taste vector, user ID, etc.
   */
  async getRecommendations(mood, options = {}) {
    const {
      limit = 10,
      userId = null,
      tasteVector = null,
      favoriteMovieIds = [],
      userTopGenres = null,
      recentViewedIds = null,
      cohort = null,
      industry = 'all',
      excludeIds = null,
      collaborativeVector = null,
    } = options;
    
    // Build query parameters
    const params = {
      mood,
      limit,
    };
    
    // Add user ID if provided
    if (userId) {
      params.user_id = userId;
    }
    
    // Add taste vector as comma-separated string
    if (tasteVector && Array.isArray(tasteVector) && tasteVector.length === 384) {
      params.taste_vector = tasteVector.join(',');
    }
    
    // Add favorites if provided (legacy support)
    if (favoriteMovieIds && favoriteMovieIds.length > 0) {
      params.favorite_movie_ids = favoriteMovieIds.join(',');
    }
    
    // Add user top genres
    if (userTopGenres && Array.isArray(userTopGenres) && userTopGenres.length > 0) {
      params.user_top_genres = userTopGenres.join(',');
    }
    
    // Add recent viewed IDs for session-based preferences
    if (recentViewedIds && Array.isArray(recentViewedIds) && recentViewedIds.length > 0) {
      params.recent_viewed_ids = recentViewedIds.join(',');
    }
    
    // Add A/B test cohort
    if (cohort) {
      params.cohort = cohort;
    }
    
    // Add exclude list (watched + watchlisted movies)
    if (excludeIds && Array.isArray(excludeIds) && excludeIds.length > 0) {
      params.exclude_ids = excludeIds.join(',');
    }
    
    // Add collaborative vector (30% blend weight)
    if (collaborativeVector && Array.isArray(collaborativeVector) && collaborativeVector.length === 384) {
      params.collaborative_vector = collaborativeVector.join(',');
    }
    
    // Deduplication key
    const dedupeKey = `rec:${mood}:${industry}:${userId || 'anon'}`;
    
    return this.deduplicated(dedupeKey, () => 
      this.withRetry(async () => {
        const response = await this.client.get('/recommend', {
          params,
          timeout: 5000,
        });
        
        return {
          mood: response.data.mood,
          recommendations: response.data.recommendations,
          count: response.data.count,
          personalized: !!(tasteVector || favoriteMovieIds.length > 0),
        };
      }, `getRecommendations(${mood})`)
    );
  }
  
  /**
   * Generate taste vector from rated movies
   * @param {Array} ratedMovies - Array of { tmdb_id, rating } objects
   * @returns {Object} Taste vector response with 384-dim vector
   */
  async generateTasteVector(ratedMovies) {
    return this.withRetry(async () => {
      const response = await this.client.post('/generate-taste-vector', {
        rated_movies: ratedMovies.map(m => ({
          tmdb_id: m.tmdb_id,
          rating: m.rating,
        })),
      }, {
        timeout: 10000, // Longer timeout for vector generation
      });
      
      logger.info('Taste vector generated', {
        dimension: response.data.dimension,
        liked: response.data.liked_count,
        disliked: response.data.disliked_count,
        alpha: response.data.alpha,
      });
      
      return response.data;
    }, 'generateTasteVector');
  }
  
  /**
   * Update taste vector incrementally based on user interactions
   */
  async updateTasteVector(userId, clickedMovieIds, currentTasteVector) {
    return this.withRetry(async () => {
      const response = await this.client.post('/update-taste-vector', {
        user_id: userId,
        clicked_movie_ids: clickedMovieIds,
        current_taste_vector: currentTasteVector,
      }, {
        timeout: 10000,
      });
      
      logger.info('Taste vector updated', {
        userId,
        clickedCount: response.data.clicked_count,
        similarity: response.data.similarity_to_old,
        majorShift: response.data.major_taste_shift,
      });
      
      return response.data;
    }, `updateTasteVector(${userId})`);
  }
  
  /**
   * Compute collaborative filtering vector from similar users.
   * Sends current user's taste vector + all other users' vectors to AI engine.
   * Returns collaborative vector if >= 3 similar users found (cosine sim >= 0.6).
   *
   * @param {string} userId - Requesting user's ID
   * @param {Array<number>} currentTasteVector - User's 384-dim taste vector
   * @param {Array<{userId: string, tasteVector: Array<number>}>} otherUsers - Other users' vectors
   * @returns {Object} { collaborative_vector, similar_user_count, available, avg_similarity }
   */
  async getCollaborativeVector(userId, currentTasteVector, otherUsers) {
    if (!otherUsers || otherUsers.length === 0) {
      return { available: false, similar_user_count: 0, collaborative_vector: [] };
    }
    
    return this.withRetry(async () => {
      const response = await this.client.post('/collaborative-vector', {
        user_id: userId,
        current_taste_vector: currentTasteVector,
        other_users: otherUsers.map(u => ({
          user_id: u.userId,
          taste_vector: u.tasteVector,
        })),
        min_similarity: 0.6,
        min_similar_users: 3,
      }, {
        timeout: 8000,
      });
      
      logger.info('Collaborative vector result', {
        userId,
        available: response.data.available,
        similarUsers: response.data.similar_user_count,
        avgSimilarity: response.data.avg_similarity,
      });
      
      return response.data;
    }, `getCollaborativeVector(${userId})`);
  }
  
  /**
   * Get available moods
   */
  async getAvailableMoods() {
    try {
      const health = await this.checkHealth();
      return health.availableMoods || [];
    } catch (error) {
      logger.error('Failed to get available moods', error);
      // Return default moods as fallback
      return [
        'mind_bending',
        'comfort_food',
        'visual_spectacle',
        'cathartic_cry',
        'hidden_gem',
        'laugh_out_loud',
        'edge_of_seat',
        'feel_inspired',
      ];
    }
  }
  
  /**
   * Validate mood
   */
  async isValidMood(mood) {
    const availableMoods = await this.getAvailableMoods();
    return availableMoods.includes(mood);
  }
  
  /**
   * Sleep utility for retry backoff
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
module.exports = new AIService();
