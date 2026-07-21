/**
 * Cache Service
 * Provides high-level caching utilities for recommendations and sessions
 */

const { cache } = require('../database/redis');
const logger = require('../utils/logger');

class CacheService {
  /**
   * Cache wrapper for functions
   * Automatically caches function results
   */
  async wrap(key, ttl, fn) {
    try {
      // Check cache
      const cached = await cache.get(key);
      if (cached !== null) {
        logger.debug('Cache hit', { key });
        return cached;
      }
      
      // Execute function
      logger.debug('Cache miss', { key });
      const result = await fn();
      
      // Cache result
      await cache.set(key, result, ttl);
      
      return result;
    } catch (error) {
      logger.error('Cache wrap error', {
        key,
        error: error.message,
      });
      // If cache fails, still return function result
      return await fn();
    }
  }
  
  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern) {
    try {
      const deletedCount = await cache.delPattern(pattern);
      logger.info('Cache invalidated', {
        pattern,
        count: deletedCount,
      });
      return deletedCount;
    } catch (error) {
      logger.error('Cache invalidation error', {
        pattern,
        error: error.message,
      });
      return 0;
    }
  }
  
  /**
   * Invalidate user-specific caches (personalized recommendations + sessions)
   */
  async invalidateUserCache(userId) {
    try {
      const result = await cache.invalidateUserCache(userId);
      logger.info(`Cache invalidated for user ${userId}`);
      return result;
    } catch (error) {
      logger.error('User cache invalidation error', {
        userId,
        error: error.message,
      });
      return false;
    }
  }
  
  /**
   * Clear all recommendation caches
   */
  async clearRecommendationCaches() {
    try {
      const deletedCount = await cache.invalidateAllRecommendations();
      logger.info(`All recommendation caches cleared: ${deletedCount} keys`);
      return deletedCount;
    } catch (error) {
      logger.error('Recommendation cache clear error', error);
      return 0;
    }
  }
  
  /**
   * Clear all cache
   */
  async clearAll() {
    try {
      await cache.flush();
      logger.info('All cache cleared');
      return true;
    } catch (error) {
      logger.error('Cache clear error', error);
      return false;
    }
  }
  
  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const stats = await cache.getStats();
      return {
        connected: true,
        ...stats,
      };
    } catch (error) {
      logger.error('Cache stats error', error);
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  // Recommendation-specific cache methods
  
  /**
   * Cache mood-based recommendations
   */
  async cacheRecommendations(mood, industry, data) {
    return await cache.setRecommendation(mood, industry, data);
  }

  /**
   * Get cached mood-based recommendations
   */
  async getCachedRecommendations(mood, industry) {
    return await cache.getRecommendation(mood, industry);
  }

  /**
   * Cache personalized recommendations
   */
  async cachePersonalizedRecommendations(mood, userId, data) {
    return await cache.setPersonalizedRecommendation(mood, userId, data);
  }

  /**
   * Get cached personalized recommendations
   */
  async getCachedPersonalizedRecommendations(mood, userId) {
    return await cache.getPersonalizedRecommendation(mood, userId);
  }

  /**
   * Track viewed movies in session
   */
  async addToSessionViewed(userId, movieId) {
    return await cache.addToSessionViewed(userId, movieId);
  }

  /**
   * Get session viewed movies
   */
  async getSessionViewed(userId) {
    return await cache.getSessionViewed(userId);
  }

  /**
   * Get raw Redis client for direct operations
   */
  getClient() {
    return cache.getClient ? cache.getClient() : cache.client || null;
  }
}

module.exports = new CacheService();
