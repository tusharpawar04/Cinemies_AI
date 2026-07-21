/**
 * CalibrationMovie Model (MongoDB)
 * Schema for curated movies used in taste calibration onboarding
 */

const mongoose = require('mongoose');

const calibrationMovieSchema = new mongoose.Schema({
  tmdb_id: { 
    type: Number, 
    required: true, 
    unique: true,
    index: true
  },
  title: { 
    type: String, 
    required: true,
    index: true
  },
  overview: { 
    type: String, 
    required: true 
  },
  poster_path: { 
    type: String 
  },
  backdrop_path: { 
    type: String 
  },
  genres: {
    type: [String],
    required: true,
    index: true
  },
  year: { 
    type: Number, 
    required: true,
    index: true,
    min: 1900,
    max: 2030
  },
  vote_average: { 
    type: Number,
    min: 0,
    max: 10
  },
  vote_count: {
    type: Number,
    default: 0
  },
  industry: { 
    type: String, 
    enum: ['hollywood', 'bollywood', 'international'],
    default: 'hollywood',
    required: true,
    index: true
  },
  popularity_tier: {
    type: String,
    enum: ['blockbuster', 'mainstream', 'critically_acclaimed', 'hidden_gem'],
    default: 'mainstream',
    required: true,
    index: true
  },
  calibration_effectiveness: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  usage_count: {
    type: Number,
    default: 0
  },
  positive_ratings: {
    type: Number,
    default: 0
  },
  negative_ratings: {
    type: Number,
    default: 0
  },
  neutral_ratings: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'calibration_movies',
});

// Compound indexes for diverse selection
calibrationMovieSchema.index({ industry: 1, popularity_tier: 1, year: 1 });
calibrationMovieSchema.index({ genres: 1, year: 1 });
calibrationMovieSchema.index({ calibration_effectiveness: -1 });

// Virtual for full poster URL
calibrationMovieSchema.virtual('fullPosterUrl').get(function() {
  if (this.poster_path) {
    return `https://image.tmdb.org/t/p/w500${this.poster_path}`;
  }
  return null;
});

// Virtual for rating distribution
calibrationMovieSchema.virtual('ratingDistribution').get(function() {
  const total = this.positive_ratings + this.negative_ratings + this.neutral_ratings;
  if (total === 0) return { positive: 0, negative: 0, neutral: 0 };
  
  return {
    positive: (this.positive_ratings / total * 100).toFixed(1),
    negative: (this.negative_ratings / total * 100).toFixed(1),
    neutral: (this.neutral_ratings / total * 100).toFixed(1),
    total
  };
});

// Instance methods
calibrationMovieSchema.methods.toSafeObject = function() {
  const obj = this.toObject({ virtuals: true });
  delete obj._id;
  delete obj.__v;
  delete obj.calibration_effectiveness;
  delete obj.usage_count;
  delete obj.positive_ratings;
  delete obj.negative_ratings;
  delete obj.neutral_ratings;
  return obj;
};

calibrationMovieSchema.methods.recordRating = async function(rating) {
  const updates = { $inc: { usage_count: 1 } };
  
  if (rating === 1) {
    updates.$inc.positive_ratings = 1;
  } else if (rating === -1) {
    updates.$inc.negative_ratings = 1;
  } else if (rating === 0) {
    updates.$inc.neutral_ratings = 1;
  }
  
  // Update calibration effectiveness (simplified scoring)
  const total = this.positive_ratings + this.negative_ratings + this.neutral_ratings + 1;
  const polarization = Math.abs(this.positive_ratings - this.negative_ratings) / total;
  updates.calibration_effectiveness = Math.min(polarization * 1.5, 1); // Cap at 1.0
  
  return await this.updateOne(updates);
};

// Static methods
calibrationMovieSchema.statics.selectDiverseMovies = async function(count = 20, excludeIds = []) {
  try {
    // Define diversity requirements
    const genreTargets = {
      'Action': 2,
      'Comedy': 2,
      'Drama': 3,
      'Thriller': 2,
      'Romance': 2,
      'Sci-Fi': 1,
      'Horror': 1,
      'Animation': 1,
      'Documentary': 1
    };
    
    const industryTargets = {
      'hollywood': Math.ceil(count * 0.6), // 60%
      'bollywood': Math.ceil(count * 0.3), // 30%
      'international': Math.floor(count * 0.1) // 10%
    };
    
    const eraTargets = {
      'classic': Math.ceil(count * 0.2), // pre-1990
      'modern': Math.ceil(count * 0.4),  // 1990-2010
      'recent': Math.ceil(count * 0.4)   // 2010+
    };
    
    const popularityTargets = {
      'blockbuster': Math.ceil(count * 0.3),
      'mainstream': Math.ceil(count * 0.4),
      'critically_acclaimed': Math.ceil(count * 0.2),
      'hidden_gem': Math.ceil(count * 0.1)
    };
    
    // Build aggregation pipeline for diverse selection
    const pipeline = [
      // Exclude previously selected movies
      { $match: { tmdb_id: { $nin: excludeIds } } },
      
      // Add computed fields for era categorization
      {
        $addFields: {
          era: {
            $switch: {
              branches: [
                { case: { $lt: ['$year', 1990] }, then: 'classic' },
                { case: { $lt: ['$year', 2010] }, then: 'modern' },
                { case: true, then: 'recent' }
              ]
            }
          }
        }
      },
      
      // Sample movies with weighted random selection
      { $sample: { size: Math.min(count * 3, 150) } }, // Get 3x more for filtering
      
      // Sort by effectiveness and diversity factors
      {
        $addFields: {
          diversityScore: {
            $add: [
              { $multiply: ['$calibration_effectiveness', 0.4] },
              { $multiply: [{ $rand: {} }, 0.6] } // Add randomness
            ]
          }
        }
      },
      { $sort: { diversityScore: -1 } },
      
      // Limit to requested count
      { $limit: count }
    ];
    
    const selectedMovies = await this.aggregate(pipeline);
    
    // If we don't have enough movies, fill with random selection
    if (selectedMovies.length < count) {
      const additional = await this.find({ tmdb_id: { $nin: excludeIds } })
        .limit(count - selectedMovies.length)
        .sort({ calibration_effectiveness: -1 });
      
      selectedMovies.push(...additional);
    }
    
    // Shuffle the final selection to randomize order for users
    for (let i = selectedMovies.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selectedMovies[i], selectedMovies[j]] = [selectedMovies[j], selectedMovies[i]];
    }
    
    return selectedMovies.slice(0, count);
    
  } catch (error) {
    console.error('Error selecting diverse movies:', error);
    // Fallback to simple random selection
    return await this.aggregate([
      { $match: { tmdb_id: { $nin: excludeIds } } },
      { $sample: { size: count } }
    ]);
  }
};

calibrationMovieSchema.statics.getCalibrationStats = async function() {
  return await this.aggregate([
    {
      $group: {
        _id: null,
        total_movies: { $sum: 1 },
        avg_effectiveness: { $avg: '$calibration_effectiveness' },
        total_usage: { $sum: '$usage_count' },
        by_industry: {
          $push: {
            industry: '$industry',
            count: 1
          }
        },
        by_popularity: {
          $push: {
            tier: '$popularity_tier',
            count: 1
          }
        }
      }
    }
  ]);
};

calibrationMovieSchema.statics.seedInitialData = async function() {
  const initialMovies = [
    {
      tmdb_id: 27205,
      title: 'Inception',
      overview: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
      poster_path: '/qmDpIHrmpJINaRKAfWQfftjCdyi.jpg',
      backdrop_path: '/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
      genres: ['Action', 'Science Fiction', 'Thriller'],
      year: 2010,
      vote_average: 8.4,
      vote_count: 32000,
      industry: 'hollywood',
      popularity_tier: 'blockbuster'
    },
    {
      tmdb_id: 603,
      title: 'The Matrix',
      overview: 'Set in the 22nd century, The Matrix tells the story of a computer programmer who is led to fight an underground war against powerful computers who have constructed his entire reality with a system called the Matrix.',
      poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
      genres: ['Action', 'Science Fiction'],
      year: 1999,
      vote_average: 8.7,
      vote_count: 24000,
      industry: 'hollywood',
      popularity_tier: 'blockbuster'
    },
    {
      tmdb_id: 11036,
      title: 'The Notebook',
      overview: 'An epic love story centered around an older man reading aloud to a woman with Alzheimers. From a faded notebook, the old man\'s words bring to life the story about a couple who is separated by World War II, and is then passionately reunited, seven years later, after they have taken different paths.',
      poster_path: '/qom1SZSENdmHFNZBXbtJAU0WTlC.jpg',
      genres: ['Romance', 'Drama'],
      year: 2004,
      vote_average: 7.9,
      vote_count: 15000,
      industry: 'hollywood',
      popularity_tier: 'mainstream'
    },
    {
      tmdb_id: 278,
      title: 'The Shawshank Redemption',
      overview: 'Framed in the 1940s for the double murder of his wife and her lover, upstanding banker Andy Dufresne begins a new life at the Shawshank prison, where he puts his accounting skills to work for an amoral warden.',
      poster_path: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
      genres: ['Drama', 'Crime'],
      year: 1994,
      vote_average: 9.3,
      vote_count: 26000,
      industry: 'hollywood',
      popularity_tier: 'critically_acclaimed'
    },
    {
      tmdb_id: 13,
      title: 'Forrest Gump',
      overview: 'A man with a low IQ has accomplished great things in his life and been present during significant historic events—in each case, far exceeding what anyone imagined he could do.',
      poster_path: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
      genres: ['Comedy', 'Drama', 'Romance'],
      year: 1994,
      vote_average: 8.5,
      vote_count: 25000,
      industry: 'hollywood',
      popularity_tier: 'blockbuster'
    },
    {
      tmdb_id: 19404,
      title: 'Dilwale Dulhania Le Jayenge',
      overview: 'Raj is a rich, carefree, happy-go-lucky second generation NRI. Simran is the daughter of Chaudhary Baldev Singh, who in spite of being an NRI is very strict about adherence to Indian values.',
      poster_path: '/2CAL2433ZeIihfX1Hb2139CX0pW.jpg',
      genres: ['Comedy', 'Drama', 'Romance'],
      year: 1995,
      vote_average: 8.7,
      vote_count: 5000,
      industry: 'bollywood',
      popularity_tier: 'blockbuster'
    },
    {
      tmdb_id: 238,
      title: 'The Godfather',
      overview: 'Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family.',
      poster_path: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
      genres: ['Drama', 'Crime'],
      year: 1972,
      vote_average: 9.2,
      vote_count: 19000,
      industry: 'hollywood',
      popularity_tier: 'critically_acclaimed'
    },
    {
      tmdb_id: 120,
      title: 'The Lord of the Rings: The Fellowship of the Ring',
      overview: 'Young hobbit Frodo Baggins, after inheriting a mysterious ring from his uncle Bilbo, must leave his home in order to keep it from falling into the hands of its evil creator.',
      poster_path: '/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg',
      genres: ['Adventure', 'Fantasy', 'Action'],
      year: 2001,
      vote_average: 8.8,
      vote_count: 23000,
      industry: 'hollywood',
      popularity_tier: 'blockbuster'
    },
    {
      tmdb_id: 424,
      title: "Schindler's List",
      overview: 'The true story of how businessman Oskar Schindler saved over a thousand Jewish lives from the Nazis while they worked as slaves in his factory during World War II.',
      poster_path: '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg',
      genres: ['Drama', 'History', 'War'],
      year: 1993,
      vote_average: 9.0,
      vote_count: 15000,
      industry: 'hollywood',
      popularity_tier: 'critically_acclaimed'
    },
    {
      tmdb_id: 155,
      title: 'The Dark Knight',
      overview: 'Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets.',
      poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      genres: ['Action', 'Crime', 'Drama'],
      year: 2008,
      vote_average: 9.0,
      vote_count: 32000,
      industry: 'hollywood',
      popularity_tier: 'blockbuster'
    },
    // Add more diverse movies spanning different genres, eras, and industries
    {
      tmdb_id: 550,
      title: 'Fight Club',
      overview: 'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.',
      poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      genres: ['Drama', 'Thriller'],
      year: 1999,
      vote_average: 8.4,
      vote_count: 28000,
      industry: 'hollywood',
      popularity_tier: 'critically_acclaimed'
    },
    {
      tmdb_id: 680,
      title: 'Pulp Fiction',
      overview: 'A burger-loving hit man, his philosophical partner, a drug-addled gangster\'s moll and a washed-up boxer converge in this sprawling, comedic crime caper.',
      poster_path: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
      genres: ['Crime', 'Drama'],
      year: 1994,
      vote_average: 8.9,
      vote_count: 27000,
      industry: 'hollywood',
      popularity_tier: 'critically_acclaimed'
    }
  ];
  
  try {
    // Use insertMany with ordered: false to continue on duplicates
    const result = await this.insertMany(initialMovies, { ordered: false });
    console.log(`Successfully seeded ${result.length} calibration movies`);
    return result;
  } catch (error) {
    if (error.code === 11000) {
      console.log('Some calibration movies already exist, skipping duplicates');
      return [];
    }
    throw error;
  }
};

const CalibrationMovie = mongoose.model('CalibrationMovie', calibrationMovieSchema);

module.exports = CalibrationMovie;