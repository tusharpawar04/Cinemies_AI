#!/usr/bin/env node

/**
 * MongoDB Seed Script for Calibration Movies
 * Populates the calibration_movies collection with curated, diverse movies
 * Run with: node cinemies-backend/database/seed-calibration-movies.js
 */

const { connectMongoDB, closeMongoDB } = require('../src/database/mongodb');
const { CalibrationMovie } = require('../src/models');
const logger = require('../src/utils/logger');

async function seedCalibrationMovies() {
  try {
    console.log('🚀 Starting calibration movies seeding...');
    
    // Connect to MongoDB
    await connectMongoDB();
    console.log('✅ Connected to MongoDB');
    
    // Check current count
    const existingCount = await CalibrationMovie.countDocuments();
    console.log(`📊 Current calibration movies count: ${existingCount}`);
    
    if (existingCount >= 50) {
      console.log('✅ Sufficient calibration movies already exist (50+)');
      return;
    }
    
    // Seed initial data
    console.log('📄 Seeding initial calibration movies...');
    const seeded = await CalibrationMovie.seedInitialData();
    
    // Get updated count
    const newCount = await CalibrationMovie.countDocuments();
    console.log(`✅ Calibration movies seeded successfully!`);
    console.log(`📊 Total movies now: ${newCount}`);
    
    // Display diversity stats
    const stats = await CalibrationMovie.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          by_industry: {
            $push: {
              k: '$industry',
              v: 1
            }
          },
          by_popularity: {
            $push: {
              k: '$popularity_tier', 
              v: 1
            }
          },
          by_era: {
            $push: {
              k: {
                $switch: {
                  branches: [
                    { case: { $lt: ['$year', 1990] }, then: 'classic' },
                    { case: { $lt: ['$year', 2010] }, then: 'modern' }
                  ],
                  default: 'recent'
                }
              },
              v: 1
            }
          },
          avg_rating: { $avg: '$vote_average' },
          genre_spread: { $addToSet: { $arrayElemAt: ['$genres', 0] } }
        }
      }
    ]);
    
    if (stats.length > 0) {
      const stat = stats[0];
      console.log('\n📈 Diversity Analysis:');
      console.log(`   Total movies: ${stat.total}`);
      console.log(`   Average rating: ${stat.avg_rating?.toFixed(1) || 'N/A'}`);
      console.log(`   Primary genres represented: ${stat.genre_spread?.length || 0}`);
      
      // Count by industry
      const industryCount = {};
      stat.by_industry.forEach(item => {
        industryCount[item.k] = (industryCount[item.k] || 0) + 1;
      });
      console.log(`   Industry distribution:`, industryCount);
      
      // Count by popularity tier
      const popularityCount = {};
      stat.by_popularity.forEach(item => {
        popularityCount[item.k] = (popularityCount[item.k] || 0) + 1;
      });
      console.log(`   Popularity distribution:`, popularityCount);
    }
    
    // Sample a few movies to verify
    console.log('\n🎬 Sample movies:');
    const sampleMovies = await CalibrationMovie.find().limit(3);
    sampleMovies.forEach((movie, index) => {
      console.log(`   ${index + 1}. ${movie.title} (${movie.year}) - ${movie.industry} ${movie.popularity_tier}`);
      console.log(`      Genres: ${movie.genres.join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Additional diverse movies data for manual insertion if needed
const additionalMoviesData = [
  {
    tmdb_id: 496243,
    title: 'Parasite',
    overview: 'All unemployed, Ki-taek\'s family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.',
    poster_path: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    genres: ['Comedy', 'Thriller', 'Drama'],
    year: 2019,
    vote_average: 8.5,
    vote_count: 17000,
    industry: 'international',
    popularity_tier: 'critically_acclaimed'
  },
  {
    tmdb_id: 15804,
    title: '3 Idiots',
    overview: 'Rascal. Joker. Dreamer. Genius... You\'ve never met a college student quite like "Rancho." From the moment he arrives at India\'s most prestigious university, Rancho\'s outlandish schemes turn the campus upside down.',
    poster_path: '/66A9MqXOyVFEAGd2qOJcZ59dY8X.jpg',
    genres: ['Comedy', 'Drama'],
    year: 2009,
    vote_average: 8.4,
    vote_count: 3000,
    industry: 'bollywood', 
    popularity_tier: 'blockbuster'
  },
  {
    tmdb_id: 862,
    title: 'Toy Story',
    overview: 'Led by Woody, Andy\'s toys live happily in his room until Andy\'s birthday brings Buzz Lightyear onto the scene.',
    poster_path: '/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg',
    genres: ['Animation', 'Comedy', 'Family'],
    year: 1995,
    vote_average: 8.3,
    vote_count: 16000,
    industry: 'hollywood',
    popularity_tier: 'blockbuster'
  },
  {
    tmdb_id: 329,
    title: 'Jurassic Park',
    overview: 'A wealthy entrepreneur secretly creates a theme park featuring living dinosaurs drawn from prehistoric DNA.',
    poster_path: '/b1AQhL7ggQ6kwW1Jf6oZQa4oRPu.jpg',
    genres: ['Adventure', 'Science Fiction', 'Thriller'],
    year: 1993,
    vote_average: 8.1,
    vote_count: 15000,
    industry: 'hollywood',
    popularity_tier: 'blockbuster'
  }
];

async function seedAdditionalMovies() {
  try {
    console.log('🎬 Seeding additional diverse movies...');
    
    for (const movieData of additionalMoviesData) {
      const existing = await CalibrationMovie.findOne({ tmdb_id: movieData.tmdb_id });
      if (!existing) {
        await CalibrationMovie.create(movieData);
        console.log(`   ✅ Added: ${movieData.title} (${movieData.year})`);
      } else {
        console.log(`   ⏭️  Skipped: ${movieData.title} (already exists)`);
      }
    }
    
  } catch (error) {
    console.error('Error seeding additional movies:', error);
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedCalibrationMovies()
    .then(() => seedAdditionalMovies())
    .then(() => {
      console.log('\n🎉 Calibration movies seeding complete!');
      console.log('\n💡 Next steps:');
      console.log('   1. Run the PostgreSQL migration: node cinemies-backend/database/run-migration.js');
      console.log('   2. Start implementing the taste calibration API endpoints');
      console.log('   3. Test the diverse movie selection algorithm');
      return closeMongoDB();
    })
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { 
  seedCalibrationMovies,
  seedAdditionalMovies,
  additionalMoviesData 
};