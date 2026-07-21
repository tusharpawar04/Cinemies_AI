/**
 * Rate Limiting Middleware
 * Prevents brute force attacks and API abuse
 */

const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000 / 60) + ' minutes',
    });
  },
});

/**
 * Strict rate limiter for authentication routes
 * 5 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    success: false,
    error: 'Too many login attempts, please try again later',
  },
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      email: req.body.email,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: 'Too many login attempts, please try again in 15 minutes',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

/**
 * Moderate rate limiter for registration
 * 3 registrations per hour per IP
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    error: 'Too many accounts created from this IP',
  },
  handler: (req, res) => {
    logger.warn('Registration rate limit exceeded', {
      ip: req.ip,
      email: req.body.email,
    });
    res.status(429).json({
      success: false,
      error: 'Too many accounts created, please try again later',
    });
  },
});

/**
 * Strict rate limiter for password reset
 * 3 requests per hour per IP
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    error: 'Too many password reset attempts',
  },
  handler: (req, res) => {
    logger.warn('Password reset rate limit exceeded', {
      ip: req.ip,
      email: req.body.email,
    });
    res.status(429).json({
      success: false,
      error: 'Too many password reset requests, please try again later',
    });
  },
});

/**
 * Moderate rate limiter for AI recommendations
 * 30 requests per minute per IP
 */
const recommendationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    success: false,
    error: 'Too many recommendation requests',
  },
  handler: (req, res) => {
    logger.warn('Recommendation rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: 'Too many requests, please slow down',
    });
  },
});

/**
 * Strict rate limiter for search
 * 20 searches per minute per IP
 */
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: {
    success: false,
    error: 'Too many search requests',
  },
  handler: (req, res) => {
    logger.warn('Search rate limit exceeded', {
      ip: req.ip,
      query: req.query.q,
    });
    res.status(429).json({
      success: false,
      error: 'Too many searches, please slow down',
    });
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
  recommendationLimiter,
  searchLimiter,
};
