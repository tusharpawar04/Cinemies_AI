/**
 * Route Aggregator
 * Mounts all routes with API versioning
 */

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const movieRoutes = require('./movie.routes');
const recommendationRoutes = require('./recommendation.routes');
const interactionRoutes = require('./interaction.routes');
const onboardingRoutes = require('./onboarding.routes');
const analyticsRoutes = require('./analytics.routes');

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Cinemies API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/movies', movieRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/interactions', interactionRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
