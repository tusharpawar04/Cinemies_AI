/**
 * Models index - Establishes relationships between models
 */

const User = require('./User');
const UserProfile = require('./UserProfile');
const Interaction = require('./Interaction');
const Movie = require('./Movie');
const CalibrationMovie = require('./CalibrationMovie');
const StreamingPlatform = require('./StreamingPlatform');

// Define relationships
User.hasOne(UserProfile, {
  foreignKey: 'userId',
  as: 'profile',
  onDelete: 'CASCADE',
});

UserProfile.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

User.hasMany(Interaction, {
  foreignKey: 'userId',
  as: 'interactions',
  onDelete: 'CASCADE',
});

Interaction.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

module.exports = {
  User,
  UserProfile,
  Interaction,
  Movie,
  CalibrationMovie,
  StreamingPlatform,
};
