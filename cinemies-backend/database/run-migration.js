#!/usr/bin/env node

/**
 * Database Migration Runner for Taste Calibration Fields
 * Run with: node cinemies-backend/database/run-migration.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const config = require('../src/config');

async function runMigration() {
  let client;
  
  try {
    console.log('🚀 Starting database migration for taste calibration...');
    
    // Create PostgreSQL client
    client = new Client({
      host: config.postgres.host,
      port: config.postgres.port,
      user: config.postgres.username,
      password: config.postgres.password,
      database: config.postgres.database,
    });
    
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '001_add_taste_calibration_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    console.log('📄 Executing migration: 001_add_taste_calibration_fields.sql');
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📊 New database features added:');
    console.log('   • users.onboarding_completed (BOOLEAN)');
    console.log('   • user_profiles.taste_vector (JSONB - 384 dimensions)');
    console.log('   • user_profiles.rated_movie_ids (JSONB)');
    console.log('   • user_profiles.ab_test_cohort (VARCHAR)');
    console.log('   • interactions expanded with calibration events');
    console.log('   • calibration_movies table for curated onboarding');
    console.log('   • Performance indexes and constraints');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
      console.log('📝 Database connection closed');
    }
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n🎉 Taste calibration database setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };