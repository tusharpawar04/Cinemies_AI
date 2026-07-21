/**
 * MongoDB connection using Mongoose
 * Handles movie data and metadata
 */

const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../utils/logger');

// Connection state
let isConnected = false;

// Connect to MongoDB
const connectMongoDB = async () => {
  if (isConnected) {
    logger.info('MongoDB already connected');
    return;
  }

  try {
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    isConnected = true;
    logger.info('MongoDB connection established successfully');
    
    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
      isConnected = false;
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      isConnected = true;
    });
    
  } catch (error) {
    logger.error('Unable to connect to MongoDB:', error);
    isConnected = false;
    throw error;
  }
};

// Close MongoDB connection
const closeMongoDB = async () => {
  try {
    await mongoose.connection.close();
    isConnected = false;
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
  }
};

// Get connection status
const getConnectionStatus = () => {
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  };
};

module.exports = {
  connectMongoDB,
  closeMongoDB,
  getConnectionStatus,
  mongoose,
};
