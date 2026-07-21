/**
 * Server Entry Point
 * Starts the server and connects to databases
 */

const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { sequelize } = require('./database/postgres');
const { connectMongoDB, closeMongoDB } = require('./database/mongodb');
const { connectRedis, closeRedis } = require('./database/redis');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason,
    promise,
  });
  process.exit(1);
});

/**
 * Start server
 */
const startServer = async () => {
  try {
    // Connect to PostgreSQL
    logger.info('Connecting to PostgreSQL...');
    await sequelize.authenticate();
    logger.info('PostgreSQL connected successfully');
    
    // Database is managed via migrations, skip sequelize.sync()
    logger.info('Database models loaded');
    
    // Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    await connectMongoDB();
    logger.info('MongoDB connected successfully');
    
    // Connect to Redis
    logger.info('Connecting to Redis...');
    await connectRedis();
    logger.info('Redis connected successfully');
    
    // Start Express server
    const server = app.listen(config.port, () => {
      logger.info(`Server running in ${config.env} mode on port ${config.port}`);
      logger.info(`API available at http://localhost:${config.port}/api/${config.apiVersion}`);
    });
    
    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received, starting graceful shutdown...`);
      
      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Close database connections
          await sequelize.close();
          logger.info('PostgreSQL connection closed');
          
          await closeMongoDB();
          logger.info('MongoDB connection closed');
          
          await closeRedis();
          logger.info('Redis connection closed');
          
          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', error);
          process.exit(1);
        }
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

// Start the server
startServer();
