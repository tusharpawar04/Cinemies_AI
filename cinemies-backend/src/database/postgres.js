/**
 * PostgreSQL connection using Sequelize ORM
 * Handles user data, profiles, and interactions
 */

const { Sequelize } = require('sequelize');
const config = require('../config');
const logger = require('../utils/logger');

// Create Sequelize instance
const sequelize = new Sequelize(
  config.postgres.database,
  config.postgres.username,
  config.postgres.password,
  {
    host: config.postgres.host,
    port: config.postgres.port,
    dialect: config.postgres.dialect,
    logging: config.postgres.logging,
    pool: config.postgres.pool,
    dialectOptions: config.postgres.ssl ? {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    } : {},
  }
);

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('PostgreSQL connection established successfully');
    return true;
  } catch (error) {
    logger.error('Unable to connect to PostgreSQL:', error);
    return false;
  }
};

// Sync database (create tables if they don't exist)
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force, alter: !force });
    logger.info(`PostgreSQL database synced ${force ? '(forced)' : '(altered)'}`);
  } catch (error) {
    logger.error('Error syncing PostgreSQL database:', error);
    throw error;
  }
};

// Close connection
const closeConnection = async () => {
  try {
    await sequelize.close();
    logger.info('PostgreSQL connection closed');
  } catch (error) {
    logger.error('Error closing PostgreSQL connection:', error);
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  closeConnection,
};
