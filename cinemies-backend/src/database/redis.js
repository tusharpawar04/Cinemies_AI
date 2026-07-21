/**
 * Redis connection for caching
 * Caches AI recommendations and frequently accessed data
 */

const redis = require('redis');
const config = require('../config');
const logger = require('../utils/logger');

// Create Redis client
const redisClient = redis.createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  },
  password: config.redis.password,
  database: config.redis.db,
});

// Error handling
redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('Redis client connecting...');
});

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

redisClient.on('end', () => {
  logger.info('Redis client disconnected');
});

// Connect to Redis
const connectRedis = async () => {
  try {
    await redisClient.connect();
    logger.info('Redis connection established successfully');
  } catch (error) {
    logger.error('Unable to connect to Redis:', error);
    // Don't throw - Redis is optional, app can work without it
  }
};

// Close Redis connection
const closeRedis = async () => {
  try {
    await redisClient.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
};

// Cache helper functions
const cache = {
  /**
   * Cache key patterns for consistency
   */
  keys: {
    /**
     * Generate recommendation cache key
     * Pattern: rec:{mood}:{industry}
     */
    recommendation: (mood, industry = 'all') => `rec:${mood}:${industry}`,
    
    /**
     * Generate personalized recommendation cache key  
     * Pattern: rec:personalized:{mood}:{userId}
     */
    personalizedRecommendation: (mood, userId) => `rec:personalized:${mood}:${userId}`,
    
    /**
     * Generate session cache key
     * Pattern: session:{userId}:viewed
     */
    sessionViewed: (userId) => `session:${userId}:viewed`,
    
    /**
     * Generate user pattern for cache invalidation
     * Pattern: *:{userId}* or specific patterns
     */
    userPattern: (userId) => `*:${userId}*`,
    personalizedPattern: (userId) => `rec:personalized:*:${userId}`,
  },

  /**
   * Get value from cache
   */
  async get(key) {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Set value in cache with TTL
   */
  async set(key, value, ttl = config.redis.ttl.default) {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Set recommendation cache with proper TTL
   */
  async setRecommendation(mood, industry, data) {
    const key = cache.keys.recommendation(mood, industry);
    return cache.set(key, data, config.redis.ttl.recommendations);
  },

  /**
   * Get recommendation cache
   */
  async getRecommendation(mood, industry) {
    const key = cache.keys.recommendation(mood, industry);
    return cache.get(key);
  },

  /**
   * Set personalized recommendation cache with proper TTL
   */
  async setPersonalizedRecommendation(mood, userId, data) {
    const key = cache.keys.personalizedRecommendation(mood, userId);
    return cache.set(key, data, config.redis.ttl.personalized);
  },

  /**
   * Get personalized recommendation cache
   */
  async getPersonalizedRecommendation(mood, userId) {
    const key = cache.keys.personalizedRecommendation(mood, userId);
    return cache.get(key);
  },

  /**
   * Set session viewed data with proper TTL
   */
  async setSessionViewed(userId, viewedMovies) {
    const key = cache.keys.sessionViewed(userId);
    return cache.set(key, viewedMovies, config.redis.ttl.sessions);
  },

  /**
   * Get session viewed data (returns array of movie IDs)
   */
  async getSessionViewed(userId) {
    try {
      const key = cache.keys.sessionViewed(userId);
      const members = await redisClient.sMembers(key);
      return members.length > 0 ? members.map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
    } catch (error) {
      logger.error(`Redis getSessionViewed error for userId ${userId}:`, error);
      return [];
    }
  },

  /**
   * Atomically add a movie to the session viewed set.
   * Uses Redis SADD which is atomic — no race condition on concurrent requests.
   */
  async addToSessionViewed(userId, movieId) {
    try {
      const key = cache.keys.sessionViewed(userId);
      // SADD is atomic: adds member to set only if not already present
      await redisClient.sAdd(key, String(movieId));
      // Refresh TTL on every add so active sessions stay alive
      await redisClient.expire(key, config.redis.ttl.sessions);
      return true;
    } catch (error) {
      logger.error(`Redis addToSessionViewed error for userId ${userId}:`, error);
      return false;
    }
  },

  /**
   * Delete key from cache
   */
  async del(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Delete multiple keys matching pattern
   */
  async delPattern(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
        return keys.length;
      }
      return 0;
    } catch (error) {
      logger.error(`Redis delPattern error for pattern ${pattern}:`, error);
      return 0;
    }
  },

  /**
   * Invalidate user-specific caches
   */
  async invalidateUserCache(userId) {
    try {
      const deletedCount = await cache.delPattern(cache.keys.personalizedPattern(userId));
      const sessionKey = cache.keys.sessionViewed(userId);
      await cache.del(sessionKey);
      
      logger.info(`Invalidated cache for user ${userId}: ${deletedCount} personalized + 1 session`);
      return true;
    } catch (error) {
      logger.error(`Cache invalidation error for user ${userId}:`, error);
      return false;
    }
  },

  /**
   * Invalidate all recommendation caches
   */
  async invalidateAllRecommendations() {
    try {
      const deletedCount = await cache.delPattern('rec:*');
      logger.info(`Invalidated all recommendation caches: ${deletedCount} keys`);
      return deletedCount;
    } catch (error) {
      logger.error('Error invalidating all recommendations cache:', error);
      return 0;
    }
  },

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Get TTL for a key
   */
  async ttl(key) {
    try {
      return await redisClient.ttl(key);
    } catch (error) {
      logger.error(`Redis TTL error for key ${key}:`, error);
      return -1;
    }
  },

  /**
   * Clear all cache (use with caution)
   */
  async flush() {
    try {
      await redisClient.flushDb();
      logger.info('Redis cache flushed');
      return true;
    } catch (error) {
      logger.error('Redis FLUSH error:', error);
      return false;
    }
  },

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const info = await redisClient.info('stats');
      const keyCount = await redisClient.dbSize();
      return {
        keyCount,
        info,
        patterns: {
          recommendations: await redisClient.keys('rec:*').then(keys => keys.length),
          personalized: await redisClient.keys('rec:personalized:*').then(keys => keys.length),
          sessions: await redisClient.keys('session:*').then(keys => keys.length),
        }
      };
    } catch (error) {
      logger.error('Redis INFO error:', error);
      return null;
    }
  },
};

module.exports = {
  redisClient,
  connectRedis,
  closeRedis,
  cache,
};
