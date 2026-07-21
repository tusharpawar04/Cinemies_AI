/**
 * Database Setup Verification Script
 * Verifies Sprint 1 - Task 1.1, 1.2, 1.3 implementation
 * Run with: node verify-database-setup.js
 */

require('dotenv').config();
const { sequelize } = require('./src/database/postgres');
const { connectMongoDB, mongoClient } = require('./src/database/mongodb');
const { connectRedis, cache, closeRedis } = require('./src/database/redis');
const logger = require('./src/utils/logger');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
};

function success(msg) {
  console.log(`${colors.green}✅ ${msg}${colors.reset}`);
}

function error(msg) {
  console.log(`${colors.red}❌ ${msg}${colors.reset}`);
}

function info(msg) {
  console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`);
}

function section(msg) {
  console.log(`\n${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${msg}${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

async function verifyPostgreSQL() {
  section('Task 1.1: PostgreSQL Schema Verification');
  
  try {
    // Test connection
    await sequelize.authenticate();
    success('PostgreSQL connection established');
    
    // Verify users table with onboarding_completed field
    info('Checking users table...');
    const [usersDesc] = await sequelize.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    const hasOnboardingCompleted = usersDesc.some(col => 
      col.column_name === 'onboarding_completed'
    );
    
    if (hasOnboardingCompleted) {
      success('users.onboarding_completed field exists');
    } else {
      error('users.onboarding_completed field NOT FOUND');
      info('Run migration: node database/run-migration.js');
      return false;
    }
    
    // Verify user_profiles table
    info('Checking user_profiles table...');
    const [profilesDesc] = await sequelize.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'user_profiles'
      ORDER BY ordinal_position;
    `);
    
    const requiredProfileFields = ['taste_vector', 'rated_movie_ids', 'ab_test_cohort'];
    let allProfileFieldsExist = true;
    
    for (const field of requiredProfileFields) {
      const exists = profilesDesc.some(col => col.column_name === field);
      if (exists) {
        success(`user_profiles.${field} field exists`);
      } else {
        error(`user_profiles.${field} field NOT FOUND`);
        allProfileFieldsExist = false;
      }
    }
    
    if (!allProfileFieldsExist) {
      info('Run migration: node database/run-migration.js');
      return false;
    }
    
    // Verify indexes
    info('Checking indexes...');
    const [indexes] = await sequelize.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename IN ('users', 'user_profiles')
      ORDER BY indexname;
    `);
    
    const requiredIndexes = [
      'idx_users_onboarding_completed',
      'idx_user_profiles_ab_test_cohort'
    ];
    
    for (const idxName of requiredIndexes) {
      const exists = indexes.some(idx => idx.indexname === idxName);
      if (exists) {
        success(`Index ${idxName} exists`);
      } else {
        error(`Index ${idxName} NOT FOUND`);
      }
    }
    
    // Verify calibration_movies table
    info('Checking calibration_movies table...');
    const [calibrationTables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'calibration_movies';
    `);
    
    if (calibrationTables.length > 0) {
      success('calibration_movies table exists');
      
      // Check sample data
      const [calibrationMovies] = await sequelize.query(`
        SELECT COUNT(*) as count FROM calibration_movies;
      `);
      
      const count = parseInt(calibrationMovies[0].count);
      info(`Calibration movies in database: ${count}`);
      
      if (count >= 7) {
        success(`Sample calibration movies seeded (${count} movies)`);
      } else {
        error(`Insufficient calibration movies (${count} < 7). Run seed script.`);
      }
    } else {
      error('calibration_movies table NOT FOUND');
      return false;
    }
    
    console.log();
    return true;
    
  } catch (err) {
    error(`PostgreSQL verification failed: ${err.message}`);
    console.error(err);
    return false;
  }
}

async function verifyMongoDB() {
  section('Task 1.2: MongoDB Collection Verification');
  
  try {
    await connectMongoDB();
    success('MongoDB connection established');
    
    const db = mongoClient.db();
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    info(`Collections found: ${collectionNames.join(', ')}`);
    
    // Check for movies collection (or calibration_movies)
    const hasMovies = collectionNames.includes('movies') || 
                      collectionNames.includes('calibration_movies');
    
    if (hasMovies) {
      const moviesCollection = db.collection('movies');
      const count = await moviesCollection.countDocuments();
      
      success(`Movies collection exists with ${count} documents`);
      
      // Check indexes
      info('Checking MongoDB indexes...');
      const indexes = await moviesCollection.indexes();
      
      info(`Indexes: ${indexes.map(i => i.name).join(', ')}`);
      
      // Sample document structure check
      if (count > 0) {
        const sample = await moviesCollection.findOne();
        const hasRequiredFields = sample.tmdb_id && sample.title;
        
        if (hasRequiredFields) {
          success('Movie documents have required fields (tmdb_id, title)');
          info(`Sample movie: ${sample.title} (${sample.year || 'N/A'})`);
        } else {
          error('Movie documents missing required fields');
        }
      }
    } else {
      error('Movies collection NOT FOUND');
      info('Consider running database seed scripts');
      return false;
    }
    
    console.log();
    return true;
    
  } catch (err) {
    error(`MongoDB verification failed: ${err.message}`);
    console.error(err);
    return false;
  }
}

async function verifyRedis() {
  section('Task 1.3: Redis Caching Configuration Verification');
  
  try {
    await connectRedis();
    success('Redis connection established');
    
    // Test 1: Verify cache key patterns
    info('Testing cache key patterns...');
    
    const testPatterns = {
      recommendation: cache.keys.recommendation('mind_bending', 'all'),
      personalized: cache.keys.personalizedRecommendation('edge_of_seat', 123),
      session: cache.keys.sessionViewed(456),
    };
    
    const expectedPatterns = {
      recommendation: 'rec:mind_bending:all',
      personalized: 'rec:personalized:edge_of_seat:123',
      session: 'session:456:viewed',
    };
    
    let patternsCorrect = true;
    for (const [key, actual] of Object.entries(testPatterns)) {
      const expected = expectedPatterns[key];
      if (actual === expected) {
        success(`${key}: ${actual}`);
      } else {
        error(`${key}: Expected "${expected}", got "${actual}"`);
        patternsCorrect = false;
      }
    }
    
    if (!patternsCorrect) {
      error('Cache key patterns do not match specification');
      return false;
    }
    
    // Test 2: Verify TTL configuration
    info('Testing TTL configuration...');
    const config = require('./src/config');
    
    const ttlTests = {
      recommendations: { actual: config.redis.ttl.recommendations, expected: 3600 },
      personalized: { actual: config.redis.ttl.personalized, expected: 3600 },
      sessions: { actual: config.redis.ttl.sessions, expected: 7200 },
    };
    
    let ttlCorrect = true;
    for (const [key, { actual, expected }] of Object.entries(ttlTests)) {
      if (actual === expected) {
        success(`${key} TTL: ${actual}s`);
      } else {
        error(`${key} TTL: Expected ${expected}s, got ${actual}s`);
        ttlCorrect = false;
      }
    }
    
    if (!ttlCorrect) {
      error('TTL configuration does not match specification');
      return false;
    }
    
    // Test 3: Verify cache operations
    info('Testing cache operations...');
    
    const testData = [{ tmdbId: 27205, title: 'Inception', matchScore: 0.95 }];
    
    // Set recommendation
    await cache.setRecommendation('mind_bending', 'all', testData);
    success('Set recommendation cache');
    
    // Get recommendation
    const retrieved = await cache.getRecommendation('mind_bending', 'all');
    if (JSON.stringify(retrieved) === JSON.stringify(testData)) {
      success('Retrieved recommendation cache correctly');
    } else {
      error('Cache retrieval failed or data mismatch');
      return false;
    }
    
    // Verify TTL on cached item
    const ttl = await cache.ttl(cache.keys.recommendation('mind_bending', 'all'));
    if (ttl > 3500 && ttl <= 3600) {
      success(`Cache TTL verified: ${ttl}s (expected ~3600s)`);
    } else {
      error(`Cache TTL incorrect: ${ttl}s`);
    }
    
    // Test session tracking
    await cache.addToSessionViewed(999, 27205);
    await cache.addToSessionViewed(999, 155);
    const viewedMovies = await cache.getSessionViewed(999);
    
    if (viewedMovies && viewedMovies.length === 2) {
      success(`Session tracking works: ${viewedMovies.length} movies tracked`);
    } else {
      error('Session tracking failed');
    }
    
    // Test cache invalidation
    await cache.invalidateUserCache(999);
    success('Cache invalidation tested');
    
    // Cleanup
    await cache.del(cache.keys.recommendation('mind_bending', 'all'));
    await cache.del(cache.keys.sessionViewed(999));
    info('Test data cleaned up');
    
    // Test 4: Verify cache statistics
    info('Testing cache statistics...');
    const stats = await cache.getStats();
    
    if (stats && stats.keyCount !== undefined) {
      success(`Cache statistics available: ${stats.keyCount} keys`);
      info(`  - Recommendation keys: ${stats.patterns.recommendations}`);
      info(`  - Personalized keys: ${stats.patterns.personalized}`);
      info(`  - Session keys: ${stats.patterns.sessions}`);
    } else {
      error('Cache statistics unavailable');
    }
    
    console.log();
    return true;
    
  } catch (err) {
    error(`Redis verification failed: ${err.message}`);
    console.error(err);
    return false;
  }
}

async function runVerification() {
  console.log(`\n${colors.bold}${colors.blue}╔${'═'.repeat(58)}╗${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}║${' '.repeat(10)}DATABASE SETUP VERIFICATION${' '.repeat(20)}║${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}║${' '.repeat(13)}Sprint 1: Tasks 1.1, 1.2, 1.3${' '.repeat(16)}║${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}╚${'═'.repeat(58)}╝${colors.reset}\n`);
  
  const results = {
    postgresql: false,
    mongodb: false,
    redis: false,
  };
  
  // Run verifications
  results.postgresql = await verifyPostgreSQL();
  results.mongodb = await verifyMongoDB();
  results.redis = await verifyRedis();
  
  // Summary
  section('Verification Summary');
  
  console.log(`Task 1.1 - PostgreSQL Schema: ${results.postgresql ? colors.green + '✅ PASS' : colors.red + '❌ FAIL'}${colors.reset}`);
  console.log(`Task 1.2 - MongoDB Collection: ${results.mongodb ? colors.green + '✅ PASS' : colors.red + '❌ FAIL'}${colors.reset}`);
  console.log(`Task 1.3 - Redis Caching:     ${results.redis ? colors.green + '✅ PASS' : colors.red + '❌ FAIL'}${colors.reset}`);
  
  const allPassed = results.postgresql && results.mongodb && results.redis;
  
  console.log();
  if (allPassed) {
    console.log(`${colors.bold}${colors.green}╔${'═'.repeat(58)}╗${colors.reset}`);
    console.log(`${colors.bold}${colors.green}║${' '.repeat(10)}✅ ALL VERIFICATIONS PASSED ✅${' '.repeat(13)}║${colors.reset}`);
    console.log(`${colors.bold}${colors.green}╚${'═'.repeat(58)}╝${colors.reset}`);
    console.log(`\n${colors.green}${colors.bold}Database setup is complete and ready for Sprint 2!${colors.reset}\n`);
  } else {
    console.log(`${colors.bold}${colors.red}╔${'═'.repeat(58)}╗${colors.reset}`);
    console.log(`${colors.bold}${colors.red}║${' '.repeat(12)}❌ SOME VERIFICATIONS FAILED${' '.repeat(14)}║${colors.reset}`);
    console.log(`${colors.bold}${colors.red}╚${'═'.repeat(58)}╝${colors.reset}`);
    console.log(`\n${colors.yellow}${colors.bold}Please address the issues above before proceeding.${colors.reset}\n`);
  }
  
  // Cleanup connections
  await sequelize.close();
  await closeRedis();
  if (mongoClient) {
    await mongoClient.close();
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run verification
runVerification().catch(err => {
  console.error(`${colors.red}Unexpected error:${colors.reset}`, err);
  process.exit(1);
});
