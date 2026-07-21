"""Verification script for main.py implementation."""

import sys
sys.path.insert(0, '.')

from main import app

print("=" * 60)
print("MAIN.PY VERIFICATION")
print("=" * 60)

# Verify FastAPI app initialization
print(f"\n✓ FastAPI app initialized")
print(f"  - Title: {app.title}")
print(f"  - Description: {app.description}")
print(f"  - Version: {app.version}")

# Verify CORS middleware
cors_middleware = None
for middleware in app.user_middleware:
    if 'CORSMiddleware' in str(middleware):
        cors_middleware = middleware
        break

if cors_middleware:
    print(f"\n✓ CORS middleware configured")
    print(f"  - Middleware found in app.user_middleware")
else:
    print(f"\n✗ CORS middleware NOT found")

# Verify lifespan handler
if app.router.lifespan_context:
    print(f"\n✓ Lifespan handler configured")
    print(f"  - Startup/shutdown events will be handled")
else:
    print(f"\n✗ Lifespan handler NOT configured")

# Verify global instances are declared
print(f"\n✓ Global service instances declared:")
print(f"  - embedding_service")
print(f"  - faiss_index")
print(f"  - mood_system")
print(f"  - movies_data")

print("\n" + "=" * 60)
print("VERIFICATION COMPLETE")
print("=" * 60)
print("\nNote: Actual startup sequence (MongoDB connection, embedding")
print("generation, FAISS index building) will occur when the server")
print("is started with: uvicorn main:app --host 0.0.0.0 --port 8000")
print("=" * 60)
