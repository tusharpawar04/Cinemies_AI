"""Find some popular movies in the database to use for testing personalization."""

from mongodb_connector import MongoDBConnector
from config import MONGODB_CONNECTION_STRING, MONGODB_DATABASE, MONGODB_COLLECTION

# Connect to MongoDB
connector = MongoDBConnector(
    connection_string=MONGODB_CONNECTION_STRING,
    database=MONGODB_DATABASE,
    collection=MONGODB_COLLECTION
)

connector.connect()
movies = connector.fetch_movies()
connector.close()

print(f"Total movies in database: {len(movies)}\n")

# Find some popular action/thriller movies
print("=" * 80)
print("POPULAR ACTION/THRILLER MOVIES (for testing)")
print("=" * 80)

action_keywords = ['action', 'thriller', 'crime', 'mystery']
action_movies = []

for movie in movies:
    genres_lower = [g.lower() for g in movie.get('genres', [])]
    if any(keyword in genres_lower for keyword in action_keywords):
        if movie['vote_average'] >= 6.0:
            action_movies.append(movie)

action_movies.sort(key=lambda x: x['vote_average'], reverse=True)

print("\nTop 10 Action/Thriller movies:")
for i, movie in enumerate(action_movies[:10], 1):
    print(f"{i}. {movie['title'][:50]:50} | ID: {movie['tmdb_id']:8} | Rating: {movie['vote_average']:.1f}")

# Find some popular romantic/drama movies
print("\n" + "=" * 80)
print("POPULAR ROMANTIC/DRAMA MOVIES (for testing)")
print("=" * 80)

romance_keywords = ['romance', 'drama']
romance_movies = []

for movie in movies:
    genres_lower = [g.lower() for g in movie.get('genres', [])]
    if any(keyword in genres_lower for keyword in romance_keywords):
        if movie['vote_average'] >= 6.0:
            romance_movies.append(movie)

romance_movies.sort(key=lambda x: x['vote_average'], reverse=True)

print("\nTop 10 Romance/Drama movies:")
for i, movie in enumerate(romance_movies[:10], 1):
    print(f"{i}. {movie['title'][:50]:50} | ID: {movie['tmdb_id']:8} | Rating: {movie['vote_average']:.1f}")

# Find some popular comedy movies
print("\n" + "=" * 80)
print("POPULAR COMEDY MOVIES (for testing)")
print("=" * 80)

comedy_movies = []

for movie in movies:
    genres_lower = [g.lower() for g in movie.get('genres', [])]
    if 'comedy' in genres_lower:
        if movie['vote_average'] >= 6.0:
            comedy_movies.append(movie)

comedy_movies.sort(key=lambda x: x['vote_average'], reverse=True)

print("\nTop 10 Comedy movies:")
for i, movie in enumerate(comedy_movies[:10], 1):
    print(f"{i}. {movie['title'][:50]:50} | ID: {movie['tmdb_id']:8} | Rating: {movie['vote_average']:.1f}")

print("\n" + "=" * 80)
print("SUGGESTED TEST IDS")
print("=" * 80)
print(f"\nAction/Thriller favorites: {','.join(str(m['tmdb_id']) for m in action_movies[:3])}")
print(f"Romance/Drama favorites: {','.join(str(m['tmdb_id']) for m in romance_movies[:3])}")
print(f"Comedy favorites: {','.join(str(m['tmdb_id']) for m in comedy_movies[:3])}")
