export const IMDB_TOP_ENTRY_CLIPS = [
  { rank: 1, title: "The Shawshank Redemption", year: 1994, imdbRating: 9.3, industry: "Hollywood", trailerYoutubeId: "6hB3S9bIaco", mood: "dark_mirror", posterColor: "#1a1208" },
  { rank: 2, title: "The Godfather", year: 1972, imdbRating: 9.2, industry: "Hollywood", trailerYoutubeId: "sY1S34973zA", mood: "dark_mirror", posterColor: "#0d0a0a" },
  { rank: 3, title: "Inception", year: 2010, imdbRating: 8.8, industry: "Hollywood", trailerYoutubeId: "YoHD9XEInc0", mood: "mind_bending", posterColor: "#0d1020" },
  { rank: 4, title: "Interstellar", year: 2014, imdbRating: 8.7, industry: "Hollywood", trailerYoutubeId: "zSWdZVtXT7E", mood: "visual_spectacle", posterColor: "#0a0d18" },
  { rank: 5, title: "Bahubali 2: The Conclusion", year: 2017, imdbRating: 8.2, industry: "Tollywood", trailerYoutubeId: "G2uzsIULBn0", mood: "visual_spectacle", posterColor: "#120808" },
  { rank: 6, title: "Taare Zameen Par", year: 2007, imdbRating: 8.4, industry: "Bollywood", trailerYoutubeId: "I7nWxJGPJkk", mood: "heartwarming", posterColor: "#0d1208" },
  { rank: 7, title: "3 Idiots", year: 2009, imdbRating: 8.4, industry: "Bollywood", trailerYoutubeId: "xvszmNXdM4w", mood: "comfort_food", posterColor: "#0a1008" },
  { rank: 8, title: "Parasite", year: 2019, imdbRating: 8.5, industry: "Hollywood", trailerYoutubeId: "5xH0HfJHsaY", mood: "dark_mirror", posterColor: "#0d0d0d" },
  { rank: 9, title: "Drishyam", year: 2013, imdbRating: 8.3, industry: "Tollywood", trailerYoutubeId: "A_iCoKCKi9A", mood: "edge_of_seat", posterColor: "#120a0a" },
  { rank: 10, title: "Andhadhun", year: 2018, imdbRating: 8.2, industry: "Bollywood", trailerYoutubeId: "ZMqiHwGqO8c", mood: "mind_bending", posterColor: "#0d0a14" },
]

export const ENTRY_SEQUENCE_CLIP_IDS = [
  "YoHD9XEInc0",  // Inception
  "G2uzsIULBn0",  // Bahubali 2
  "I7nWxJGPJkk",  // Taare Zameen Par
]

// Fallback mock movies for when backend is offline
export const MOCK_MOVIES = [
  { _id: "m1", title: "Inception", year: 2010, poster_path: null, vote_average: 8.8, industry: "Hollywood", genres: ["Sci-Fi"], mood_scores: { mind_bending: 0.95, visual_spectacle: 0.8 }, trailerYoutubeId: "YoHD9XEInc0" },
  { _id: "m2", title: "3 Idiots", year: 2009, poster_path: null, vote_average: 8.4, industry: "Bollywood", genres: ["Comedy"], mood_scores: { comfort_food: 0.92, heartwarming: 0.85 }, trailerYoutubeId: "xvszmNXdM4w" },
  { _id: "m3", title: "Bahubali 2", year: 2017, poster_path: null, vote_average: 8.2, industry: "Tollywood", genres: ["Action"], mood_scores: { visual_spectacle: 0.96, edge_of_seat: 0.8 }, trailerYoutubeId: "G2uzsIULBn0" },
  { _id: "m4", title: "Parasite", year: 2019, poster_path: null, vote_average: 8.5, industry: "Hollywood", genres: ["Thriller"], mood_scores: { dark_mirror: 0.94, mind_bending: 0.7 }, trailerYoutubeId: "5xH0HfJHsaY" },
  { _id: "m5", title: "Interstellar", year: 2014, poster_path: null, vote_average: 8.7, industry: "Hollywood", genres: ["Sci-Fi"], mood_scores: { visual_spectacle: 0.95, mind_bending: 0.88 }, trailerYoutubeId: "zSWdZVtXT7E" },
  { _id: "m6", title: "Taare Zameen Par", year: 2007, poster_path: null, vote_average: 8.4, industry: "Bollywood", genres: ["Drama"], mood_scores: { heartwarming: 0.96, comfort_food: 0.6 }, trailerYoutubeId: "I7nWxJGPJkk" },
  { _id: "m7", title: "Drishyam", year: 2013, poster_path: null, vote_average: 8.3, industry: "Tollywood", genres: ["Thriller"], mood_scores: { edge_of_seat: 0.93, dark_mirror: 0.75 }, trailerYoutubeId: "A_iCoKCKi9A" },
  { _id: "m8", title: "Andhadhun", year: 2018, poster_path: null, vote_average: 8.2, industry: "Bollywood", genres: ["Thriller"], mood_scores: { mind_bending: 0.9, dark_mirror: 0.82 }, trailerYoutubeId: "ZMqiHwGqO8c" },
  { _id: "m9", title: "The Shawshank Redemption", year: 1994, poster_path: null, vote_average: 9.3, industry: "Hollywood", genres: ["Drama"], mood_scores: { heartwarming: 0.85, dark_mirror: 0.7 }, trailerYoutubeId: "6hB3S9bIaco" },
  { _id: "m10", title: "The Godfather", year: 1972, poster_path: null, vote_average: 9.2, industry: "Hollywood", genres: ["Crime"], mood_scores: { dark_mirror: 0.92, edge_of_seat: 0.78 }, trailerYoutubeId: "sY1S34973zA" },
  { _id: "m11", title: "Mad Max: Fury Road", year: 2015, poster_path: null, vote_average: 8.1, industry: "Hollywood", genres: ["Action"], mood_scores: { edge_of_seat: 0.95, visual_spectacle: 0.9 }, trailerYoutubeId: "hEJnMQG9ev8" },
  { _id: "m12", title: "Coco", year: 2017, poster_path: null, vote_average: 8.4, industry: "Hollywood", genres: ["Animation"], mood_scores: { heartwarming: 0.97, comfort_food: 0.8 }, trailerYoutubeId: "Rvr68uZVZJo" },
]
