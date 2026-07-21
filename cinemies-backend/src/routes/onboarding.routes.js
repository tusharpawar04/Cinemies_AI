/**
 * Onboarding Routes
 * Handles taste calibration flow endpoints
 */

const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboarding.controller');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Get calibration movies for rating
router.get('/movies', onboardingController.getCalibrationMovies);

// Submit taste profile (ratings)
router.post('/taste-profile', onboardingController.submitTasteProfile);

// Skip calibration
router.post('/skip', onboardingController.skipCalibration);

module.exports = router;
