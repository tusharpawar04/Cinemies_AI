-- Migration: Add Taste Calibration Fields
-- Adds fields required for the taste calibration MOAT feature

-- Add onboardingCompleted field to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN DEFAULT FALSE NOT NULL;

-- Add taste calibration fields to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS "tasteVector" JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "ratedMovieIds" JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "abTestCohort" VARCHAR(20) DEFAULT NULL;

-- Add constraints for taste_vector validation
-- Note: PostgreSQL doesn't support array length constraints in CHECK,
-- so we'll rely on application-level validation

-- Add check constraint for ab_test_cohort
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS check_ab_test_cohort;
ALTER TABLE user_profiles ADD CONSTRAINT check_ab_test_cohort CHECK ("abTestCohort" IN ('control', 'variant_a', 'variant_b'));

-- Update interaction_type enum to include new analytics events
-- First, check if the enum exists and drop constraint if needed
DO $$ 
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE constraint_name = 'interactions_interaction_type_check'
    ) THEN
        ALTER TABLE interactions DROP CONSTRAINT interactions_interaction_type_check;
    END IF;
    
    -- Add new constraint with expanded enum values
    ALTER TABLE interactions 
    ADD CONSTRAINT interactions_interaction_type_check 
    CHECK ("interactionType" IN (
        'view',
        'click', 
        'watch_start',
        'watch_complete',
        'rating',
        'favorite',
        'unfavorite',
        'watchlist_add',
        'watchlist_remove',
        'taste_calibration_started',
        'taste_calibration_completed', 
        'taste_calibration_skipped',
        'recommendation_request',
        'exploration_click'
    ));
END $$;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users("onboardingCompleted");
CREATE INDEX IF NOT EXISTS idx_user_profiles_ab_test_cohort ON user_profiles("abTestCohort");
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions("interactionType");

-- Update schema comment
COMMENT ON COLUMN users."onboardingCompleted" IS 'Whether user has completed taste calibration onboarding';
COMMENT ON COLUMN user_profiles."tasteVector" IS '384-dimensional taste vector from calibration (JSONB array)';
COMMENT ON COLUMN user_profiles."ratedMovieIds" IS 'Array of rated movies during calibration with ratings';
COMMENT ON COLUMN user_profiles."abTestCohort" IS 'A/B testing cohort assignment for recommendation algorithms';

-- Create calibration_movies table for curated onboarding movies
CREATE TABLE IF NOT EXISTS calibration_movies (
    id SERIAL PRIMARY KEY,
    tmdb_id INT UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    overview TEXT,
    poster_path VARCHAR(500),
    backdrop_path VARCHAR(500),
    genres JSONB DEFAULT '[]'::jsonb,
    year INT,
    vote_average DECIMAL(3,1),
    industry VARCHAR(50) DEFAULT 'hollywood',
    popularity_tier VARCHAR(20) DEFAULT 'mainstream',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for calibration_movies
CREATE INDEX IF NOT EXISTS idx_calibration_movies_tmdb_id ON calibration_movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_calibration_movies_genres ON calibration_movies USING GIN(genres);
CREATE INDEX IF NOT EXISTS idx_calibration_movies_year ON calibration_movies(year);
CREATE INDEX IF NOT EXISTS idx_calibration_movies_industry ON calibration_movies(industry);
CREATE INDEX IF NOT EXISTS idx_calibration_movies_popularity ON calibration_movies(popularity_tier);

-- Add constraints for calibration_movies
ALTER TABLE calibration_movies DROP CONSTRAINT IF EXISTS check_industry;
ALTER TABLE calibration_movies ADD CONSTRAINT check_industry CHECK (industry IN ('hollywood', 'bollywood', 'international'));

ALTER TABLE calibration_movies DROP CONSTRAINT IF EXISTS check_popularity_tier;
ALTER TABLE calibration_movies ADD CONSTRAINT check_popularity_tier CHECK (popularity_tier IN ('blockbuster', 'mainstream', 'critically_acclaimed', 'hidden_gem'));

ALTER TABLE calibration_movies DROP CONSTRAINT IF EXISTS check_year_range;
ALTER TABLE calibration_movies ADD CONSTRAINT check_year_range CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM NOW()) + 5);

-- Insert some sample calibration movies (diverse selection)
INSERT INTO calibration_movies (tmdb_id, title, overview, poster_path, genres, year, vote_average, industry, popularity_tier) VALUES
(27205, 'Inception', 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.', '/qmDpIHrmpJINaRKAfWQfftjCdyi.jpg', '["Action", "Science Fiction", "Thriller"]', 2010, 8.4, 'hollywood', 'blockbuster'),
(603, 'The Matrix', 'Set in the 22nd century, The Matrix tells the story of a computer programmer who is led to fight an underground war against powerful computers who have constructed his entire reality with a system called the Matrix.', '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', '["Action", "Science Fiction"]', 1999, 8.7, 'hollywood', 'blockbuster'),
(11036, 'The Notebook', 'An epic love story centered around an older man reading aloud to a woman with Alzheimers. From a faded notebook, the old man''s words bring to life the story about a couple who is separated by World War II, and is then passionately reunited, seven years later, after they have taken different paths.', '/qom1SZSENdmHFNZBXbtJAU0WTlC.jpg', '["Romance", "Drama"]', 2004, 7.9, 'hollywood', 'mainstream'),
(278, 'The Shawshank Redemption', 'Framed in the 1940s for the double murder of his wife and her lover, upstanding banker Andy Dufresne begins a new life at the Shawshank prison, where he puts his accounting skills to work for an amoral warden. During his long stretch in prison, Dufresne comes to be admired by the other inmates -- including an older prisoner named Red -- for his integrity and unquenchable sense of hope.', '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', '["Drama", "Crime"]', 1994, 9.3, 'hollywood', 'critically_acclaimed'),
(13, 'Forrest Gump', 'A man with a low IQ has accomplished great things in his life and been present during significant historic events—in each case, far exceeding what anyone imagined he could do. But despite all he has achieved, his one true love eludes him.', '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', '["Comedy", "Drama", "Romance"]', 1994, 8.5, 'hollywood', 'blockbuster'),
(19404, 'Dilwale Dulhania Le Jayenge', 'Raj is a rich, carefree, happy-go-lucky second generation NRI. Simran is the daughter of Chaudhary Baldev Singh, who in spite of being an NRI is very strict about adherence to Indian values. Simran has left for India to be married to her childhood fiancé. Raj leaves for India with a mission at his hands, to claim his lady love under the noses of her whole family. Thus begins a saga.', '/2CAL2433ZeIihfX1Hb2139CX0pW.jpg', '["Comedy", "Drama", "Romance"]', 1995, 8.7, 'bollywood', 'blockbuster'),
(238, 'The Godfather', 'Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family. When organized crime family patriarch, Vito Corleone barely survives an attempt on his life, his youngest son, Michael steps in to take care of the assassins, launching a campaign of bloody revenge.', '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', '["Drama", "Crime"]', 1972, 9.2, 'hollywood', 'critically_acclaimed')
ON CONFLICT (tmdb_id) DO NOTHING;

-- Migration complete
SELECT 'Taste calibration database migration completed successfully' as status;