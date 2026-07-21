"""Unit tests for /recommend endpoint."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
import numpy as np

from main import app
from models import MovieRecommendation


@pytest.fixture
def mock_services():
    """Mock the global service instances."""
    with patch('main.faiss_index') as mock_faiss, \
         patch('main.mood_system') as mock_mood, \
         patch('main.movies_data') as mock_movies:
        
        # Setup mock FAISS index
        mock_faiss.get_index_size.return_value = 100
        mock_faiss.search.return_value = (
            ['123', '456', '789'],
            [0.95, 0.87, 0.82]
        )
        
        # Setup mock mood system
        mock_mood.get_available_moods.return_value = [
            "mind_bending", "comfort_food", "visual_spectacle",
            "cathartic_cry", "hidden_gem", "laugh_out_loud",
            "edge_of_seat", "feel_inspired"
        ]
        mock_mood.get_mood_vector.return_value = np.array([0.1] * 384, dtype=np.float32)
        
        # Setup mock movies data
        mock_movies.__iter__ = Mock(return_value=iter([
            {
                'title': 'Inception',
                'overview': 'A thief who steals corporate secrets...',
                'tmdb_id': 123,
                'poster_url': 'https://example.com/poster1.jpg',
                'vote_average': 8.4,
                'genres': ['Action', 'Science Fiction', 'Thriller']
            },
            {
                'title': 'The Matrix',
                'overview': 'A computer hacker learns...',
                'tmdb_id': 456,
                'poster_url': 'https://example.com/poster2.jpg',
                'vote_average': 8.7,
                'genres': ['Action', 'Science Fiction']
            },
            {
                'title': 'Interstellar',
                'overview': 'A team of explorers travel...',
                'tmdb_id': 789,
                'poster_url': 'https://example.com/poster3.jpg',
                'vote_average': 8.6,
                'genres': ['Adventure', 'Drama', 'Science Fiction']
            }
        ]))
        
        yield mock_faiss, mock_mood, mock_movies


def test_recommend_with_valid_mood(mock_services):
    """Test /recommend endpoint with valid mood parameter."""
    client = TestClient(app)
    
    response = client.get("/recommend?mood=mind_bending&limit=3")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data['mood'] == 'mind_bending'
    assert data['count'] == 3
    assert len(data['recommendations']) == 3
    
    # Verify first recommendation structure
    first_rec = data['recommendations'][0]
    assert first_rec['title'] == 'Inception'
    assert first_rec['tmdb_id'] == 123
    assert first_rec['match_score'] == 0.95
    assert 'overview' in first_rec
    assert 'poster_url' in first_rec
    assert 'vote_average' in first_rec
    assert 'genres' in first_rec


def test_recommend_with_invalid_mood(mock_services):
    """Test /recommend endpoint with invalid mood parameter."""
    client = TestClient(app)
    
    response = client.get("/recommend?mood=invalid_mood&limit=5")
    
    assert response.status_code == 400
    data = response.json()
    
    assert 'error' in data
    assert data['error'] == 'Invalid mood parameter'
    assert 'invalid_mood' in data['detail']


def test_recommend_with_invalid_limit_too_low(mock_services):
    """Test /recommend endpoint with limit < 1."""
    client = TestClient(app)
    
    response = client.get("/recommend?mood=mind_bending&limit=0")
    
    assert response.status_code == 422  # FastAPI validation error


def test_recommend_with_invalid_limit_too_high(mock_services):
    """Test /recommend endpoint with limit > 50."""
    client = TestClient(app)
    
    response = client.get("/recommend?mood=mind_bending&limit=51")
    
    assert response.status_code == 422  # FastAPI validation error


def test_recommend_with_default_limit(mock_services):
    """Test /recommend endpoint with default limit."""
    client = TestClient(app)
    
    response = client.get("/recommend?mood=comfort_food")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data['mood'] == 'comfort_food'
    assert data['count'] >= 0


def test_recommend_when_index_not_initialized():
    """Test /recommend endpoint when FAISS index is not initialized."""
    with patch('main.faiss_index', None):
        client = TestClient(app)
        
        response = client.get("/recommend?mood=mind_bending&limit=5")
        
        assert response.status_code == 503
        data = response.json()
        
        assert 'error' in data
        assert data['error'] == 'Service unavailable'


def test_recommend_when_index_is_empty():
    """Test /recommend endpoint when FAISS index is empty."""
    with patch('main.faiss_index') as mock_faiss, \
         patch('main.mood_system'):
        
        mock_faiss.get_index_size.return_value = 0
        
        client = TestClient(app)
        
        response = client.get("/recommend?mood=mind_bending&limit=5")
        
        assert response.status_code == 503
        data = response.json()
        
        assert 'error' in data
        assert data['error'] == 'Service unavailable'


def test_recommend_similarity_scores_in_bounds(mock_services):
    """Test that all similarity scores are between 0.0 and 1.0."""
    client = TestClient(app)
    
    response = client.get("/recommend?mood=edge_of_seat&limit=3")
    
    assert response.status_code == 200
    data = response.json()
    
    for rec in data['recommendations']:
        assert 0.0 <= rec['match_score'] <= 1.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
