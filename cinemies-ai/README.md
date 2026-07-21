# Cinemies AI Recommendation Engine

AI-powered movie recommendation system using semantic search with SBERT embeddings and FAISS vector indexing.

## Quick Start

### 1. Setup Environment

```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Run the API Server

```bash
# Start the FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8000

# Or with auto-reload for development
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The server will:
- Load the SBERT model (~90MB download on first run)
- Connect to MongoDB and fetch 1,207 movies
- Generate embeddings for all movies (~45 seconds)
- Build FAISS index
- Start accepting requests

### 3. Test the API

**Health Check:**
```bash
curl http://localhost:8000/health
```

**Get Recommendations:**
```bash
curl "http://localhost:8000/recommend?mood=mind_bending&limit=10"
```

**Interactive Documentation:**
Open http://localhost:8000/docs in your browser for Swagger UI

## API Endpoints

### GET /health

Returns service status and available moods.

**Response:**
```json
{
  "status": "healthy",
  "indexed_movies": 1207,
  "available_moods": [
    "mind_bending",
    "comfort_food",
    "visual_spectacle",
    "cathartic_cry",
    "hidden_gem",
    "laugh_out_loud",
    "edge_of_seat",
    "feel_inspired"
  ]
}
```

### GET /recommend

Get mood-based movie recommendations.

**Parameters:**
- `mood` (required): One of the 8 available moods
- `limit` (optional): Number of recommendations (1-50, default: 10)

**Example:**
```bash
curl "http://localhost:8000/recommend?mood=mind_bending&limit=5"
```

**Response:**
```json
{
  "mood": "mind_bending",
  "count": 5,
  "recommendations": [
    {
      "title": "Inception",
      "overview": "A thief who steals corporate secrets...",
      "tmdb_id": 27205,
      "poster_url": "https://image.tmdb.org/t/p/w500/...",
      "vote_average": 8.4,
      "genres": ["Action", "Sci-Fi", "Thriller"],
      "match_score": 0.87
    }
  ]
}
```

## Available Moods

1. **mind_bending** 🧠 - Complex psychological thrillers with plot twists
2. **comfort_food** 🍿 - Heartwarming feel-good movies
3. **visual_spectacle** 🎬 - Stunning cinematography and visuals
4. **cathartic_cry** 😢 - Emotional dramas that move you
5. **hidden_gem** 💎 - Underrated indie masterpieces
6. **laugh_out_loud** 😂 - Hilarious comedies
7. **edge_of_seat** 😱 - Intense suspenseful thrillers
8. **feel_inspired** ✨ - Uplifting motivational stories

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FastAPI Server                        │
│                      (main.py)                           │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Embedding   │  │    FAISS     │  │    Mood      │
│   Service    │  │    Index     │  │   Vectors    │
│  (SBERT)     │  │  (Search)    │  │  (8 moods)   │
└──────────────┘  └──────────────┘  └──────────────┘
        │                  │                  │
        └──────────────────┴──────────────────┘
                           │
                           ▼
                  ┌──────────────┐
                  │   MongoDB    │
                  │ (1207 movies)│
                  └──────────────┘
```

## Performance

- **Startup Time**: ~45 seconds (model loading + embedding generation)
- **Query Time**: <30ms average
- **Memory Usage**: ~60MB
- **Movies Indexed**: 1,207

## Configuration

Edit `config.py` to customize:

```python
# Embedding model
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384

# MongoDB connection
MONGODB_CONNECTION_STRING = "mongodb+srv://..."
MONGODB_DATABASE = "cinemies"
MONGODB_COLLECTION = "movies"

# API settings
API_HOST = "0.0.0.0"
API_PORT = 8000
DEFAULT_RECOMMENDATIONS = 10
```

## Project Structure

```
cinemies-ai/
├── main.py                    # FastAPI application (MAIN ENTRY POINT)
├── config.py                  # Configuration constants
├── embedding_service.py       # SBERT embedding generation
├── faiss_index.py            # FAISS index management
├── mood_vectors.py           # Mood vector system
├── mongodb_connector.py      # MongoDB data retrieval
├── models.py                 # Pydantic data models
├── requirements.txt          # Python dependencies
└── README.md                 # This file
```

## Deployment

### Option 1: Railway.app (Recommended)

1. Push code to GitHub
2. Create new project on Railway.app
3. Connect GitHub repository
4. Railway will auto-detect Python and install dependencies
5. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Deploy!

### Option 2: Render.com

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect repository
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Deploy!

### Option 3: Docker

```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Integration with Backend

Your Node.js backend should call this API:

```javascript
// Example: Get recommendations
const response = await axios.get('http://localhost:8000/recommend', {
  params: {
    mood: 'mind_bending',
    limit: 10
  }
});

const movies = response.data.recommendations;
```

## Troubleshooting

**Issue: "MongoDB connection failure"**
- Check MongoDB connection string in `config.py`
- Verify network access to MongoDB Atlas

**Issue: "Model loading failure"**
- Ensure internet connection for first-time model download
- Check disk space (~500MB needed)

**Issue: "Service returns 503"**
- Wait for startup to complete (~45 seconds)
- Check logs for errors

## Team Integration

- **Tejas (Backend)**: Call `/recommend` endpoint from Node.js
- **Sonu (Frontend)**: Display recommendations from Tejas's API
- **Sumit (Database)**: MongoDB connection already configured

## Status

✅ Core recommendation engine: COMPLETE
✅ FastAPI endpoints: COMPLETE
✅ FAISS indexing: COMPLETE
✅ Mood vectors: COMPLETE
✅ MongoDB integration: COMPLETE
✅ Documentation: COMPLETE
⏳ User personalization: OPTIONAL (future enhancement)
⏳ Deployment: READY (awaiting team decision)

## Support

For issues or questions, contact Tushar (AI/ML Engineer)
