"""Unit tests for configuration constants."""

import config


def test_embedding_configuration():
    """Test embedding-related configuration constants."""
    assert config.EMBEDDING_MODEL == "all-MiniLM-L6-v2"
    assert config.EMBEDDING_DIMENSION == 384
    assert config.FAISS_INDEX_TYPE == "IndexFlatIP"


def test_mongodb_configuration():
    """Test MongoDB-related configuration constants."""
    assert config.MONGODB_CONNECTION_STRING == "mongodb://localhost:27017"
    assert config.MONGODB_DATABASE == "cinemies"
    assert config.MONGODB_COLLECTION == "movies"


def test_api_configuration():
    """Test API-related configuration constants."""
    assert config.API_HOST == "0.0.0.0"
    assert config.API_PORT == 8000
    assert config.MAX_RECOMMENDATIONS == 50
    assert config.DEFAULT_RECOMMENDATIONS == 10


def test_moods_list():
    """Test MOODS list contains all 8 defined moods."""
    expected_moods = [
        "mind_bending",
        "comfort_food",
        "visual_spectacle",
        "cathartic_cry",
        "hidden_gem",
        "laugh_out_loud",
        "edge_of_seat",
        "feel_inspired"
    ]
    assert config.MOODS == expected_moods
    assert len(config.MOODS) == 8


def test_moods_are_unique():
    """Test that all mood names are unique."""
    assert len(config.MOODS) == len(set(config.MOODS))


def test_recommendation_limits():
    """Test that recommendation limits are valid."""
    assert config.DEFAULT_RECOMMENDATIONS > 0
    assert config.DEFAULT_RECOMMENDATIONS <= config.MAX_RECOMMENDATIONS
    assert config.MAX_RECOMMENDATIONS > 0
