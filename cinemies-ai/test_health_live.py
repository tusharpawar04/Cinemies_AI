"""Live test for /health endpoint with actual server startup."""

import requests
import time
import subprocess
import sys
import signal
import os


def test_health_endpoint_live():
    """Test /health endpoint with actual server running."""
    print("\n" + "="*70)
    print("CINEMIES AI - LIVE /health ENDPOINT TEST")
    print("="*70)
    
    server_process = None
    
    try:
        # Start the FastAPI server
        print("\n[1/4] Starting FastAPI server...")
        print("  Command: uvicorn main:app --host 0.0.0.0 --port 8000")
        
        server_process = subprocess.Popen(
            ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        print("  ✓ Server process started")
        
        # Wait for server to initialize (this takes time due to MongoDB and embeddings)
        print("\n[2/4] Waiting for server to initialize...")
        print("  (This may take 30-60 seconds due to MongoDB connection and embedding generation)")
        
        max_wait = 120  # 2 minutes max wait
        wait_interval = 5
        elapsed = 0
        
        while elapsed < max_wait:
            try:
                response = requests.get("http://localhost:8000/health", timeout=5)
                if response.status_code in [200, 503]:
                    print(f"  ✓ Server is responding (after {elapsed} seconds)")
                    break
            except requests.exceptions.RequestException:
                pass
            
            time.sleep(wait_interval)
            elapsed += wait_interval
            print(f"  ... waiting ({elapsed}s elapsed)")
        
        if elapsed >= max_wait:
            print("  ✗ Server did not respond within timeout")
            return False
        
        # Test the /health endpoint
        print("\n[3/4] Testing /health endpoint...")
        response = requests.get("http://localhost:8000/health")
        
        print(f"\n  Status Code: {response.status_code}")
        print(f"  Response Body:")
        
        data = response.json()
        for key, value in data.items():
            if key == "available_moods":
                print(f"    {key}: {value}")
            else:
                print(f"    {key}: {value}")
        
        # Verify response
        print("\n[4/4] Verifying response...")
        
        if response.status_code == 200:
            assert data["status"] == "healthy", f"Expected status='healthy', got '{data['status']}'"
            assert data["indexed_movies"] > 0, f"Expected indexed_movies > 0, got {data['indexed_movies']}"
            assert len(data["available_moods"]) == 8, f"Expected 8 moods, got {len(data['available_moods'])}"
            
            print("  ✓ Status code: 200 OK")
            print("  ✓ Status: healthy")
            print(f"  ✓ Indexed movies: {data['indexed_movies']}")
            print(f"  ✓ Available moods: {len(data['available_moods'])}")
            print(f"  ✓ Moods: {', '.join(data['available_moods'])}")
            
            print("\n" + "="*70)
            print("SUCCESS: /health endpoint is working correctly!")
            print("="*70)
            return True
            
        elif response.status_code == 503:
            print("  ⚠ Server returned 503 (unhealthy)")
            print("  This means the FAISS index is not initialized yet")
            print("  Check server logs for errors")
            return False
        else:
            print(f"  ✗ Unexpected status code: {response.status_code}")
            return False
        
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # Stop the server
        if server_process:
            print("\n" + "="*70)
            print("Stopping server...")
            server_process.terminate()
            try:
                server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server_process.kill()
            print("Server stopped.")


if __name__ == "__main__":
    success = test_health_endpoint_live()
    sys.exit(0 if success else 1)
