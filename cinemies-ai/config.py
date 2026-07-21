"""Configuration constants for Cinemies AI Recommendation Engine."""

import os
from dotenv import load_dotenv

# Load .env file from the same directory
load_dotenv()

# Embedding configuration
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384
FAISS_INDEX_TYPE = "IndexFlatIP"

# MongoDB configuration — read from environment, NEVER hardcode credentials
MONGODB_CONNECTION_STRING = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DATABASE = os.getenv("MONGODB_DB", "cinemies")
MONGODB_COLLECTION = os.getenv("MONGODB_COLLECTION", "movies")

# API configuration
API_HOST = "0.0.0.0"
API_PORT = 8000
MAX_RECOMMENDATIONS = 50
DEFAULT_RECOMMENDATIONS = 10

# Mood definitions
MOODS = [
    "mind_bending",
    "comfort_food",
    "visual_spectacle",
    "cathartic_cry",
    "hidden_gem",
    "laugh_out_loud",
    "edge_of_seat",
    "feel_inspired"
]
