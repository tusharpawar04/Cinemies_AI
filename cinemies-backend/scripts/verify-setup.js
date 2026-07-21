/**
 * Setup Verification Script
 * Checks if all required services are running and configured correctly
 */

const axios = require('axios');
const { Pool } = require('pg');
const mongoose = require('mongoose');
const redis = require('redis');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, colors.green);
}

function error(message) {
  log(`✗ ${message}`, colors.red);
}

function warning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function info(message) {
  log(`ℹ ${message}`, colors.blue);
}

async function checkPostgreSQL() {
  info('\n1. Checking PostgreSQL...');
  
  try {
    const pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'cinemies',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD,
    });
    
    const client = await pool.connect();
    
    // Check if tables exist
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'user_profiles', 'interactions')
    `);
    
    const tables = result.rows.map(row => row.table_name);
    
    if (tables.length === 3) {
      success('PostgreSQL connected and tables exist');
      success(`  Tables: ${tables.join(', ')}`);
    } else {
      warning('PostgreSQL connected but tables missing');
      warning(`  Found: ${tables.join(', ')}`);
      warning('  Run: npm run migrate');
    }
    
    client.release();
    await pool.end();
    return true;
  } catch (err) {
    error('PostgreSQL connection failed');
    error(`  ${err.message}`);
    return false;
  }
}

async function checkMongoDB() {
  info('\n2. Checking MongoDB...');
  
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cinemies';
    await mongoose.connect(uri);
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    success('MongoDB connected');
    if (collectionNames.includes('movies')) {
      success(`  Collections: ${collectionNames.join(', ')}`);
    } else {
      warning('  Movies collection not found (will be created on first insert)');
    }
    
    await mongoose.connection.close();
    return true;
  } catch (err) {
    error('MongoDB connection failed');
    error(`  ${err.message}`);
    return false;
  }
}

async function checkRedis() {
  info('\n3. Checking Redis...');
  
  try {
    const client = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });
    
    await client.connect();
    await client.ping();
    
    success('Redis connected');
    
    await client.quit();
    return true;
  } catch (err) {
    warning('Redis connection failed (optional - caching will be disabled)');
    warning(`  ${err.message}`);
    return false;
  }
}

async function checkAIService() {
  info('\n4. Checking AI Service...');
  
  try {
    const url = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const response = await axios.get(`${url}/health`, { timeout: 3000 });
    
    success('AI Service connected');
    success(`  Status: ${response.data.status}`);
    if (response.data.indexed_movies) {
      success(`  Indexed movies: ${response.data.indexed_movies}`);
    }
    if (response.data.available_moods) {
      success(`  Available moods: ${response.data.available_moods.length}`);
    }
    
    return true;
  } catch (err) {
    warning('AI Service not available (will use MongoDB fallback)');
    warning(`  ${err.message}`);
    return false;
  }
}

async function checkEnvironment() {
  info('\n5. Checking Environment Variables...');
  
  const required = [
    'POSTGRES_HOST',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'MONGODB_URI',
    'JWT_SECRET',
  ];
  
  const missing = [];
  const present = [];
  
  for (const key of required) {
    if (process.env[key]) {
      present.push(key);
    } else {
      missing.push(key);
    }
  }
  
  if (missing.length === 0) {
    success('All required environment variables set');
    present.forEach(key => {
      const value = key.includes('PASSWORD') || key.includes('SECRET') 
        ? '***' 
        : process.env[key];
      success(`  ${key}: ${value}`);
    });
  } else {
    error('Missing required environment variables:');
    missing.forEach(key => error(`  ${key}`));
    warning('Copy .env.example to .env and fill in values');
  }
  
  return missing.length === 0;
}

async function main() {
  log('\n╔════════════════════════════════════════╗', colors.blue);
  log('║   Cinemies Backend Setup Verification  ║', colors.blue);
  log('╚════════════════════════════════════════╝', colors.blue);
  
  const results = {
    env: await checkEnvironment(),
    postgres: await checkPostgreSQL(),
    mongodb: await checkMongoDB(),
    redis: await checkRedis(),
    ai: await checkAIService(),
  };
  
  log('\n╔════════════════════════════════════════╗', colors.blue);
  log('║            Summary                     ║', colors.blue);
  log('╚════════════════════════════════════════╝', colors.blue);
  
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(Boolean).length;
  const critical = results.env && results.postgres && results.mongodb;
  
  log(`\nChecks passed: ${passed}/${total}`);
  
  if (critical) {
    success('\n✓ Critical services are ready!');
    success('  You can start the backend with: npm run dev');
    
    if (!results.redis) {
      warning('\n⚠ Redis is optional but recommended for caching');
    }
    if (!results.ai) {
      warning('⚠ AI Service is optional - will use MongoDB fallback');
    }
  } else {
    error('\n✗ Critical services are not ready');
    error('  Fix the errors above before starting the backend');
    
    if (!results.env) {
      info('\n  1. Copy .env.example to .env');
      info('  2. Fill in database credentials');
    }
    if (!results.postgres) {
      info('\n  1. Start PostgreSQL service');
      info('  2. Run: npm run migrate');
    }
    if (!results.mongodb) {
      info('\n  1. Start MongoDB service');
      info('  2. Check MONGODB_URI in .env');
    }
  }
  
  log('');
  process.exit(critical ? 0 : 1);
}

main().catch(err => {
  error(`\nUnexpected error: ${err.message}`);
  process.exit(1);
});
