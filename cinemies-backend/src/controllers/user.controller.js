/**
 * User Controller
 * Handles user profile management
 */

const { User, UserProfile, Interaction } = require('../models');
const CalibrationMovie = require('../models/CalibrationMovie');
const { asyncHandler, NotFoundError, ValidationError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user with onboarding status and taste insights
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  const profile = await UserProfile.findOne({
    where: { userId: req.user.id },
  });
  
  // Calculate taste insights
  let tasteInsights = null;
  if (profile && profile.ratedMovieIds && profile.ratedMovieIds.length > 0) {
    // Get top genres from rated movies
    const likedMovieIds = profile.ratedMovieIds
      .filter(r => r.rating === 1)
      .map(r => r.tmdb_id);
    
    let topGenres = [];
    try {
      if (likedMovieIds.length > 0) {
        const likedMovies = await CalibrationMovie.find({
          tmdb_id: { $in: likedMovieIds },
        }).select('genres');
        
        // Count genre occurrences
        const genreCounts = {};
        likedMovies.forEach(movie => {
          (movie.genres || []).forEach(genre => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          });
        });
        
        // Sort by count and take top 3
        topGenres = Object.entries(genreCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([genre]) => genre);
      }
    } catch (err) {
      logger.error('Failed to compute top genres', { error: err.message });
    }
    
    // Count interactions
    let interactionCount = 0;
    try {
      interactionCount = await Interaction.count({
        where: { userId: req.user.id },
      });
    } catch (err) {
      logger.error('Failed to count interactions', { error: err.message });
    }
    
    // Profile age in days
    const profileAgeDays = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    tasteInsights = {
      top_genres: topGenres,
      interaction_count: interactionCount,
      profile_age_days: profileAgeDays,
      total_ratings: profile.ratedMovieIds.length,
      positive_ratings: profile.ratedMovieIds.filter(r => r.rating === 1).length,
      negative_ratings: profile.ratedMovieIds.filter(r => r.rating === -1).length,
      has_taste_vector: !!profile.tasteVector,
    };
  }
  
  res.json({
    success: true,
    data: {
      user: user.toSafeObject(),
      onboarding_completed: user.onboardingCompleted,
      has_taste_vector: !!(profile && profile.tasteVector),
      taste_insights: tasteInsights,
      cohort: profile?.abTestCohort || null,
    },
  });
});

/**
 * @route   GET /api/v1/profile
 * @desc    Get user profile
 * @access  Private
 */
exports.getProfile = asyncHandler(async (req, res) => {
  const profile = await UserProfile.findOne({
    where: { userId: req.user.id },
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'email', 'firstName', 'lastName', 'createdAt'],
    }],
  });
  
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }
  
  res.json({
    success: true,
    data: profile,
  });
});

/**
 * @route   PUT /api/v1/profile
 * @desc    Update user profile
 * @access  Private
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, preferredGenres, preferredLanguages, preferences } = req.body;
  
  // Update user
  if (firstName || lastName) {
    await req.user.update({
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
    });
  }
  
  // Update profile
  const profile = await UserProfile.findOne({
    where: { userId: req.user.id },
  });
  
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }
  
  await profile.update({
    ...(preferredGenres && { preferredGenres }),
    ...(preferredLanguages && { preferredLanguages }),
    ...(preferences && { preferences }),
  });
  
  logger.info('Profile updated', {
    userId: req.user.id,
  });
  
  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: profile,
  });
});

/**
 * @route   POST /api/v1/profile/favorites
 * @desc    Add favorite movie
 * @access  Private
 */
exports.addFavorite = asyncHandler(async (req, res) => {
  const { movieId } = req.body;
  
  const profile = await UserProfile.findOne({
    where: { userId: req.user.id },
  });
  
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }
  
  // Check if already in favorites
  if (profile.favoriteMovieIds.includes(movieId)) {
    throw new ValidationError('Movie already in favorites');
  }
  
  // Check limit
  if (profile.favoriteMovieIds.length >= 50) {
    throw new ValidationError('Maximum 50 favorites allowed');
  }
  
  // Add to favorites
  await profile.update({
    favoriteMovieIds: [...profile.favoriteMovieIds, movieId],
  });
  
  logger.info('Favorite added', {
    userId: req.user.id,
    movieId,
  });
  
  res.json({
    success: true,
    message: 'Movie added to favorites',
    data: profile,
  });
});

/**
 * @route   DELETE /api/v1/profile/favorites/:movieId
 * @desc    Remove favorite movie
 * @access  Private
 */
exports.removeFavorite = asyncHandler(async (req, res) => {
  const { movieId } = req.params;
  
  const profile = await UserProfile.findOne({
    where: { userId: req.user.id },
  });
  
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }
  
  // Remove from favorites
  const updatedFavorites = profile.favoriteMovieIds.filter(
    id => id !== parseInt(movieId)
  );
  
  await profile.update({
    favoriteMovieIds: updatedFavorites,
  });
  
  logger.info('Favorite removed', {
    userId: req.user.id,
    movieId,
  });
  
  res.json({
    success: true,
    message: 'Movie removed from favorites',
    data: profile,
  });
});

/**
 * @route   GET /api/v1/profile/history
 * @desc    Get watch history
 * @access  Private
 */
exports.getHistory = asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;
  
  const interactions = await Interaction.findAll({
    where: {
      userId: req.user.id,
      interactionType: ['watch_start', 'watch_complete'],
    },
    limit: parseInt(limit),
    order: [['createdAt', 'DESC']],
  });
  
  res.json({
    success: true,
    data: {
      history: interactions,
      count: interactions.length,
    },
  });
});

/**
 * @route   POST /api/v1/users/watchlist
 * @desc    Add movie to watchlist
 * @access  Private
 */
exports.addToWatchlist = asyncHandler(async (req, res) => {
  const { movieId } = req.body;
  
  const profile = await UserProfile.findOne({
    where: { userId: req.user.id },
  });
  
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }
  
  // Check if already watched
  if (profile.isWatched(movieId)) {
    throw new ValidationError('Movie is already in your watched list');
  }
  
  // Add to watchlist
  const added = await profile.addToWatchlist(movieId);
  
  if (!added) {
    throw new ValidationError('Movie is already in your watchlist');
  }
  
  // Track interaction
  await Interaction.create({
    userId: req.user.id,
    movieTmdbId: movieId,
    interactionType: 'watchlist_add',
    metadata: {},
  });
  
  logger.info('Added to watchlist', {
    userId: req.user.id,
    movieId,
  });
  
  res.json({
    success: true,
    message: 'Movie added to watchlist',
    data: {
      watchlist: profile.watchlist,
      count: profile.watchlist.length,
    },
  });
});

/**
 * @route   DELETE /api/v1/users/watchlist/:movieId
 * @desc    Remove movie from watchlist
 * @access  Private
 */
exports.removeFromWatchlist = asyncHandler(async (req, res) => {
  const { movieId } = req.params;
  
  const profile = await UserProfile.findOne({
    where: { userId: req.user.id },
  });
  
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }
  
  await profile.removeFromWatchlist(parseInt(movieId));
  
  // Track interaction
  await Interaction.create({
    userId: req.user.id,
    movieTmdbId: parseInt(movieId),
    interactionType: 'watchlist_remove',
    metadata: {},
  });
  
  logger.info('Removed from watchlist', {
    userId: req.user.id,
    movieId,
  });
  
  res.json({
    success: true,
    message: 'Movie removed from watchlist',
    data: {
      watchlist: profile.watchlist,
      count: profile.watchlist.length,
    },
  });
});

/**
 * @route   GET /api/v1/users/watchlist
 * @desc    Get user's watchlist
 * @access  Private
 */
exports.getWatchlist = asyncHandler(async (req, res) => {
  const profile = await UserProfile.findOne({
    where: { userId: req.user.id },
  });
  
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }
  
  res.json({
    success: true,
    data: {
      watchlist: profile.watchlist,
      count: profile.watchlist.length,
    },
  });
});

/**
 * @route   POST /api/v1/users/watched
 * @desc    Mark movie as watched
 * @access  Private
 */
exports.addToWatched = asyncHandler(async (req, res) => {
  const { movieId, userRating } = req.body;
  
  const profile = await UserProfile.findOne({
    where: { userId: req.user.id },
  });
  
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }
  
  // Add to watched (will also remove from watchlist if present)
  await profile.addToWatched(movieId, userRating);
  
  // Track interaction
  await Interaction.create({
    userId: req.user.id,
    movieTmdbId: movieId,
    interactionType: 'watch_complete',
    metadata: { user_rating: userRating },
  });
  
  logger.info('Marked as watched', {
    userId: req.user.id,
    movieId,
    userRating,
  });
  
  res.json({
    success: true,
    message: 'Movie marked as watched',
    data: {
      watched: profile.watched,
      count: profile.watched.length,
    },
  });
});

/**
 * @route   DELETE /api/v1/users/watched/:movieId
 * @desc    Remove movie from watched list
 * @access  Private
 */
exports.removeFromWatched = asyncHandler(async (req, res) => {
  const { movieId } = req.params;
  
  const profile = await UserProfile.findOne({
    where: { userId: req.user.id },
  });
  
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }
  
  await profile.removeFromWatched(parseInt(movieId));
  
  logger.info('Removed from watched', {
    userId: req.user.id,
    movieId,
  });
  
  res.json({
    success: true,
    message: 'Movie removed from watched list',
    data: {
      watched: profile.watched,
      count: profile.watched.length,
    },
  });
});

/**
 * @route   GET /api/v1/users/watched
 * @desc    Get user's watched list with details
 * @access  Private
 */
exports.getWatched = asyncHandler(async (req, res) => {
  const profile = await UserProfile.findOne({
    where: { userId: req.user.id },
  });
  
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }
  
  res.json({
    success: true,
    data: {
      watched: profile.watched,
      watchedMetadata: profile.watchedMetadata || [],
      count: profile.watched.length,
    },
  });
});
