/**
 * User Profile Routes
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { validate, schemas, validateParams } = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const Joi = require('joi');

// All routes are protected
router.use(protect);

// Current user info with onboarding status
router.get('/me', userController.getMe);

// Profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', validate(schemas.updateProfile), userController.updateProfile);

// Favorites routes
router.post('/profile/favorites', validate(schemas.addFavorite), userController.addFavorite);
router.delete(
  '/profile/favorites/:movieId',
  validateParams(Joi.object({ movieId: Joi.number().integer().required() })),
  userController.removeFavorite
);

// Watchlist routes
router.get('/watchlist', userController.getWatchlist);
router.post('/watchlist', validate(schemas.addFavorite), userController.addToWatchlist);
router.delete(
  '/watchlist/:movieId',
  validateParams(Joi.object({ movieId: Joi.number().integer().required() })),
  userController.removeFromWatchlist
);

// Watched routes
router.get('/watched', userController.getWatched);
router.post('/watched', 
  validate(Joi.object({
    movieId: Joi.number().integer().positive().required(),
    userRating: Joi.number().min(0).max(10).optional().allow(null),
  })),
  userController.addToWatched
);
router.delete(
  '/watched/:movieId',
  validateParams(Joi.object({ movieId: Joi.number().integer().required() })),
  userController.removeFromWatched
);

// History route
router.get('/profile/history', userController.getHistory);

module.exports = router;
