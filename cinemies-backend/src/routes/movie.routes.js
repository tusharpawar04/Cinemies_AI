/**
 * Movie Routes
 */

const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movie.controller');
const { validateQuery, schemas, validateParams } = require('../middleware/validation');
const { optionalAuth } = require('../middleware/auth');
const Joi = require('joi');

// All routes are public (but can be personalized if authenticated)
router.use(optionalAuth);

// Movie routes
router.get('/', validateQuery(schemas.pagination), movieController.getAllMovies);
router.get('/search', validateQuery(schemas.searchMovies), movieController.searchMovies);
router.get('/trending', movieController.getTrendingMovies);
router.get(
  '/:id',
  validateParams(Joi.object({ id: Joi.number().integer().required() })),
  movieController.getMovieById
);
router.get(
  '/:id/streaming',
  validateParams(Joi.object({ id: Joi.number().integer().required() })),
  movieController.getStreamingAvailability
);

module.exports = router;
