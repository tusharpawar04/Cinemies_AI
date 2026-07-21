/**
 * Test script to verify Redis caching configuration
 * Run with: node test-cache.js
 */

require('dotenv').config();
const { cache, connectRedis, closeRedis } = require('./src/database/redis');
const logger = require('./src/utils/logger');

async function testCacheConfiguration() {
  console.log('\n=== Testing Redis Cache Configuration ===\n');
  
  try {
    // Connect to Redis
    await connectRedis();
    console.log('✅ Redis connection established\n');
    
    // Test 1: Cache Key Patterns
    console.log('Test 1: Cache Key Patterns');
    console.log('---------------------------');
    
    const recKey = cache.keys.recommendation('mind_bending', 'all');
    console.log(`Recommendation key: ${recKey}`);
    console.log(`Expected: rec:mind_bending:all`);
    console.log(`✅ Match: ${recKey === 'rec:mind_bending:all'}\n`);
    
    const personalizedKey = cache.keys.personalizedRecommendation('edge_of_seat', 123);
    console.log(`Personalized key: ${personalizedKey}`);
    console.log(`Expected: rec:personalized:edge_of_seat:123`);
    console.log(`✅ Match: ${personalizedKey === 'rec:personalized:edge_of_seat:123'}\n`);
    
    const sessionKey = cache.keys.sessionViewed(456);
    console.log(`Session key: ${sessionKey}`);
    console.log(`Expected: session:456:viewed`);
    console.log(`✅ Match: ${sessionKey === 'session:456:viewed'}\n`);
    
    // Test 2: Set and Get Recommendation
    console.log('Test 2: Set and Get Recommendation');
    console.log('----------------------------------');
    
    const testData = [
      { tmdbId: 27205, title: 'Inception', matchScore: 0.95 },
      { tmdbId: 13, title: 'Memento', matchScore: 0.89 }
    ];
    
    await cache.setRecommendation('mind_bending', 'all', testData);
    console.log('✅ Cached recommendation data');
    
    const retrieved = await cache.getRecommendation('mind_bending', 'all');
    console.log(`✅ Retrieved ${retrieved.length} movies from cache`);
    console.log(`Data match: ${JSON.stringify(retrieved) === JSON.stringify(testData)}\n`);
    
    // Test 3: Set and Get Personalized Recommendation
    console.log('Test 3: Personalized Recommendation Cache');
    console.log('----------------------------------------');
    
    const personalizedData = [
      { tmdbId: 155, title: 'The Dark Knight', matchScore: 0.98 }
    ];
    
    await cache.setPersonalizedRecommendation('edge_of_seat', 999, personalizedData);
    console.log('✅ Cached personalized recommendation');
    
    const personalizedRetrieved = await cache.getPersonalizedRecommendation('edge_of_seat', 999);
    console.log(`✅ Retrieved personalized recommendation from cache`);
    console.log(`Data match: ${JSON.stringify(personalizedRetrieved) === JSON.stringify(personalizedData)}\n`);
    
    // Test 4: Session Viewed Tracking
    console.log('Test 4: Session Viewed Tracking');
    console.log('-------------------------------');
    
    await cache.addToSessionViewed(789, 27205);
    await cache.addToSessionViewed(789, 155);
    await cache.addToSessionViewed(789, 13);
    console.log('✅ Added 3 movies to session');
    
    const viewedMovies = await cache.getSessionViewed(789);
    console.log(`✅ Retrieved ${viewedMovies.length} viewed movies`);
    console.log(`Movies: [${viewedMovies.join(', ')}]\n`);
    
    // Test 5: TTL Verification
    console.log('Test 5: TTL Verification');
    console.log('------------------------');
    
    const recTTL = await cache.ttl(cache.keys.recommendation('mind_bending', 'all'));
    console.log(`Recommendation TTL: ${recTTL}s (expected: ~3600s)`);
    console.log(`✅ TTL in range: ${recTTL > 3500 && recTTL <= 3600}`);
    
    const sessionTTL = await cache.ttl(cache.keys.sessionViewed(789));
    console.log(`Session TTL: ${sessionTTL}s (expected: ~7200s)`);
    console.log(`✅ TTL in range: ${sessionTTL > 7100 && sessionTTL <= 7200}\n`);
    
    // Test 6: Cache Statistics
    console.log('Test 6: Cache Statistics');
    console.log('------------------------');
    
    const stats = await cache.getStats();
    console.log(`Total keys: ${stats.keyCount}`);
    console.log(`Recommendation keys: ${stats.patterns.recommendations}`);
    console.log(`Personalized keys: ${stats.patterns.personalized}`);
    console.log(`Session keys: ${stats.patterns.sessions}`);
    console.log('✅ Statistics retrieved\n');
    
    // Test 7: Cache Invalidation
    console.log('Test 7: Cache Invalidation');
    console.log('--------------------------');
    
    await cache.invalidateUserCache(999);
    console.log('✅ User cache invalidated');
    
    const afterInvalidation = await cache.getPersonalizedRecommendation('edge_of_seat', 999);
    console.log(`Personalized cache cleared: ${afterInvalidation === null}`);
    
    // Cleanup test data
    await cache.del(cache.keys.recommendation('mind_bending', 'all'));
    await cache.del(cache.keys.sessionViewed(789));
    console.log('✅ Test data cleaned up\n');
    
    console.log('=== All Cache Tests Passed ✅ ===\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await closeRedis();
    console.log('Redis connection closed');
  }
}

// Run tests
testCacheConfiguration();
