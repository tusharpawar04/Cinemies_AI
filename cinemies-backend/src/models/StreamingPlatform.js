/**
 * StreamingPlatform Model (PostgreSQL)
 * Stores where movies are available to stream
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/postgres');

const StreamingPlatform = sequelize.define('StreamingPlatform', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  tmdbId: {
    type: DataTypes.INTEGER,
    field: 'tmdb_id',
    allowNull: false,
  },
  countryCode: {
    type: DataTypes.STRING(2),
    field: 'country_code',
    defaultValue: 'US',
  },
  platforms: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of streaming platform objects with provider info',
  },
  lastUpdated: {
    type: DataTypes.DATE,
    field: 'last_updated',
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'streaming_platforms',
  timestamps: false,
  indexes: [
    { fields: ['tmdb_id'] },
    { fields: ['country_code'] },
    { fields: ['tmdb_id', 'country_code'], unique: true },
  ],
});

/**
 * Get streaming platforms for a movie
 */
StreamingPlatform.getForMovie = async function(tmdbId, countryCode = 'US') {
  const record = await this.findOne({
    where: { tmdbId, countryCode },
  });
  
  if (!record) return null;
  
  // Check if data is stale (older than 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (record.lastUpdated < sevenDaysAgo) {
    return { ...record.toJSON(), isStale: true };
  }
  
  return { ...record.toJSON(), isStale: false };
};

/**
 * Save streaming platforms for a movie
 */
StreamingPlatform.saveForMovie = async function(tmdbId, platforms, countryCode = 'US') {
  const [record, created] = await this.upsert({
    tmdbId,
    countryCode,
    platforms,
    lastUpdated: new Date(),
  }, {
    returning: true,
  });
  
  return record;
};

/**
 * Get popular streaming services
 */
StreamingPlatform.getPopularServices = function() {
  return [
    { id: 8, name: 'Netflix', logo: '/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg' },
    { id: 9, name: 'Amazon Prime Video', logo: '/emthp39XA2YScoYL1p0sdbAH2WA.jpg' },
    { id: 337, name: 'Disney Plus', logo: '/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg' },
    { id: 384, name: 'HBO Max', logo: '/Ajqyt5aNxNGjmF9uOfxArGrdf3X.jpg' },
    { id: 350, name: 'Apple TV Plus', logo: '/6uhKBfmtzFqOcLousHwZuzcrScK.jpg' },
    { id: 531, name: 'Paramount Plus', logo: '/xbhHHa1YgtpwhC8lb1NQ3ACVcLd.jpg' },
    { id: 1899, name: 'Max', logo: '/6J8kxpTjghEq4CZvhk5BnCUjZaj.jpg' },
    { id: 15, name: 'Hulu', logo: '/zxrVdFjIjLqkfnwyghnfywTn3Lh.jpg' },
  ];
};

module.exports = StreamingPlatform;
