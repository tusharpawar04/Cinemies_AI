/**
 * Analytics Routes
 * A/B testing and performance metrics
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { protect } = require('../middleware/auth');
const Joi = require('joi');
const { validateQuery } = require('../middleware/validation');

// All analytics routes require authentication
// TODO: Add admin-only middleware for production

// A/B Testing Analytics
router.get(
  '/ab-testing',
  protect,
  validateQuery(Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    cohort: Joi.string().valid('control', 'variant_a', 'variant_b').optional(),
  })),
  analyticsController.getABTestingAnalytics
);

// Recommendation Quality Metrics
router.get(
  '/recommendation-quality',
  protect,
  validateQuery(Joi.object({
    cohort: Joi.string().valid('control', 'variant_a', 'variant_b').optional(),
    days: Joi.number().integer().min(1).max(90).optional(),
  })),
  analyticsController.getRecommendationQuality
);

// Taste Calibration Metrics
router.get(
  '/taste-calibration',
  protect,
  analyticsController.getTasteCalibrationMetrics
);

// Cache Performance Metrics
router.get(
  '/cache-performance',
  protect,
  analyticsController.getCachePerformance
);

module.exports = router;
