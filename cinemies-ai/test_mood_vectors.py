"""Unit tests for MoodVectorSystem."""

import numpy as np
from embedding_service import EmbeddingService
from mood_vectors import MoodVectorSystem


def test_mood_vector_initialization():
    """Test that MoodVectorSystem initializes with all 8 moods."""
    embedding_service = EmbeddingService()
    mood_system = MoodVectorSystem(embedding_service)
    
    # Verify all 8 moods are available
    available_moods = mood_system.get_available_moods()
    assert len(available_moods) == 8
    
    expected_moods = [
        "mind_bending", "comfort_food", "visual_spectacle", "cathartic_cry",
        "hidden_gem", "laugh_out_loud", "edge_of_seat", "feel_inspired"
    ]
    assert set(available_moods) == set(expected_moods)
    print("✓ All 8 moods are available")


def test_get_mood_vector_valid():
    """Test retrieving valid mood vectors."""
    embedding_service = EmbeddingService()
    mood_system = MoodVectorSystem(embedding_service)
    
    # Test each mood
    for mood_name in mood_system.get_available_moods():
        mood_vector = mood_system.get_mood_vector(mood_name)
        
        # Verify vector is not None
        assert mood_vector is not None, f"Mood vector for {mood_name} should not be None"
        
        # Verify vector shape is (384,)
        assert mood_vector.shape == (384,), f"Mood vector for {mood_name} should have shape (384,)"
        
        # Verify vector is normalized (L2 norm = 1.0)
        norm = np.linalg.norm(mood_vector)
        assert abs(norm - 1.0) < 1e-6, f"Mood vector for {mood_name} should be normalized"
        
        print(f"✓ Mood '{mood_name}' has valid normalized vector")


def test_get_mood_vector_invalid():
    """Test retrieving invalid mood returns None."""
    embedding_service = EmbeddingService()
    mood_system = MoodVectorSystem(embedding_service)
    
    # Test invalid mood names
    invalid_moods = ["invalid_mood", "nonexistent", ""]
    for invalid_mood in invalid_moods:
        mood_vector = mood_system.get_mood_vector(invalid_mood)
        assert mood_vector is None, f"Invalid mood '{invalid_mood}' should return None"
    
    print("✓ Invalid mood names return None")


def test_mood_descriptions_exist():
    """Test that all moods have descriptive text."""
    for mood_name, description in MoodVectorSystem.MOOD_DESCRIPTIONS.items():
        assert isinstance(description, str), f"Description for {mood_name} should be a string"
        assert len(description) > 0, f"Description for {mood_name} should not be empty"
        assert len(description) > 20, f"Description for {mood_name} should be descriptive (>20 chars)"
    
    print("✓ All moods have descriptive text")


def test_mood_vector_determinism():
    """Test that mood vectors are deterministic across instances."""
    embedding_service1 = EmbeddingService()
    mood_system1 = MoodVectorSystem(embedding_service1)
    
    embedding_service2 = EmbeddingService()
    mood_system2 = MoodVectorSystem(embedding_service2)
    
    # Compare vectors from both instances
    for mood_name in mood_system1.get_available_moods():
        vector1 = mood_system1.get_mood_vector(mood_name)
        vector2 = mood_system2.get_mood_vector(mood_name)
        
        # Vectors should be identical
        assert np.allclose(vector1, vector2), f"Mood vector for {mood_name} should be deterministic"
    
    print("✓ Mood vectors are deterministic across instances")


if __name__ == "__main__":
    print("Running MoodVectorSystem tests...\n")
    
    test_mood_vector_initialization()
    test_get_mood_vector_valid()
    test_get_mood_vector_invalid()
    test_mood_descriptions_exist()
    test_mood_vector_determinism()
    
    print("\n✅ All tests passed!")
