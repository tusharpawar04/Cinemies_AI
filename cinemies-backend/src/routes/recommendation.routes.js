/**
 * Recommendation Routes
 */

const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendation.controller');
const { protect, optionalAuth } = require('../middleware/auth');
const Joi = require('joi');
const { validateParams, validateQuery } = require('../middleware/validation');

// Public routes (personalized if authenticated)
router.get(
  '/mood/:mood',
  optionalAuth,
  validateParams(Joi.object({ mood: Joi.string().required() })),
  validateQuery(Joi.object({ 
    industry: Joi.string().valid('bollywood', 'hollywood', 'all').optional()
  })),
  recommendationController.getMoodRecommendations
);

router.get('/moods', recommendationController.getAvailableMoods);

// Protected routes
router.post('/personalized', protect, recommendationController.getPersonalizedRecommendations);

// Cache management routes
router.delete(
  '/cache', 
  protect, 
  validateQuery(Joi.object({
    type: Joi.string().valid('user', 'all', 'recommendations').optional()
  })),
  recommendationController.clearCache
);

router.get('/cache/stats', protect, recommendationController.getCacheStats);

// Session tracking routes
router.get('/session/viewed', protect, recommendationController.getSessionViewed);

module.exports = router;
