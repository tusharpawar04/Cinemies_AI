/**
 * Recommendation Controller
 * Handles AI-powered movie recommendations with enhanced caching
 */

const { UserProfile } = require('../models');
const aiService = require('../services/ai.service');
const { cache } = require('../database/redis');
const cacheService = require('../services/cache.service');
const { asyncHandler, ValidationError, ServiceUnavailableError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @route   GET /api/v1/recommendations/mood/:mood
 * @desc    Get mood-based recommendations with enhanced caching
 * @access  Public (but personalized if authenticated)
 */
exports.getMoodRecommendations = asyncHandler(async (req, res) => {
  const { mood } = req.params;
  const { industry = 'all' } = req.query; // Optional filter
  
  // 1. Validate mood parameter
  const validMoods = ['mind_bending', 'comfort_food', 'visual_spectacle', 'cathartic_cry', 
                     'hidden_gem', 'laugh_out_loud', 'edge_of_seat', 'feel_inspired'];
  
  if (!validMoods.includes(mood)) {
    throw new ValidationError(`Invalid mood. Valid moods: ${validMoods.join(', ')}`);
  }

  // 2. Check Redis Cache using enhanced cache patterns
  let cachedData;
  let source = 'ai';
  
  if (req.user) {
    // Check personalized cache first for authenticated users
    cachedData = await cacheService.getCachedPersonalizedRecommendations(mood, req.user.id);
    if (cachedData) {
      source = 'cache_personalized';
    }
  }
  
  if (!cachedData) {
    // Check general mood cache
    cachedData = await cacheService.getCachedRecommendations(mood, industry);
    if (cachedData) {
      source = 'cache';
    }
  }
  
  if (cachedData) {
    // Track viewed movies in session
    if (req.user && cachedData.length > 0) {
      for (const movie of cachedData.slice(0, 3)) { // Track first 3 shown
        await cacheService.addToSessionViewed(req.user.id, movie.tmdbId || movie.id);
      }
    }
    
    return res.status(200).json({
      success: true,
      source,
      data: {
        mood,
        recommendations: cachedData,
        count: cachedData.length,
        cached: true
      }
    });
  }
  
  // 3. Prepare AI Request with full personalization
  let aiPayload = { mood, limit: 10, industry };
  
  if (req.user) {
    // Get user profile for personalized recommendations
    const profile = await UserProfile.findOne({
      where: { userId: req.user.id }
    });
    
    if (profile) {
      aiPayload.userId = req.user.id;
      
      // Forward taste vector
      if (profile.tasteVector) {
        aiPayload.tasteVector = profile.tasteVector;
      }
      
      // Forward A/B cohort
      if (profile.abTestCohort) {
        aiPayload.cohort = profile.abTestCohort;
      }
      
      // Compute user top genres from rated movies
      if (profile.ratedMovieIds && profile.ratedMovieIds.length > 0) {
        const likedIds = profile.ratedMovieIds
          .filter(r => r.rating === 1)
          .map(r => r.tmdb_id);
        
        if (likedIds.length > 0) {
          try {
            const CalibrationMovie = require('../models/CalibrationMovie');
            const likedMovies = await CalibrationMovie.find({
              tmdb_id: { $in: likedIds },
            }).select('genres');
            
            const genreCounts = {};
            likedMovies.forEach(m => {
              (m.genres || []).forEach(g => {
                genreCounts[g] = (genreCounts[g] || 0) + 1;
              });
            });
            
            aiPayload.userTopGenres = Object.entries(genreCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([genre]) => genre);
          } catch (err) {
            logger.error('Failed to compute user top genres', { error: err.message });
          }
        }
      }
      
      // Get session viewed movies for session-based preferences
      try {
        const sessionViewed = await cacheService.getSessionViewed(req.user.id);
        if (sessionViewed && sessionViewed.length >= 3) {
          aiPayload.recentViewedIds = sessionViewed.map(id => parseInt(id)).filter(id => !isNaN(id));
        }
      } catch (err) {
        logger.error('Failed to get session viewed', { error: err.message });
      }
      
      // Build exclude list: movies already watched or on watchlist
      try {
        const watchedIds = Array.isArray(profile.watched) ? profile.watched : [];
        const watchlistIds = Array.isArray(profile.watchlist) ? profile.watchlist : [];
        const excludeIds = [...new Set([...watchedIds, ...watchlistIds])];
        if (excludeIds.length > 0) {
          aiPayload.excludeIds = excludeIds;
          logger.info(`Excluding ${excludeIds.length} watched/watchlisted movies from recommendations`, {
            userId: req.user.id,
          });
        }
      } catch (err) {
        logger.error('Failed to build exclude list', { error: err.message });
      }
      
      // Phase 1: Compute collaborative filtering vector
      // Fetch all other users with a taste vector and find similar users
      if (profile.tasteVector) {
        try {
          const { Op } = require('sequelize');
          const otherProfiles = await UserProfile.findAll({
            where: {
              userId: { [Op.ne]: req.user.id },
              tasteVector: { [Op.ne]: null },
            },
            attributes: ['userId', 'tasteVector'],
            limit: 500, // Cap for performance
          });
          
          if (otherProfiles.length > 0) {
            const otherUsers = otherProfiles.map(p => ({
              userId: p.userId,
              tasteVector: p.tasteVector,
            }));
            
            const collabResult = await aiService.getCollaborativeVector(
              req.user.id,
              profile.tasteVector,
              otherUsers
            );
            
            if (collabResult.available && collabResult.collaborative_vector.length === 384) {
              aiPayload.collaborativeVector = collabResult.collaborative_vector;
              logger.info('Collaborative vector activated', {
                userId: req.user.id,
                similarUsers: collabResult.similar_user_count,
                avgSimilarity: collabResult.avg_similarity,
              });
            }
          }
        } catch (err) {
          // Collaborative filtering is optional — log and continue
          logger.error('Collaborative filtering failed (non-fatal)', { error: err.message });
        }
      }
    }
  }
  
  // 4. Call the Python AI Service
  let recommendedMovies = [];
  try {
    const aiResponse = await aiService.getRecommendations(mood, aiPayload);
    recommendedMovies = aiResponse.recommendations || aiResponse.data || aiResponse;
    source = 'ai';
    
    logger.info('AI recommendations received', {
      mood,
      userId: req.user?.id,
      count: recommendedMovies.length,
      personalized: aiPayload.tasteVector ? true : false,
      cohort: aiPayload.cohort || 'none',
    });
  } catch (aiError) {
    logger.error("AI Service failed, using database fallback", { 
      error: aiError.message,
      mood,
      userId: req.user?.id 
    });
    
    // Fallback: Query MongoDB directly
    try {
      const Movie = require('../models/Movie');
      recommendedMovies = await Movie.find({ 
        [`mood_scores.${mood}`]: { $gt: 0.7 } 
      }).limit(10).lean();
      source = 'fallback';
    } catch (dbError) {
      logger.error("Database fallback failed", { error: dbError.message });
      throw new ServiceUnavailableError('Recommendation service temporarily unavailable');
    }
  }
  
  // 5. Apply Industry Filter (if requested)
  if (industry && industry !== 'all') {
    recommendedMovies = recommendedMovies.filter(m => 
      m.industry && m.industry.toLowerCase() === industry.toLowerCase()
    );
  }
  
  // 6. Cache the results using appropriate cache method
  if (recommendedMovies.length > 0) {
    if (req.user && aiPayload.tasteVector) {
      // Cache as personalized recommendations
      await cacheService.cachePersonalizedRecommendations(mood, req.user.id, recommendedMovies);
    } else {
      // Cache as general mood recommendations
      await cacheService.cacheRecommendations(mood, industry, recommendedMovies);
    }
    
    // Track viewed movies in session for logged-in users
    if (req.user) {
      for (const movie of recommendedMovies.slice(0, 3)) { // Track first 3 shown
        await cacheService.addToSessionViewed(req.user.id, movie.tmdbId || movie.id);
      }
    }
  }
  
  // 7. Return to Client
  return res.status(200).json({
    success: true,
    source,
    data: {
      mood,
      recommendations: recommendedMovies,
      count: recommendedMovies.length,
      cached: false
    }
  });
});

/**
 * @route   POST /api/v1/recommendations/personalized
 * @desc    Get personalized recommendations with taste vector
 * @access  Private
 */
exports.getPersonalizedRecommendations = asyncHandler(async (req, res) => {
  const { mood, limit = 10 } = req.body;
  
  // Validate mood
  const validMoods = ['mind_bending', 'comfort_food', 'visual_spectacle', 'cathartic_cry', 
                     'hidden_gem', 'laugh_out_loud', 'edge_of_seat', 'feel_inspired'];
  
  if (!validMoods.includes(mood)) {
    throw new ValidationError(`Invalid mood. Valid moods: ${validMoods.join(', ')}`);
  }
  
  // Get user's taste profile
  const profile = await UserProfile.findOne({
    where: { userId: req.user.id },
  });
  
  if (!profile || !profile.tasteVector) {
    throw new ValidationError(
      'Taste profile not found. Please complete taste calibration first.'
    );
  }
  
  // Check personalized cache
  const cached = await cacheService.getCachedPersonalizedRecommendations(mood, req.user.id);
  if (cached) {
    return res.json({
      success: true,
      source: 'cache_personalized',
      data: {
        mood,
        recommendations: cached,
        count: cached.length,
        cached: true,
      },
    });
  }
  
  // Call AI service with taste vector
  const recommendations = await aiService.getRecommendations(mood, {
    limit: parseInt(limit),
    userId: req.user.id,
    tasteVector: profile.tasteVector,
  });
  
  const recommendationList = recommendations.recommendations || recommendations.data || recommendations;
  
  // Cache personalized recommendations
  await cacheService.cachePersonalizedRecommendations(mood, req.user.id, recommendationList);
  
  // Track viewed movies in session
  if (recommendationList.length > 0) {
    for (const movie of recommendationList.slice(0, 3)) {
      await cacheService.addToSessionViewed(req.user.id, movie.tmdbId || movie.id);
    }
  }
  
  logger.info('Personalized recommendations generated', {
    mood,
    userId: req.user.id,
    hasTasteVector: !!profile.tasteVector,
    count: recommendationList.length,
  });
  
  res.json({
    success: true,
    source: 'ai',
    data: {
      mood,
      recommendations: recommendationList,
      count: recommendationList.length,
      cached: false,
    },
  });
});

/**
 * @route   GET /api/v1/recommendations/moods
 * @desc    Get available moods
 * @access  Public
 */
exports.getAvailableMoods = asyncHandler(async (req, res) => {
  const moods = await aiService.getAvailableMoods();
  
  // Mood descriptions for frontend
  const moodDescriptions = {
    mind_bending: {
      name: 'Mind-Bending',
      icon: '🧠',
      description: 'Complex psychological thrillers that challenge reality',
    },
    comfort_food: {
      name: 'Comfort Food',
      icon: '🍿',
      description: 'Warm, cozy, feel-good movies',
    },
    visual_spectacle: {
      name: 'Visual Spectacle',
      icon: '🎬',
      description: 'Stunning cinematography and visuals',
    },
    cathartic_cry: {
      name: 'Cathartic Cry',
      icon: '😢',
      description: 'Emotional dramas that move you',
    },
    hidden_gem: {
      name: 'Hidden Gem',
      icon: '💎',
      description: 'Underrated indie masterpieces',
    },
    laugh_out_loud: {
      name: 'Laugh Out Loud',
      icon: '😂',
      description: 'Hilarious comedies',
    },
    edge_of_seat: {
      name: 'Edge of Seat',
      icon: '😱',
      description: 'Intense, suspenseful thrillers',
    },
    feel_inspired: {
      name: 'Feel Inspired',
      icon: '✨',
      description: 'Uplifting motivational stories',
    },
  };
  
  const moodsWithDetails = moods.map(mood => ({
    id: mood,
    ...moodDescriptions[mood],
  }));
  
  res.json({
    success: true,
    data: {
      moods: moodsWithDetails,
      count: moods.length,
    },
  });
});

/**
 * @route   DELETE /api/v1/recommendations/cache
 * @desc    Clear recommendation cache for user (enhanced invalidation)
 * @access  Private
 */
exports.clearCache = asyncHandler(async (req, res) => {
  const { type = 'user' } = req.query;
  
  try {
    let deletedCount = 0;
    let message = '';
    
    switch (type) {
      case 'user':
        // Clear user-specific caches (personalized recommendations + sessions)
        const result = await cacheService.invalidateUserCache(req.user.id);
        message = 'User recommendation cache cleared';
        break;
        
      case 'all':
        // Clear all recommendation caches (admin only - could add admin check here)
        deletedCount = await cacheService.clearRecommendationCaches();
        message = `All recommendation caches cleared (${deletedCount} keys)`;
        break;
        
      case 'recommendations':
        // Clear only general recommendation caches, keep personalized
        deletedCount = await cacheService.invalidatePattern('rec:*:*');
        // Exclude personalized caches
        const personalizedCount = await cacheService.invalidatePattern('rec:personalized:*');
        deletedCount = deletedCount - personalizedCount;
        message = `General recommendation caches cleared (${deletedCount} keys)`;
        break;
        
      default:
        throw new ValidationError('Invalid cache type. Use: user, all, or recommendations');
    }
    
    logger.info('Cache cleared', {
      type,
      userId: req.user.id,
      deletedCount,
    });
    
    res.json({
      success: true,
      message,
      type,
      deletedCount: deletedCount || 'N/A',
    });
    
  } catch (error) {
    logger.error('Cache clear error', {
      type,
      userId: req.user.id,
      error: error.message,
    });
    
    throw error;
  }
});

/**
 * @route   GET /api/v1/recommendations/cache/stats
 * @desc    Get cache statistics
 * @access  Private
 */
exports.getCacheStats = asyncHandler(async (req, res) => {
  const stats = await cacheService.getStats();
  
  res.json({
    success: true,
    data: stats,
  });
});

/**
 * @route   GET /api/v1/recommendations/session/viewed
 * @desc    Get session viewed movies for current user
 * @access  Private
 */
exports.getSessionViewed = asyncHandler(async (req, res) => {
  const viewedMovies = await cacheService.getSessionViewed(req.user.id);
  
  res.json({
    success: true,
    data: {
      viewed: viewedMovies || [],
      count: viewedMovies?.length || 0,
    },
  });
});
