/**
 * Onboarding Controller
 * Handles taste calibration movie selection and taste profile submission
 */

const { User, UserProfile, Interaction } = require('../models');
const CalibrationMovie = require('../models/CalibrationMovie');
const aiService = require('../services/ai.service');
const cacheService = require('../services/cache.service');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @route   GET /api/v1/onboarding/movies
 * @desc    Get 20 diverse movies for taste calibration
 * @access  Private
 */
exports.getCalibrationMovies = asyncHandler(async (req, res) => {
  // Select 20 diverse movies
  const movies = await CalibrationMovie.selectDiverseMovies(20);
  
  if (!movies || movies.length === 0) {
    throw new NotFoundError(
      'No calibration movies available. Please seed the calibration_movies collection.'
    );
  }
  
  // Format response
  const formattedMovies = movies.map(movie => ({
    tmdb_id: movie.tmdb_id,
    title: movie.title,
    overview: movie.overview,
    poster_path: movie.poster_path,
    poster_url: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : null,
    backdrop_url: movie.backdrop_path
      ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}`
      : null,
    year: movie.year,
    genres: movie.genres,
    vote_average: movie.vote_average,
    industry: movie.industry,
  }));
  
  // Log which movies were shown for analytics
  try {
    await Interaction.create({
      userId: req.user.id,
      interactionType: 'taste_calibration_started',
      metadata: {
        shown_movie_ids: formattedMovies.map(m => m.tmdb_id),
        count: formattedMovies.length,
      },
    });
  } catch (logError) {
    logger.error('Failed to log calibration start', { error: logError.message });
  }
  
  logger.info('Calibration movies served', {
    userId: req.user.id,
    count: formattedMovies.length,
  });
  
  res.json({
    success: true,
    data: {
      movies: formattedMovies,
      count: formattedMovies.length,
      instructions: 'Rate each movie as Good (1), Don\'t Know (0), or Bad (-1)',
    },
  });
});

/**
 * @route   POST /api/v1/users/taste-profile
 * @desc    Submit taste calibration ratings and generate taste vector
 * @access  Private
 */
exports.submitTasteProfile = asyncHandler(async (req, res) => {
  const { rated_movies } = req.body;
  
  // Validate rated_movies array
  if (!rated_movies || !Array.isArray(rated_movies)) {
    throw new ValidationError('rated_movies array is required');
  }
  
  if (rated_movies.length < 10) {
    throw new ValidationError(
      `Need at least 10 rated movies, got ${rated_movies.length}`
    );
  }
  
  // Validate each rating
  for (const movie of rated_movies) {
    if (!movie.tmdb_id || typeof movie.tmdb_id !== 'number') {
      throw new ValidationError('Each movie must have a numeric tmdb_id');
    }
    if (![1, 0, -1].includes(movie.rating)) {
      throw new ValidationError(
        `Invalid rating ${movie.rating} for movie ${movie.tmdb_id}. Must be 1, 0, or -1`
      );
    }
  }
  
  // Check minimum good and bad ratings
  const goodCount = rated_movies.filter(m => m.rating === 1).length;
  const badCount = rated_movies.filter(m => m.rating === -1).length;
  const neutralCount = rated_movies.filter(m => m.rating === 0).length;
  
  if (goodCount < 3) {
    throw new ValidationError(
      `Need at least 3 "Good" ratings, got ${goodCount}. Rate more movies positively.`
    );
  }
  
  // Removed badCount validation to allow users to proceed without disliking any movies
  
  logger.info('Taste profile submission', {
    userId: req.user.id,
    total: rated_movies.length,
    good: goodCount,
    bad: badCount,
    neutral: neutralCount,
  });
  
  // Forward to AI Engine to generate taste vector
  let tasteVectorResponse;
  try {
    tasteVectorResponse = await aiService.generateTasteVector(rated_movies);
  } catch (aiError) {
    logger.error('AI Engine taste vector generation failed', {
      userId: req.user.id,
      error: aiError.message,
    });
    throw new ValidationError(
      'Failed to generate taste profile. Please try again. ' +
      (aiError.response?.data?.detail || aiError.message)
    );
  }
  
  const tasteVector = tasteVectorResponse.taste_vector;
  
  // Validate vector dimension
  if (!tasteVector || tasteVector.length !== 384) {
    throw new ValidationError(
      `Invalid taste vector dimension: ${tasteVector?.length}. Expected 384.`
    );
  }
  
  // Save to PostgreSQL
  const profile = await UserProfile.findOne({
    where: { userId: req.user.id },
  });
  
  if (!profile) {
    throw new NotFoundError('User profile not found');
  }
  
  // Save taste vector and rated movies
  await profile.update({
    tasteVector: tasteVector,
    ratedMovieIds: rated_movies.map(m => ({
      tmdb_id: m.tmdb_id,
      rating: m.rating,
    })),
  });
  
  // Set onboarding completed
  await User.update(
    { onboardingCompleted: true },
    { where: { id: req.user.id } }
  );
  
  // Clear recommendation cache for this user
  try {
    await cacheService.invalidateUserCache(req.user.id);
  } catch (cacheError) {
    logger.error('Failed to clear recommendation cache', {
      error: cacheError.message,
    });
  }
  
  // Update calibration movie statistics
  try {
    for (const movie of rated_movies) {
      const calibrationMovie = await CalibrationMovie.findOne({
        tmdb_id: movie.tmdb_id,
      });
      if (calibrationMovie) {
        await calibrationMovie.recordRating(movie.rating);
      }
    }
  } catch (statsError) {
    logger.error('Failed to update calibration stats', {
      error: statsError.message,
    });
  }
  
  // Log completion interaction
  try {
    await Interaction.create({
      userId: req.user.id,
      interactionType: 'taste_calibration_completed',
      metadata: {
        rated_count: rated_movies.length,
        good_count: goodCount,
        bad_count: badCount,
        neutral_count: neutralCount,
        vector_dimension: tasteVector.length,
        alpha: tasteVectorResponse.alpha,
        warnings: tasteVectorResponse.warnings,
      },
    });
  } catch (logError) {
    logger.error('Failed to log calibration completion', {
      error: logError.message,
    });
  }
  
  logger.info('Taste profile created successfully', {
    userId: req.user.id,
    vectorDim: tasteVector.length,
    liked: tasteVectorResponse.liked_count,
    disliked: tasteVectorResponse.disliked_count,
  });
  
  res.status(201).json({
    success: true,
    message: 'Taste profile created successfully',
    data: {
      dimension: tasteVector.length,
      liked_count: tasteVectorResponse.liked_count,
      disliked_count: tasteVectorResponse.disliked_count,
      neutral_count: tasteVectorResponse.neutral_count,
      warnings: tasteVectorResponse.warnings || [],
      rating_distribution: {
        good: goodCount,
        bad: badCount,
        neutral: neutralCount,
      },
    },
  });
});

/**
 * @route   POST /api/v1/onboarding/skip
 * @desc    Skip taste calibration
 * @access  Private
 */
exports.skipCalibration = asyncHandler(async (req, res) => {
  // Set onboarding completed without taste vector
  await User.update(
    { onboardingCompleted: true },
    { where: { id: req.user.id } }
  );
  
  // Log skip interaction
  try {
    await Interaction.create({
      userId: req.user.id,
      interactionType: 'taste_calibration_skipped',
      metadata: {},
    });
  } catch (logError) {
    logger.error('Failed to log calibration skip', { error: logError.message });
  }
  
  logger.info('Taste calibration skipped', { userId: req.user.id });
  
  res.json({
    success: true,
    message: 'Taste calibration skipped. You can complete it later from your profile.',
  });
});
