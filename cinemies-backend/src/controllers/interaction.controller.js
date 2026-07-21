/**
 * Interaction Controller
 * Handles user interaction logging and history
 */

const { Interaction, User, UserProfile } = require('../models');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const cacheService = require('../services/cache.service');
const aiService = require('../services/ai.service');

// Click count threshold for taste vector update
const CLICK_THRESHOLD = 5;

/**
 * @route   POST /api/v1/interactions
 * @desc    Log user interaction
 * @access  Private
 */
exports.logInteraction = asyncHandler(async (req, res) => {
  const { movieTmdbId, interactionType, rating, watchDuration, metadata } = req.body;
  
  // Create interaction
  const interaction = await Interaction.create({
    userId: req.user.id,
    movieTmdbId,
    interactionType,
    rating,
    watchDuration,
    metadata,
  });
  
  logger.info('Interaction logged', {
    userId: req.user.id,
    movieTmdbId,
    interactionType,
  });
  
  // Track movie clicks for session preferences and taste vector updates
  if (interactionType === 'movie_click' && movieTmdbId) {
    try {
      // Add to session viewed for session-based recommendations
      await cacheService.addToSessionViewed(req.user.id, movieTmdbId);
      
      // Increment click counter in Redis
      const clickKey = `click_count:${req.user.id}`;
      const redis = cacheService.getClient?.();
      if (redis) {
        const clickCount = await redis.incr(clickKey);
        await redis.expire(clickKey, 86400); // 24hr TTL
        
        // Trigger taste vector update at threshold
        if (clickCount >= CLICK_THRESHOLD) {
          // Reset counter
          await redis.del(clickKey);
          
          // Get user profile with taste vector
          const profile = await UserProfile.findOne({
            where: { userId: req.user.id },
          });
          
          if (profile && profile.tasteVector) {
            // Get recent clicked movie IDs
            const recentClicks = await Interaction.findAll({
              where: {
                userId: req.user.id,
                interactionType: 'movie_click',
                movieTmdbId: { [Op.not]: null },
              },
              order: [['createdAt', 'DESC']],
              limit: CLICK_THRESHOLD,
              attributes: ['movieTmdbId'],
              raw: true,
            });
            
            const clickedIds = recentClicks
              .map(c => c.movieTmdbId)
              .filter(id => id != null);
            
            if (clickedIds.length >= 3) {
              // Fire-and-forget taste vector update
              aiService.updateTasteVector(
                String(req.user.id),
                clickedIds,
                profile.tasteVector
              ).then(async (result) => {
                // Save updated vector
                await profile.update({
                  tasteVector: result.updated_taste_vector,
                });
                // Clear recommendation cache
                await cacheService.invalidateUserCache(req.user.id);
                
                logger.info('Taste vector auto-updated', {
                  userId: req.user.id,
                  clickedCount: clickedIds.length,
                  similarity: result.similarity_to_old,
                  majorShift: result.major_taste_shift,
                });
              }).catch(err => {
                logger.error('Auto taste vector update failed', {
                  userId: req.user.id,
                  error: err.message,
                });
              });
            }
          }
        }
      }
    } catch (trackError) {
      logger.error('Click tracking failed', { error: trackError.message });
    }
  }
  
  res.status(201).json({
    success: true,
    message: 'Interaction logged successfully',
    data: interaction,
  });
});

/**
 * @route   GET /api/v1/interactions/history
 * @desc    Get user interaction history
 * @access  Private
 */
exports.getHistory = asyncHandler(async (req, res) => {
  const { limit = 20, page = 1, type } = req.query;
  const offset = (page - 1) * limit;
  
  // Build query
  const where = { userId: req.user.id };
  if (type) {
    where.interactionType = type;
  }
  
  // Get interactions
  const { count, rows: interactions } = await Interaction.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset,
    order: [['createdAt', 'DESC']],
  });
  
  res.json({
    success: true,
    data: {
      interactions,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    },
  });
});

/**
 * @route   GET /api/v1/interactions/stats
 * @desc    Get user interaction statistics
 * @access  Private
 */
exports.getStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  // Get total interactions
  const totalInteractions = await Interaction.count({
    where: { userId },
  });
  
  // Get interactions by type
  const interactionsByType = await Interaction.findAll({
    where: { userId },
    attributes: [
      'interactionType',
      [Interaction.sequelize.fn('COUNT', Interaction.sequelize.col('id')), 'count'],
    ],
    group: ['interactionType'],
    raw: true,
  });
  
  // Get total watch time
  const watchTimeResult = await Interaction.findOne({
    where: {
      userId,
      watchDuration: { [Op.not]: null },
    },
    attributes: [
      [Interaction.sequelize.fn('SUM', Interaction.sequelize.col('watchDuration')), 'totalWatchTime'],
    ],
    raw: true,
  });
  
  const totalWatchTime = watchTimeResult?.totalWatchTime || 0;
  
  // Get average rating
  const ratingResult = await Interaction.findOne({
    where: {
      userId,
      rating: { [Op.not]: null },
    },
    attributes: [
      [Interaction.sequelize.fn('AVG', Interaction.sequelize.col('rating')), 'avgRating'],
      [Interaction.sequelize.fn('COUNT', Interaction.sequelize.col('rating')), 'ratingCount'],
    ],
    raw: true,
  });
  
  const avgRating = ratingResult?.avgRating || 0;
  const ratingCount = ratingResult?.ratingCount || 0;
  
  res.json({
    success: true,
    data: {
      totalInteractions,
      interactionsByType: interactionsByType.reduce((acc, item) => {
        acc[item.interactionType] = parseInt(item.count);
        return acc;
      }, {}),
      totalWatchTime: parseInt(totalWatchTime),
      avgRating: parseFloat(avgRating).toFixed(2),
      ratingCount: parseInt(ratingCount),
    },
  });
});
