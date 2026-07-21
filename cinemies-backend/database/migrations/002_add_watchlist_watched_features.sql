-- Migration: Add Watchlist and Watched Features
-- Add watchlist, watched list, and streaming platform availability

-- Add watchlist to user_profiles if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'watchlist'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN watchlist INTEGER[] DEFAULT '{}';
    END IF;
END $$;

-- Add watched list
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'watched'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN watched INTEGER[] DEFAULT '{}';
    END IF;
END $$;

-- Add watched movies metadata (ratings, timestamps)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'watched_metadata'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN watched_metadata JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_watchlist ON user_profiles USING GIN(watchlist);
CREATE INDEX IF NOT EXISTS idx_user_profiles_watched ON user_profiles USING GIN(watched);
CREATE INDEX IF NOT EXISTS idx_user_profiles_watched_metadata ON user_profiles USING GIN(watched_metadata);

-- Add streaming_platforms table to track where movies are available
CREATE TABLE IF NOT EXISTS streaming_platforms (
    id SERIAL PRIMARY KEY,
    tmdb_id INTEGER NOT NULL,
    country_code VARCHAR(2) DEFAULT 'US',
    platforms JSONB DEFAULT '[]'::jsonb, -- Array of {provider_name, provider_id, logo_path, link}
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tmdb_id, country_code)
);

CREATE INDEX IF NOT EXISTS idx_streaming_platforms_tmdb_id ON streaming_platforms(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_streaming_platforms_country ON streaming_platforms(country_code);

-- Comments for documentation
COMMENT ON COLUMN user_profiles.watchlist IS 'Array of TMDB movie IDs user wants to watch';
COMMENT ON COLUMN user_profiles.watched IS 'Array of TMDB movie IDs user has watched';
COMMENT ON COLUMN user_profiles.watched_metadata IS 'Detailed watched history with timestamps and ratings: [{tmdb_id, watched_at, user_rating}]';
COMMENT ON TABLE streaming_platforms IS 'Stores streaming availability data from TMDB API';
