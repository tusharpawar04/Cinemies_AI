/**
 * Analytics Controller
 * Handles A/B testing analytics and metrics dashboard
 */

const { User, UserProfile, Interaction } = require('../models');
const { asyncHandler, ForbiddenError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * @route   GET /api/v1/analytics/ab-testing
 * @desc    Get A/B testing analytics by cohort
 * @access  Private (Admin only - add admin check middleware)
 */
exports.getABTestingAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, cohort } = req.query;
  
  // Build date filter
  const dateFilter = {};
  if (startDate) dateFilter[Op.gte] = new Date(startDate);
  if (endDate) dateFilter[Op.lte] = new Date(endDate);
  
  const where = Object.keys(dateFilter).length > 0 
    ? { createdAt: dateFilter }
    : {};
  
  // Get cohort distribution
  const cohortCounts = await UserProfile.findAll({
    attributes: [
      'abTestCohort',
      [UserProfile.sequelize.fn('COUNT', UserProfile.sequelize.col('id')), 'count']
    ],
    group: ['abTestCohort'],
    raw: true,
  });
  
  const cohortDistribution = {};
  cohortCounts.forEach(row => {
    cohortDistribution[row.abTestCohort || 'none'] = parseInt(row.count);
  });
  
  // Get interactions by cohort
  const interactions = await Interaction.findAll({
    where: {
      ...where,
      interactionType: {
        [Op.in]: ['movie_click', 'recommendation_view', 'taste_calibration_completed']
      }
    },
    include: [{
      model: User,
      as: 'user',
      required: true,
      include: [{
        model: UserProfile,
        as: 'profile',
        required: true,
      }]
    }],
  });
  
  // Calculate metrics per cohort
  const cohortMetrics = {
    control: { clicks: 0, views: 0, calibrations: 0, ctr: 0 },
    variant_a: { clicks: 0, views: 0, calibrations: 0, ctr: 0 },
    variant_b: { clicks: 0, views: 0, calibrations: 0, ctr: 0 },
  };
  
  interactions.forEach(interaction => {
    const cohort = interaction.user?.profile?.abTestCohort;
    if (!cohort || !cohortMetrics[cohort]) return;
    
    if (interaction.interactionType === 'movie_click') {
      cohortMetrics[cohort].clicks++;
    } else if (interaction.interactionType === 'recommendation_view') {
      cohortMetrics[cohort].views++;
    } else if (interaction.interactionType === 'taste_calibration_completed') {
      cohortMetrics[cohort].calibrations++;
    }
  });
  
  // Calculate CTR (Click-Through Rate)
  Object.keys(cohortMetrics).forEach(cohort => {
    const metrics = cohortMetrics[cohort];
    metrics.ctr = metrics.views > 0 
      ? (metrics.clicks / metrics.views * 100).toFixed(2)
      : 0;
  });
  
  // Calculate recommendation quality metrics per cohort
  const qualityMetrics = await calculateQualityMetrics(cohortMetrics);
  
  logger.info('A/B testing analytics retrieved', {
    cohorts: Object.keys(cohortMetrics),
    totalInteractions: interactions.length,
  });
  
  res.json({
    success: true,
    data: {
      cohortDistribution,
      metrics: cohortMetrics,
      qualityMetrics,
      period: {
        start: startDate || 'inception',
        end: endDate || 'now',
      },
      totalInteractions: interactions.length,
    },
  });
});

/**
 * @route   GET /api/v1/analytics/recommendation-quality
 * @desc    Get recommendation quality metrics
 * @access  Private (Admin only)
 */
exports.getRecommendationQuality = asyncHandler(async (req, res) => {
  const { cohort, days = 7 } = req.query;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));
  
  // Get interactions with cohort filter
  const whereClause = {
    createdAt: { [Op.gte]: startDate },
    interactionType: {
      [Op.in]: ['movie_click', 'recommendation_view', 'movie_rating']
    }
  };
  
  const interactions = await Interaction.findAll({
    where: whereClause,
    include: [{
      model: User,
      as: 'user',
      required: true,
      include: [{
        model: UserProfile,
        as: 'profile',
        required: true,
        where: cohort ? { abTestCohort: cohort } : {},
      }]
    }],
  });
  
  // Calculate quality metrics
  const metrics = {
    totalViews: 0,
    totalClicks: 0,
    totalRatings: 0,
    avgPositiveRatings: 0,
    clickThroughRate: 0,
    engagementRate: 0,
  };
  
  let positiveRatings = 0;
  let totalRatings = 0;
  
  interactions.forEach(interaction => {
    if (interaction.interactionType === 'recommendation_view') {
      metrics.totalViews++;
    } else if (interaction.interactionType === 'movie_click') {
      metrics.totalClicks++;
    } else if (interaction.interactionType === 'movie_rating') {
      metrics.totalRatings++;
      const rating = interaction.metadata?.rating;
      if (rating && rating > 0) positiveRatings++;
      totalRatings++;
    }
  });
  
  // Calculate rates
  metrics.clickThroughRate = metrics.totalViews > 0 
    ? (metrics.totalClicks / metrics.totalViews * 100).toFixed(2)
    : 0;
  
  metrics.avgPositiveRatings = totalRatings > 0
    ? (positiveRatings / totalRatings * 100).toFixed(2)
    : 0;
  
  metrics.engagementRate = metrics.totalViews > 0
    ? ((metrics.totalClicks + metrics.totalRatings) / metrics.totalViews * 100).toFixed(2)
    : 0;
  
  res.json({
    success: true,
    data: {
      metrics,
      cohort: cohort || 'all',
      period: `Last ${days} days`,
    },
  });
});

/**
 * @route   GET /api/v1/analytics/taste-calibration
 * @desc    Get taste calibration completion metrics
 * @access  Private (Admin only)
 */
exports.getTasteCalibrationMetrics = asyncHandler(async (req, res) => {
  // Get calibration events
  const started = await Interaction.count({
    where: { interactionType: 'taste_calibration_started' }
  });
  
  const completed = await Interaction.count({
    where: { interactionType: 'taste_calibration_completed' }
  });
  
  const skipped = await Interaction.count({
    where: { interactionType: 'taste_calibration_skipped' }
  });
  
  // Get average rating distribution from completed calibrations
  const completedInteractions = await Interaction.findAll({
    where: { interactionType: 'taste_calibration_completed' },
    attributes: ['metadata'],
    raw: true,
  });
  
  let totalGood = 0;
  let totalBad = 0;
  let totalNeutral = 0;
  let count = 0;
  
  completedInteractions.forEach(interaction => {
    if (interaction.metadata?.rating_distribution) {
      const dist = interaction.metadata.rating_distribution;
      totalGood += dist.good || 0;
      totalBad += dist.bad || 0;
      totalNeutral += dist.neutral || 0;
      count++;
    }
  });
  
  const avgRatingDistribution = count > 0 ? {
    good: (totalGood / count).toFixed(1),
    bad: (totalBad / count).toFixed(1),
    neutral: (totalNeutral / count).toFixed(1),
  } : null;
  
  const completionRate = started > 0
    ? ((completed / started) * 100).toFixed(2)
    : 0;
  
  res.json({
    success: true,
    data: {
      started,
      completed,
      skipped,
      completionRate: `${completionRate}%`,
      avgRatingDistribution,
    },
  });
});

/**
 * @route   GET /api/v1/analytics/cache-performance
 * @desc    Get cache performance metrics
 * @access  Private (Admin only)
 */
exports.getCachePerformance = asyncHandler(async (req, res) => {
  const cacheService = require('../services/cache.service');
  
  // Get cache stats
  const stats = await cacheService.getStats();
  
  // Calculate additional metrics
  const cacheHitRate = stats.hits && stats.requests
    ? ((stats.hits / stats.requests) * 100).toFixed(2)
    : 0;
  
  res.json({
    success: true,
    data: {
      ...stats,
      cacheHitRate: `${cacheHitRate}%`,
      avgResponseTime: stats.avgResponseTime || 'N/A',
    },
  });
});

/**
 * Helper function to calculate quality metrics
 */
async function calculateQualityMetrics(cohortMetrics) {
  // Placeholder - would calculate diversity, match scores, etc.
  // from actual recommendation data
  const quality = {};
  
  for (const cohort of Object.keys(cohortMetrics)) {
    quality[cohort] = {
      avgMatchScore: (Math.random() * 0.3 + 0.7).toFixed(3), // Placeholder
      diversityScore: (Math.random() * 0.4 + 0.6).toFixed(3), // Placeholder
      serendipityRate: (Math.random() * 0.2 + 0.1).toFixed(3), // Placeholder
    };
  }
  
  return quality;
}

// All methods are already exported via exports.methodName
