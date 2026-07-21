/**
 * Movie Controller
 * Handles movie catalog operations
 */

const Movie = require('../models/Movie');
const { asyncHandler, NotFoundError } = require('../middleware/errorHandler');
const { cache } = require('../database/redis');
const logger = require('../utils/logger');

/**
 * @route   GET /api/v1/movies
 * @desc    Get all movies (paginated)
 * @access  Public
 */
exports.getAllMovies = asyncHandler(async (req, res) => {
  const { limit = 20, page = 1, genre, language } = req.query;
  const skip = (page - 1) * limit;
  
  // Build query
  const query = {};
  if (genre) {
    query.genres = { $in: [genre] };
  }
  if (language) {
    query.original_language = language;
  }
  
  // Get movies
  const [movies, total] = await Promise.all([
    Movie.find(query)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ popularity: -1 }),
    Movie.countDocuments(query),
  ]);
  
  res.json({
    success: true,
    data: {
      movies,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    },
  });
});

/**
 * @route   GET /api/v1/movies/search
 * @desc    Search movies
 * @access  Public
 */
exports.searchMovies = asyncHandler(async (req, res) => {
  const { q, limit = 20, page = 1 } = req.query;
  const skip = (page - 1) * limit;
  
  // Text search
  const movies = await Movie.find(
    { $text: { $search: q } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(parseInt(limit))
    .skip(skip);
  
  const total = await Movie.countDocuments({ $text: { $search: q } });
  
  logger.info('Movie search', {
    query: q,
    results: movies.length,
  });
  
  res.json({
    success: true,
    data: {
      movies,
      query: q,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    },
  });
});

/**
 * @route   GET /api/v1/movies/:id
 * @desc    Get movie details
 * @access  Public
 */
exports.getMovieById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check cache
  const cacheKey = `movie:${id}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return res.json({
      success: true,
      data: cached,
      cached: true,
    });
  }
  
  // Find movie
  const movie = await Movie.findOne({ tmdb_id: parseInt(id) });
  
  if (!movie) {
    throw new NotFoundError('Movie not found');
  }
  
  // Cache for 24 hours
  await cache.set(cacheKey, movie, 86400);
  
  res.json({
    success: true,
    data: movie,
    cached: false,
  });
});

/**
 * @route   GET /api/v1/movies/trending
 * @desc    Get trending movies
 * @access  Public
 */
exports.getTrendingMovies = asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;
  
  // Check cache
  const cacheKey = 'movies:trending';
  const cached = await cache.get(cacheKey);
  if (cached) {
    return res.json({
      success: true,
      data: cached,
      cached: true,
    });
  }
  
  // Get trending movies (high popularity + recent)
  const movies = await Movie.find({
    popularity: { $gte: 50 },
  })
    .sort({ popularity: -1, release_date: -1 })
    .limit(parseInt(limit));
  
  // Cache for 6 hours
  await cache.set(cacheKey, movies, 21600);
  
  res.json({
    success: true,
    data: {
      movies,
      count: movies.length,
    },
    cached: false,
  });
});


/**
 * @route   GET /api/v1/movies/:id/streaming
 * @desc    Get streaming platform availability for a movie
 * @access  Public
 */
exports.getStreamingAvailability = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { country = 'US' } = req.query;
  const { StreamingPlatform } = require('../models');
  const axios = require('axios');
  
  // Check cache first
  let cached = await StreamingPlatform.getForMovie(parseInt(id), country);
  
  // If cache is fresh (less than 7 days old), return it
  if (cached && !cached.isStale) {
    logger.info('Streaming data served from cache', { tmdbId: id, country });
    return res.json({
      success: true,
      data: {
        tmdb_id: cached.tmdbId,
        platforms: cached.platforms,
        country: cached.countryCode,
        cached: true,
        last_updated: cached.lastUpdated,
      },
    });
  }
  
  // Otherwise, fetch from TMDB API (requires TMDB_API_KEY in env)
  const tmdbApiKey = process.env.TMDB_API_KEY;
  
  if (!tmdbApiKey) {
    logger.warn('TMDB_API_KEY not configured, returning cached data or empty');
    return res.json({
      success: true,
      data: {
        tmdb_id: parseInt(id),
        platforms: cached?.platforms || [],
        country,
        cached: true,
        stale: !!cached,
        message: 'TMDB API key not configured. Showing cached data.',
      },
    });
  }
  
  try {
    // Fetch from TMDB API
    const response = await axios.get(
      `https://api.themoviedb.org/3/movie/${id}/watch/providers`,
      {
        params: { api_key: tmdbApiKey },
        timeout: 5000,
      }
    );
    
    const countryData = response.data.results?.[country];
    
    let platforms = [];
    if (countryData) {
      // Combine flatrate (subscription) and rent/buy options
      const flatrate = countryData.flatrate || [];
      const rent = countryData.rent || [];
      const buy = countryData.buy || [];
      
      // Priority: subscription > rent > buy
      platforms = [
        ...flatrate.map(p => ({ ...p, type: 'subscription', link: countryData.link })),
        ...rent.map(p => ({ ...p, type: 'rent', link: countryData.link })),
        ...buy.map(p => ({ ...p, type: 'buy', link: countryData.link })),
      ];
      
      // Remove duplicates (keep subscription if provider appears multiple times)
      const seen = new Set();
      platforms = platforms.filter(p => {
        if (seen.has(p.provider_id)) return false;
        seen.add(p.provider_id);
        return true;
      });
    }
    
    // Save to cache
    await StreamingPlatform.saveForMovie(parseInt(id), platforms, country);
    
    logger.info('Streaming data fetched from TMDB', { tmdbId: id, country, count: platforms.length });
    
    res.json({
      success: true,
      data: {
        tmdb_id: parseInt(id),
        platforms,
        country,
        cached: false,
        last_updated: new Date(),
      },
    });
    
  } catch (error) {
    logger.error('Failed to fetch streaming data from TMDB', {
      tmdbId: id,
      error: error.message,
    });
    
    // Return cached data if available, even if stale
    if (cached) {
      return res.json({
        success: true,
        data: {
          tmdb_id: cached.tmdbId,
          platforms: cached.platforms,
          country: cached.countryCode,
          cached: true,
          stale: true,
          last_updated: cached.lastUpdated,
        },
      });
    }
    
    // No cached data available
    res.json({
      success: true,
      data: {
        tmdb_id: parseInt(id),
        platforms: [],
        country,
        error: 'Unable to fetch streaming data at this time',
      },
    });
  }
});
