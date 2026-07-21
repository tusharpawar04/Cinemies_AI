-- PostgreSQL Schema for Cinemies Backend
-- Strict identity and relationship management

-- Users Table: Strict identity management
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles Table: 1-to-1 relationship with Users
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    favorite_movie_ids JSONB DEFAULT '[]'::jsonb -- Stores TMDB IDs as a JSON array
);

-- Interactions Table: For telemetry and future ML training
CREATE TABLE IF NOT EXISTS interactions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    movie_tmdb_id INT NOT NULL,
    interaction_type VARCHAR(50) NOT NULL, -- e.g., 'click', 'watch_start', 'favorite', 'unfavorite'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_movie_id ON interactions(movie_tmdb_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at DESC);
