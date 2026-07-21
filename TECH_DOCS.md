# Cinemies AI - Comprehensive Technical Architecture & Implementation Document

## 1. Executive Summary & Problem Statement

### What is Cinemies Trying to Solve?
Traditional movie recommendation engines (like Netflix or Prime Video) often rely heavily on collaborative filtering (e.g., "Users who watched X also watched Y") or rigid genre classifications. This approach falls short in understanding the *nuance* of why a user enjoys a movie. It fails to capture the "vibe" or "mood" a user is currently looking for, leading to choice paralysis.

**Cinemies** solves this by shifting the paradigm from rigid collaborative filtering to **Semantic, Mood-Based, AI-Driven Recommendations**. It leverages large language models (LLMs) to understand the rich textual metadata of movies and maps them into a high-dimensional vector space. By maintaining a dynamic, personalized "Taste Vector" for each user and combining it with their current "Mood Vector," Cinemies delivers highly serendipitous, emotionally aligned recommendations. 

---

## 2. System Architecture Overview

Cinemies employs a modern, decoupled microservices architecture with a distinct separation of concerns:

1. **Frontend Presentation Layer (React + Vite, Port 3000)**: A highly interactive Single Page Application (SPA) focusing on micro-interactions and 3D graphics to create a premium, immersive user experience.
2. **Backend Orchestrator (Node.js + Express, Port 5000)**: The central nervous system. It handles user state, authentication, structured data persistence, and acts as an API Gateway to the AI engine.
3. **AI Recommendation Engine (Python FastAPI, Port 8000)**: A computationally heavy service dedicated to maintaining FAISS vector indices, embedding textual data, and executing the proprietary hybrid recommendation algorithm.

---

## 3. Data Persistence Layer (Deep Dive)

Cinemies utilizes a polyglot persistence strategy, selecting the best database engine for the specific data shape.

### 3.1. PostgreSQL (Relational Data)
Managed via **Sequelize ORM**, PostgreSQL is used for structured, strictly typed data that requires ACID compliance and relational integrity.

#### Detailed `UserProfile` Schema
The `UserProfile` table is critical for personalization. Key fields include:
* **`tasteVector` (JSONB)**: An exact 384-dimensional array of floats representing the user's semantic taste in multi-dimensional space.
* **`ratedMovieIds` (JSONB)**: An array of `{ tmdb_id: number, rating: -1 | 0 | 1 }` generated during the calibration phase.
* **`favoriteMovieIds` / `watchlist` / `watched` (INT ARRAY)**: Arrays of TMDB integer IDs for fast lookups.
* **`watchedMetadata` (JSONB)**: Detailed watch history including timestamps and implicit ratings.
* **`abTestCohort` (ENUM)**: Used for running A/B experiments (`control`, `variant_a`, `variant_b`).

#### Detailed `Interaction` Schema
The `Interaction` table is an append-only telemetry ledger.
* **`interactionType` (ENUM)**: Precisely tracks user events: `view, click, watch_start, watch_complete, rating, favorite, unfavorite, watchlist_add, watchlist_remove, taste_calibration_started, taste_calibration_completed, taste_calibration_skipped, recommendation_request, exploration_click`.
* **`rating` (DECIMAL)**: Explicit 0-10 rating when provided.
* **`watchDuration` (INTEGER)**: Implicit rating measured in seconds.
* **`metadata` (JSONB)**: Contextual payload (e.g., `{ mood: 'mind_bending', source: 'recommendation' }`).

### 3.2. MongoDB (Document Data)
Managed via **Mongoose ORM**, MongoDB handles unstructured or highly nested data that does not fit well in rigid tables.
* **`Movie` Collection**: Stores comprehensive metadata from TMDB, including dynamic arrays of genres, nested production companies, cast members, and text-heavy overviews.
* **`CalibrationMovie` Collection**: A curated, static subset of highly polarizing movies used exclusively during the user onboarding "Tinder-style swipe" phase to establish a baseline taste vector.

### 3.3. Redis (In-Memory Cache)
* Stores high-frequency, non-personalized baseline mood vectors to prevent the AI engine from recalculating standard embeddings for common requests.
* Rate limits API endpoints to prevent abuse.

---

## 4. The AI & Machine Learning Pipeline (Deep Dive)

The AI Engine (`cinemies-ai/hybrid_engine.py`) is the core differentiator of the project.

### 4.1. Text Embeddings via Sentence Transformers
Cinemies uses Hugging Face's `all-MiniLM-L6-v2` transformer model. This model takes raw text (movie overviews, taglines, genres) and maps it into a dense, **384-dimensional vector space**. In this space, movies with similar themes, tones, or narratives are physically closer together.

### 4.2. FAISS (Facebook AI Similarity Search)
To search through thousands of 384-dimensional vectors in milliseconds, Cinemies utilizes an `IndexFlatIP` (Inner Product) FAISS index. On startup, the AI engine:
1. Fetches all movies from MongoDB.
2. Checks for a cached `movie_embeddings.npy` file. If missing, it dynamically generates embeddings via the transformer model.
3. Loads the embeddings into RAM via FAISS, creating an instantly queryable index.

### 4.3. Taste Calibration (The Cold Start Solution)
When a new user joins, the system has zero data on them (the "Cold Start" problem). 
1. The user goes through an onboarding flow, swiping Left/Right on ~20 `CalibrationMovies`.
2. The Node.js backend sends these interactions to the AI Engine's `/generate-taste-vector` endpoint.
3. The AI Engine averages the 384-dimensional vectors of all "Liked" movies (rating: 1) and subtracts a fraction of the "Disliked" movies (rating: -1).
4. The resulting 384-dimensional vector becomes the user's baseline **Taste Vector** and is saved in PostgreSQL.

### 4.4. The Mathematical Hybrid Recommendation Engine
The AI engine doesn't just do a simple cosine similarity search. It uses a highly tuned mathematical pipeline located in `hybrid_engine.py`:

**Step 1: Vector Blending**
The target search vector is generated dynamically based on context:
* **Standard Blending**: `40% Mood Vector + 30% User Taste Vector + 30% Collaborative Vector`
* **In-Session Blending (≥3 recent views)**: `50% Mood Vector + 30% User Taste Vector + 20% Session Vector`

**Step 2: Candidate Generation via FAISS**
The blended vector is queried against the FAISS index to return the top 50 closest semantic matches.

**Step 3: Temporal Decay & Cold-Start Boost**
* **Decay**: Movies > 30 years old are penalized using an exponential decay function: `score * exp(-0.05 * age)`.
* **Recency Boost**: Movies < 2 years old receive a flat 10% multiplier.
* **Cold-Start Boost**: Niche movies with < 100 interaction votes receive a 15% multiplier to encourage discovery.

**Step 4: Maximal Marginal Relevance (MMR) Diversity**
To prevent a list of indistinguishable sequels (e.g., returning 5 *Fast & Furious* movies), the engine re-ranks using an MMR algorithm with `lambda = 0.7`. This balances the base relevance against the maximum similarity to already selected candidates, enforcing intra-list diversity.

**Step 5: Epsilon-Greedy Exploration & Serendipity Injection**
* **Epsilon = 0.15**: There is a 15% chance to randomly inject an "exploration candidate" (a movie with moderate 0.6-0.7 relevance but high global rating) into the second-to-last slot of the results.
* **Serendipity**: 1 in every 10 recommendations is deliberately chosen as a "Hidden Gem" (0.5-0.65 match score, but a `vote_average >= 8.0`).

**Step 6: Final Multi-Task Scoring Formula**
The raw FAISS distances are re-calculated using a joint-optimization formula:
`Final Score = (0.6 * Relevance) + (0.2 * Diversity) + (0.1 * Serendipity) + (0.1 * Freshness)`

---

## 5. Security & Authentication Implementation

* **JWT (JSON Web Tokens)**: Stateless authentication. The Node.js backend issues an HTTP-Only, secure cookie containing an Access Token with a short TTL (15 minutes), and a Refresh Token (7 days).
* **Bcrypt Hashing**: Passwords are never stored in plaintext. They are hashed using Bcrypt with a work factor of 10.
* **XSS & Injection Protection**: Inputs are sanitized using `xss-clean` and `express-mongo-sanitize`. PostgreSQL is protected from SQL injection natively via Sequelize parameterized queries.

---

## 6. Frontend Implementation & State Management

The frontend is built for performance and aesthetics.

* **Vite & React 19**: Provides Hot Module Replacement (HMR) and an ultra-fast build pipeline.
* **Zustand**: Replaces Redux for lightweight, unopinionated global state management. Used for `useAuthStore` (session state) and `useWatchlistStore` (optimistic UI updates).
* **3D & Micro-Interactions**: Leverages `@react-three/fiber` for WebGL rendering and `framer-motion` for complex UI page transitions and staggered list animations, establishing a premium "Cinematic" feel.
* **Axios Interceptors**: Global request interceptors silently handle token refreshes. If an API call fails with a `401 Unauthorized`, the interceptor pauses the queue, hits the `/refresh` endpoint, and replays the failed requests invisibly to the user.
