/**
 * Seed Calibration Movies
 * Pulls 50 diverse movies from the existing MongoDB movies collection
 * and inserts them into the calibration_movies collection.
 * 
 * Usage: node scripts/seed-calibration-movies.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../src/config');

// Connect to MongoDB
async function connect() {
  const uri = config.mongodb.uri;
  console.log(`Connecting to MongoDB: ${uri.replace(/\/\/.*@/, '//***@')}...`);
  await mongoose.connect(uri, config.mongodb.options);
  console.log('Connected to MongoDB');
}

async function seedCalibrationMovies() {
  await connect();
  
  const db = mongoose.connection.db;
  const moviesCollection = db.collection(config.mongodb.collection || 'movies');
  const calibrationCollection = db.collection('calibration_movies');
  
  // Check if already seeded
  const existingCount = await calibrationCollection.countDocuments();
  if (existingCount >= 50) {
    console.log(`Already have ${existingCount} calibration movies. Skipping.`);
    await mongoose.disconnect();
    return;
  }
  
  console.log(`Found ${existingCount} existing calibration movies. Targeting 50.`);
  
  // Get all movies
  const allMovies = await moviesCollection.find({
    overview: { $exists: true, $ne: '' },
    title: { $exists: true, $ne: '' },
  }).toArray();
  
  console.log(`Total movies in database: ${allMovies.length}`);
  
  if (allMovies.length === 0) {
    console.error('No movies found in database!');
    await mongoose.disconnect();
    return;
  }
  
  // Categorize movies
  const categorized = {
    hollywood: [],
    bollywood: [],
    international: [],
  };
  
  const genreMap = {};
  
  for (const movie of allMovies) {
    // Determine industry
    let industry = 'hollywood';
    const lang = movie.original_language || movie.language || 'en';
    const title = movie.title || '';
    
    if (lang === 'hi' || lang === 'te' || lang === 'ta' || lang === 'ml' || lang === 'kn') {
      industry = 'bollywood';
    } else if (lang !== 'en') {
      industry = 'international';
    }
    
    // Determine genres
    let genres = movie.genres || [];
    if (typeof genres[0] === 'object' && genres[0].name) {
      genres = genres.map(g => g.name);
    }
    
    // Determine year
    let year = movie.year || null;
    if (!year && movie.release_date) {
      year = parseInt(movie.release_date.substring(0, 4));
    }
    
    // Determine popularity tier
    let popularityTier = 'mainstream';
    const voteAvg = movie.vote_average || 0;
    const voteCount = movie.vote_count || 0;
    
    if (voteCount > 10000 && voteAvg >= 7.0) popularityTier = 'blockbuster';
    else if (voteAvg >= 8.0 && voteCount > 1000) popularityTier = 'critically_acclaimed';
    else if (voteCount < 5000 && voteAvg >= 7.5) popularityTier = 'hidden_gem';
    
    const enriched = {
      tmdb_id: movie.tmdb_id || movie.id,
      title: movie.title,
      overview: movie.overview,
      poster_path: movie.poster_path || movie.poster_url?.replace('https://image.tmdb.org/t/p/w500', '') || null,
      backdrop_path: movie.backdrop_path || null,
      genres,
      year: year || 2000,
      vote_average: voteAvg,
      vote_count: voteCount,
      industry,
      popularity_tier: popularityTier,
      calibration_effectiveness: 0,
      usage_count: 0,
      positive_ratings: 0,
      negative_ratings: 0,
      neutral_ratings: 0,
    };
    
    categorized[industry].push(enriched);
    
    // Track genres
    for (const genre of genres) {
      if (!genreMap[genre]) genreMap[genre] = [];
      genreMap[genre].push(enriched);
    }
  }
  
  console.log(`Categorized: Hollywood=${categorized.hollywood.length}, Bollywood=${categorized.bollywood.length}, International=${categorized.international.length}`);
  console.log(`Genres found: ${Object.keys(genreMap).join(', ')}`);
  
  // Select diverse movies: 30 Hollywood, 15 Bollywood, 5 International
  const target = 50 - existingCount;
  const selected = [];
  const selectedIds = new Set();
  
  // Get existing IDs to avoid duplicates
  const existingDocs = await calibrationCollection.find({}).project({ tmdb_id: 1 }).toArray();
  existingDocs.forEach(d => selectedIds.add(d.tmdb_id));
  
  function addMovies(pool, count) {
    // Sort by vote_average desc, then pick diverse ones
    const sorted = pool
      .filter(m => !selectedIds.has(m.tmdb_id) && m.tmdb_id)
      .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    
    const picked = [];
    const usedGenres = new Set();
    
    // First pass: pick high-rated movies ensuring genre diversity
    for (const movie of sorted) {
      if (picked.length >= count) break;
      
      const newGenres = movie.genres.filter(g => !usedGenres.has(g));
      if (newGenres.length > 0 || picked.length < count * 0.5) {
        picked.push(movie);
        selectedIds.add(movie.tmdb_id);
        movie.genres.forEach(g => usedGenres.add(g));
      }
    }
    
    // Second pass: fill remaining slots
    for (const movie of sorted) {
      if (picked.length >= count) break;
      if (!selectedIds.has(movie.tmdb_id)) {
        picked.push(movie);
        selectedIds.add(movie.tmdb_id);
      }
    }
    
    return picked;
  }
  
  const hollywoodTarget = Math.ceil(target * 0.6);
  const bollywoodTarget = Math.ceil(target * 0.3);
  const internationalTarget = target - hollywoodTarget - bollywoodTarget;
  
  selected.push(...addMovies(categorized.hollywood, hollywoodTarget));
  selected.push(...addMovies(categorized.bollywood, bollywoodTarget));
  selected.push(...addMovies(categorized.international, Math.max(internationalTarget, 2)));
  
  console.log(`\nSelected ${selected.length} movies for calibration:`);
  selected.forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.title} (${m.year}) [${m.industry}] - ${m.genres.join(', ')} - ★${m.vote_average}`);
  });
  
  // Insert into calibration_movies collection
  if (selected.length > 0) {
    try {
      const result = await calibrationCollection.insertMany(selected, { ordered: false });
      console.log(`\n✅ Successfully inserted ${result.insertedCount} calibration movies`);
    } catch (error) {
      if (error.code === 11000) {
        console.log(`\n⚠️ Some movies already existed (duplicates skipped). Inserted: ${error.result?.nInserted || 'unknown'}`);
      } else {
        throw error;
      }
    }
  }
  
  const finalCount = await calibrationCollection.countDocuments();
  console.log(`\n📊 Total calibration movies: ${finalCount}`);
  
  await mongoose.disconnect();
  console.log('Done!');
}

seedCalibrationMovies().catch(error => {
  console.error('Seed failed:', error);
  process.exit(1);
});
