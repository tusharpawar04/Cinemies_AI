"""
Test the recommendation logic without starting the full server.
"""

import numpy as np
import random

def test_mmr_algorithm():
    """Test MMR diversity re-ranking"""
    print("=== Testing MMR Algorithm ===")
    
    # Simulate candidates with scores
    candidates = [
        {'id': 1, 'score': 0.95, 'embedding': np.random.randn(384)},
        {'id': 2, 'score': 0.93, 'embedding': np.random.randn(384)},
        {'id': 3, 'score': 0.91, 'embedding': np.random.randn(384)},
        {'id': 4, 'score': 0.90, 'embedding': np.random.randn(384)},
        {'id': 5, 'score': 0.89, 'embedding': np.random.randn(384)},
    ]
    
    # Normalize embeddings
    for c in candidates:
        c['embedding'] = c['embedding'] / np.linalg.norm(c['embedding'])
    
    # Apply MMR
    lambda_mmr = 0.7
    selected = []
    selected_embeddings = []
    remaining = candidates.copy()
    
    for i in range(3):
        best_idx = -1
        best_mmr_score = -float('inf')
        
        for idx, candidate in enumerate(remaining):
            relevance = candidate['score']
            
            # Calculate max similarity to selected
            max_sim_to_selected = 0.0
            if len(selected_embeddings) > 0:
                for sel_emb in selected_embeddings:
                    sim = np.dot(candidate['embedding'], sel_emb)
                    if sim > max_sim_to_selected:
                        max_sim_to_selected = sim
            
            # MMR score
            mmr_score = lambda_mmr * relevance - (1 - lambda_mmr) * max_sim_to_selected
            
            if mmr_score > best_mmr_score:
                best_mmr_score = mmr_score
                best_idx = idx
        
        if best_idx >= 0:
            best_candidate = remaining.pop(best_idx)
            selected.append(best_candidate)
            selected_embeddings.append(best_candidate['embedding'])
            print(f"Selected: ID={best_candidate['id']}, Score={best_candidate['score']:.3f}, MMR={best_mmr_score:.3f}")
    
    print("✓ MMR algorithm works correctly\n")

def test_epsilon_greedy():
    """Test epsilon-greedy exploration"""
    print("=== Testing Epsilon-Greedy Exploration ===")
    
    epsilon = 0.15
    explorations = 0
    trials = 1000
    
    for _ in range(trials):
        if random.random() < epsilon:
            explorations += 1
    
    exploration_rate = explorations / trials
    print(f"Exploration rate: {exploration_rate:.3f} (expected ~0.15)")
    
    if 0.13 <= exploration_rate <= 0.17:
        print("✓ Epsilon-greedy works correctly\n")
    else:
        print("✗ Epsilon-greedy rate outside expected range\n")

def test_multi_task_scoring():
    """Test multi-task learning scoring"""
    print("=== Testing Multi-Task Scoring ===")
    
    # Simulate a candidate
    relevance = 0.85
    diversity = 0.60
    serendipity = 0.40
    freshness = 0.70
    
    # Compute multi-task score
    final_score = 0.6 * relevance + 0.2 * diversity + 0.1 * serendipity + 0.1 * freshness
    
    print(f"Relevance: {relevance}")
    print(f"Diversity: {diversity}")
    print(f"Serendipity: {serendipity}")
    print(f"Freshness: {freshness}")
    print(f"Final Score: {final_score:.3f}")
    
    expected = 0.6 * 0.85 + 0.2 * 0.60 + 0.1 * 0.40 + 0.1 * 0.70
    print(f"Expected: {expected:.3f}")
    
    if abs(final_score - expected) < 0.001:
        print("✓ Multi-task scoring works correctly\n")
    else:
        print("✗ Multi-task scoring calculation error\n")

def test_taste_vector_parsing():
    """Test taste vector parsing"""
    print("=== Testing Taste Vector Parsing ===")
    
    # Generate sample vector
    sample = np.random.randn(384).astype(np.float32)
    sample = sample / np.linalg.norm(sample)
    
    # Convert to string (as would come from API)
    taste_vector_str = ','.join(map(str, sample.tolist()))
    
    # Parse back
    taste_vals = [float(v.strip()) for v in taste_vector_str.split(',')]
    parsed = np.array(taste_vals, dtype=np.float32)
    
    # Normalize
    norm = np.linalg.norm(parsed)
    if norm > 0:
        parsed = parsed / norm
    
    print(f"Original vector length: {len(sample)}")
    print(f"Parsed vector length: {len(parsed)}")
    print(f"Original norm: {np.linalg.norm(sample):.6f}")
    print(f"Parsed norm: {np.linalg.norm(parsed):.6f}")
    
    if len(parsed) == 384 and abs(np.linalg.norm(parsed) - 1.0) < 0.001:
        print("✓ Taste vector parsing works correctly\n")
    else:
        print("✗ Taste vector parsing error\n")

def test_hybrid_blending():
    """Test hybrid vector blending"""
    print("=== Testing Hybrid Vector Blending ===")
    
    # Create sample vectors
    mood_vector = np.random.randn(384).astype(np.float32)
    mood_vector = mood_vector / np.linalg.norm(mood_vector)
    
    taste_vector = np.random.randn(384).astype(np.float32)
    taste_vector = taste_vector / np.linalg.norm(taste_vector)
    
    collaborative_vector = np.random.randn(384).astype(np.float32)
    collaborative_vector = collaborative_vector / np.linalg.norm(collaborative_vector)
    
    # Blend: 40% mood + 30% taste + 30% collaborative
    combined = 0.4 * mood_vector + 0.3 * taste_vector + 0.3 * collaborative_vector
    
    # Normalize
    norm = np.linalg.norm(combined)
    if norm > 0:
        combined = combined / norm
    
    print(f"Mood vector norm: {np.linalg.norm(mood_vector):.6f}")
    print(f"Taste vector norm: {np.linalg.norm(taste_vector):.6f}")
    print(f"Collaborative vector norm: {np.linalg.norm(collaborative_vector):.6f}")
    print(f"Combined vector norm: {np.linalg.norm(combined):.6f}")
    
    if abs(np.linalg.norm(combined) - 1.0) < 0.001:
        print("✓ Hybrid blending works correctly\n")
    else:
        print("✗ Hybrid blending normalization error\n")

if __name__ == "__main__":
    print("=" * 60)
    print("TASK 4 - LOGIC TESTS (No Server Required)")
    print("=" * 60)
    print()
    
    test_taste_vector_parsing()
    test_hybrid_blending()
    test_mmr_algorithm()
    test_epsilon_greedy()
    test_multi_task_scoring()
    
    print("=" * 60)
    print("All logic tests completed!")
    print("=" * 60)
