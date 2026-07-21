/**
 * Central configuration file
 * All environment variables are loaded and validated here
 */

require('dotenv').config();

const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiVersion: process.env.API_VERSION || 'v1',
  
  // Security
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    expire: process.env.JWT_EXPIRE || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d',
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },
  
  // PostgreSQL
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
    database: process.env.POSTGRES_DB || 'cinemies_users',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    ssl: process.env.POSTGRES_SSL === 'true',
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
  
  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    database: process.env.MONGODB_DB || 'cinemies',
    collection: process.env.MONGODB_COLLECTION || 'movies',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    ttl: {
      recommendations: parseInt(process.env.CACHE_TTL_RECOMMENDATIONS, 10) || 3600, // 1 hour
      personalized: parseInt(process.env.CACHE_TTL_PERSONALIZED, 10) || 3600, // 1 hour  
      sessions: parseInt(process.env.CACHE_TTL_SESSIONS, 10) || 7200, // 2 hours
      default: parseInt(process.env.CACHE_TTL, 10) || 3600, // 1 hour fallback
    },
  },
  
  // AI Service
  ai: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    timeout: parseInt(process.env.AI_SERVICE_TIMEOUT, 10) || 5000,
    retryAttempts: parseInt(process.env.AI_SERVICE_RETRY_ATTEMPTS, 10) || 3,
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
  },
  
  // Frontend
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  
  // Security Headers
  helmet: {
    cspEnabled: process.env.HELMET_CSP_ENABLED !== 'false',
    hstsEnabled: process.env.HELMET_HSTS_ENABLED !== 'false',
  },
};

// Validation
const validateConfig = () => {
  const required = [
    'JWT_SECRET',
    'POSTGRES_PASSWORD',
    'MONGODB_URI',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0 && config.env === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  if (config.env === 'production' && config.jwt.secret === 'fallback-secret-change-in-production') {
    throw new Error('JWT_SECRET must be set in production');
  }
};

// Validate on load
validateConfig();

module.exports = config;
