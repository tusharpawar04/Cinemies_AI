/**
 * Input Validation Middleware
 * Uses Joi for schema validation
 */

const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Validate request against Joi schema
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      logger.warn('Validation error', {
        path: req.path,
        errors,
        body: req.body,
      });
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }
    
    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
};

/**
 * Validation Schemas
 */
const schemas = {
  // Authentication
  register: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .trim()
      .lowercase()
      .max(255)
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
    password: Joi.string()
      .min(8)
      .max(100)
      .required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .messages({
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character',
        'any.required': 'Password is required',
      }),
    firstName: Joi.string()
      .min(1)
      .max(50)
      .trim()
      .optional(),
    lastName: Joi.string()
      .min(1)
      .max(50)
      .trim()
      .optional(),
  }),
  
  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .trim()
      .lowercase()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required',
      }),
  }),
  
  refreshToken: Joi.object({
    refreshToken: Joi.string()
      .required()
      .messages({
        'any.required': 'Refresh token is required',
      }),
  }),
  
  forgotPassword: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .trim()
      .lowercase(),
  }),
  
  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: Joi.string()
      .min(8)
      .max(100)
      .required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  }),
  
  // User Profile
  updateProfile: Joi.object({
    firstName: Joi.string().min(1).max(50).trim().optional(),
    lastName: Joi.string().min(1).max(50).trim().optional(),
    preferredGenres: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    preferredLanguages: Joi.array().items(Joi.string().max(10)).max(5).optional(),
    preferences: Joi.object().optional(),
  }),
  
  addFavorite: Joi.object({
    movieId: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'Movie ID must be a number',
        'any.required': 'Movie ID is required',
      }),
  }),
  
  // Interactions
  logInteraction: Joi.object({
    movieTmdbId: Joi.number().integer().positive().optional().allow(null),
    interactionType: Joi.string()
      .valid(
        'view', 'click', 'movie_click',
        'watch_start', 'watch_complete',
        'rating', 'favorite', 'unfavorite',
        'watchlist_add', 'watchlist_remove',
        'taste_calibration_started', 'taste_calibration_completed', 'taste_calibration_skipped',
        'recommendation_request', 'exploration_click'
      )
      .required(),
    rating: Joi.number().min(0).max(10).optional(),
    watchDuration: Joi.number().integer().min(0).optional(),
    metadata: Joi.object().optional(),
  }),
  
  // Movie Search
  searchMovies: Joi.object({
    q: Joi.string().min(1).max(200).required(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    page: Joi.number().integer().min(1).default(1),
  }),
  
  // Pagination
  pagination: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    page: Joi.number().integer().min(1).default(1),
  }),
};

/**
 * Validate query parameters
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Query validation failed',
        details: errors,
      });
    }
    
    req.query = value;
    next();
  };
};

/**
 * Validate URL parameters
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Parameter validation failed',
        details: errors,
      });
    }
    
    req.params = value;
    next();
  };
};

module.exports = {
  validate,
  validateQuery,
  validateParams,
  schemas,
};
