/**
 * Movie Model (MongoDB)
 * Schema for movie documents in MongoDB
 */

const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  tmdb_id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  overview: { type: String, required: true },
  poster_path: { type: String },
  genres: [{ id: Number, name: String }],
  vote_average: { type: Number },
  industry: { 
    type: String, 
    enum: ['hollywood', 'bollywood', 'tollywood', 'other'],
    default: 'hollywood'
  },
  mood_scores: { type: Object } // Tushar's AI classifications live here
}, {
  timestamps: true,
  collection: 'movies',
});

// Indexes for performance
movieSchema.index({ title: 'text', overview: 'text' });
movieSchema.index({ genres: 1 });
movieSchema.index({ vote_average: -1 });
movieSchema.index({ popularity: -1 });
movieSchema.index({ release_date: -1 });

// Virtual for full poster URL
movieSchema.virtual('fullPosterUrl').get(function() {
  if (this.poster_url) return this.poster_url;
  if (this.poster_path) {
    return `https://image.tmdb.org/t/p/w500${this.poster_path}`;
  }
  return null;
});

// Instance methods
movieSchema.methods.toSafeObject = function() {
  const obj = this.toObject({ virtuals: true });
  delete obj._id;
  delete obj.__v;
  return obj;
};

// Static methods
movieSchema.statics.searchMovies = async function(query, limit = 20, skip = 0) {
  return await this.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .skip(skip);
};

movieSchema.statics.getTrending = async function(limit = 20) {
  return await this.find()
    .sort({ popularity: -1, vote_average: -1 })
    .limit(limit);
};

movieSchema.statics.getByGenre = async function(genre, limit = 20, skip = 0) {
  return await this.find({ genres: genre })
    .sort({ vote_average: -1 })
    .limit(limit)
    .skip(skip);
};

movieSchema.statics.getTopRated = async function(limit = 20) {
  return await this.find({ vote_count: { $gte: 100 } })
    .sort({ vote_average: -1 })
    .limit(limit);
};

const Movie = mongoose.model('Movie', movieSchema);

module.exports = Movie;
