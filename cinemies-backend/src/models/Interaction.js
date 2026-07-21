/**
 * Interaction Model (PostgreSQL)
 * Tracks user interactions with movies for analytics and personalization
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/postgres');

const Interaction = sequelize.define('Interaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  movieTmdbId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  interactionType: {
    type: DataTypes.ENUM(
      'view',
      'click',
      'movie_click',
      'watch_start',
      'watch_complete',
      'rating',
      'favorite',
      'unfavorite',
      'watchlist_add',
      'watchlist_remove',
      'taste_calibration_started',
      'taste_calibration_completed',
      'taste_calibration_skipped',
      'recommendation_request',
      'exploration_click'
    ),
    allowNull: false,
  },
  rating: {
    type: DataTypes.DECIMAL(2, 1),
    allowNull: true,
    validate: {
      min: 0,
      max: 10,
    },
  },
  watchDuration: {
    type: DataTypes.INTEGER, // in seconds
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    // Can store: { mood: 'mind_bending', source: 'recommendation', etc. }
  },
}, {
  tableName: 'interactions',
  timestamps: true,
  indexes: [
    {
      fields: ['userId'],
    },
    {
      fields: ['movieTmdbId'],
    },
    {
      fields: ['interactionType'],
    },
    {
      fields: ['createdAt'],
    },
    {
      fields: ['userId', 'movieTmdbId'],
    },
  ],
});

// Class methods
Interaction.getRecentByUser = async function(userId, limit = 20) {
  return await this.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit,
  });
};

Interaction.getByMovie = async function(movieTmdbId, limit = 100) {
  return await this.findAll({
    where: { movieTmdbId },
    order: [['createdAt', 'DESC']],
    limit,
  });
};

Interaction.getUserStats = async function(userId) {
  const { fn, col } = sequelize;
  
  return await this.findAll({
    where: { userId },
    attributes: [
      'interactionType',
      [fn('COUNT', col('id')), 'count'],
    ],
    group: ['interactionType'],
  });
};

Interaction.logTasteCalibrationEvent = async function(userId, eventType, metadata = {}) {
  return await this.create({
    userId,
    movieTmdbId: null, // Not movie-specific
    interactionType: eventType,
    metadata,
  });
};

Interaction.getCalibrationAnalytics = async function(userId) {
  const events = await this.findAll({
    where: {
      userId,
      interactionType: [
        'taste_calibration_started',
        'taste_calibration_completed', 
        'taste_calibration_skipped'
      ]
    },
    order: [['createdAt', 'ASC']],
  });
  
  const started = events.find(e => e.interactionType === 'taste_calibration_started');
  const completed = events.find(e => e.interactionType === 'taste_calibration_completed');
  const skipped = events.find(e => e.interactionType === 'taste_calibration_skipped');
  
  return {
    started: started?.createdAt || null,
    completed: completed?.createdAt || null,
    skipped: skipped?.createdAt || null,
    timeToComplete: (started && completed) ? 
      (completed.createdAt - started.createdAt) / 1000 : null,
    completionData: completed?.metadata || null,
  };
};

module.exports = Interaction;
