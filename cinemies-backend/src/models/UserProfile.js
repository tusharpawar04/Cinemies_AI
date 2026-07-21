/**
 * UserProfile Model (PostgreSQL)
 * Stores user preferences and favorite movies
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/postgres');

const UserProfile = sequelize.define('UserProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  favoriteMovieIds: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    defaultValue: [],
    validate: {
      isValidArray(value) {
        if (!Array.isArray(value)) {
          throw new Error('favoriteMovieIds must be an array');
        }
        if (value.length > 50) {
          throw new Error('Cannot have more than 50 favorite movies');
        }
      },
    },
  },
  preferredGenres: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  preferredLanguages: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: ['en'],
  },
  watchedMovieIds: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    defaultValue: [],
  },
  watchlist: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    defaultValue: [],
    comment: 'TMDB IDs of movies user wants to watch',
  },
  watched: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    defaultValue: [],
    comment: 'TMDB IDs of movies user has watched',
  },
  watchedMetadata: {
    type: DataTypes.JSONB,
    field: 'watched_metadata',
    defaultValue: [],
    comment: 'Detailed watched history with timestamps and ratings',
  },
  preferences: {
    type: DataTypes.JSONB,
    defaultValue: {},
    // Can store: { notifications: true, theme: 'dark', etc. }
  },
  tasteVector: {
    type: DataTypes.JSONB,
    allowNull: true,
    validate: {
      isValidTasteVector(value) {
        if (value !== null && value !== undefined) {
          if (!Array.isArray(value)) {
            throw new Error('tasteVector must be an array');
          }
          if (value.length !== 384) {
            throw new Error('tasteVector must have exactly 384 dimensions');
          }
          if (!value.every(v => typeof v === 'number')) {
            throw new Error('tasteVector must contain only numbers');
          }
        }
      },
    },
  },
  ratedMovieIds: {
    type: DataTypes.JSONB,
    defaultValue: [],
    validate: {
      isValidRatedMovies(value) {
        if (!Array.isArray(value)) {
          throw new Error('ratedMovieIds must be an array');
        }
        // Each item should be { tmdb_id: number, rating: -1|0|1 }
        value.forEach(item => {
          if (typeof item !== 'object' || !item.hasOwnProperty('tmdb_id') || !item.hasOwnProperty('rating')) {
            throw new Error('Each rated movie must have tmdb_id and rating fields');
          }
          if (typeof item.tmdb_id !== 'number') {
            throw new Error('tmdb_id must be a number');
          }
          if (![1, 0, -1].includes(item.rating)) {
            throw new Error('rating must be 1 (Good), 0 (Don\'t Know), or -1 (Bad)');
          }
        });
      },
    },
  },
  abTestCohort: {
    type: DataTypes.ENUM('control', 'variant_a', 'variant_b'),
    allowNull: true,
  },
}, {
  tableName: 'user_profiles',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId'],
    },
  ],
});

// Instance methods
UserProfile.prototype.addFavoriteMovie = async function(movieId) {
  if (!this.favoriteMovieIds.includes(movieId)) {
    const updated = [...this.favoriteMovieIds, movieId];
    await this.update({ favoriteMovieIds: updated });
  }
};

UserProfile.prototype.removeFavoriteMovie = async function(movieId) {
  const updated = this.favoriteMovieIds.filter(id => id !== movieId);
  await this.update({ favoriteMovieIds: updated });
};

UserProfile.prototype.addToWatchlist = async function(movieId) {
  if (!this.watchlist.includes(movieId)) {
    const updated = [...this.watchlist, movieId];
    await this.update({ watchlist: updated });
    return true;
  }
  return false;
};

UserProfile.prototype.removeFromWatchlist = async function(movieId) {
  const updated = this.watchlist.filter(id => id !== movieId);
  await this.update({ watchlist: updated });
  return true;
};

UserProfile.prototype.addToWatched = async function(movieId, userRating = null) {
  // Remove from watchlist if present
  const updatedWatchlist = this.watchlist.filter(id => id !== movieId);
  
  // Add to watched if not already there
  let updatedWatched = this.watched;
  if (!updatedWatched.includes(movieId)) {
    updatedWatched = [...updatedWatched, movieId];
  }
  
  // Update or add metadata
  const metadata = this.watchedMetadata || [];
  const existingIndex = metadata.findIndex(m => m.tmdb_id === movieId);
  
  const watchedEntry = {
    tmdb_id: movieId,
    watched_at: new Date().toISOString(),
    user_rating: userRating,
  };
  
  let updatedMetadata;
  if (existingIndex >= 0) {
    updatedMetadata = [...metadata];
    updatedMetadata[existingIndex] = watchedEntry;
  } else {
    updatedMetadata = [...metadata, watchedEntry];
  }
  
  await this.update({
    watchlist: updatedWatchlist,
    watched: updatedWatched,
    watchedMetadata: updatedMetadata,
  });
  
  return true;
};

UserProfile.prototype.removeFromWatched = async function(movieId) {
  const updatedWatched = this.watched.filter(id => id !== movieId);
  const updatedMetadata = (this.watchedMetadata || []).filter(m => m.tmdb_id !== movieId);
  
  await this.update({
    watched: updatedWatched,
    watchedMetadata: updatedMetadata,
  });
  
  return true;
};

UserProfile.prototype.isInWatchlist = function(movieId) {
  return this.watchlist.includes(movieId);
};

UserProfile.prototype.isWatched = function(movieId) {
  return this.watched.includes(movieId);
};

UserProfile.prototype.getWatchedDetails = function(movieId) {
  const metadata = this.watchedMetadata || [];
  return metadata.find(m => m.tmdb_id === movieId) || null;
};

UserProfile.prototype.setTasteProfile = async function(tasteVector, ratedMovies) {
  await this.update({ 
    tasteVector,
    ratedMovieIds: ratedMovies 
  });
};

UserProfile.prototype.hasTasteProfile = function() {
  return this.tasteVector !== null && this.tasteVector !== undefined;
};

UserProfile.prototype.getTasteInsights = function() {
  // This will be implemented with AI analysis later
  // For now, return basic insights from rated movies
  const insights = {
    topGenres: [],
    totalRatings: this.ratedMovieIds.length,
    positiveRatings: this.ratedMovieIds.filter(r => r.rating === 1).length,
    negativeRatings: this.ratedMovieIds.filter(r => r.rating === -1).length,
  };
  return insights;
};

module.exports = UserProfile;
