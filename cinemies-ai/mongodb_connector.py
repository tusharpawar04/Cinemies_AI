"""MongoDB connector for retrieving movie documents."""

import logging
from typing import List, Dict, Any, Optional
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

logger = logging.getLogger(__name__)


class MongoDBConnector:
    """Handles MongoDB connection and movie retrieval."""
    
    def __init__(self, connection_string: str, database: str, collection: str):
        """
        Initialize MongoDB connection parameters.
        
        Args:
            connection_string: MongoDB connection URI
            database: Database name
            collection: Collection name
        """
        self.connection_string = connection_string
        self.database_name = database
        self.collection_name = collection
        self.client: Optional[MongoClient] = None
        self.db = None
        self.collection = None
    
    def connect(self) -> None:
        """
        Establish connection to MongoDB.
        
        Raises:
            ConnectionFailure: If connection to MongoDB fails
            ServerSelectionTimeoutError: If server selection times out
        """
        try:
            self.client = MongoClient(
                self.connection_string,
                serverSelectionTimeoutMS=5000
            )
            # Test the connection
            self.client.admin.command('ping')
            
            self.db = self.client[self.database_name]
            self.collection = self.db[self.collection_name]
            
            logger.info(
                f"Successfully connected to MongoDB: {self.database_name}.{self.collection_name}"
            )
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            error_msg = f"Failed to connect to MongoDB at {self.connection_string}: {str(e)}"
            logger.error(error_msg)
            raise ConnectionFailure(error_msg)
    
    def fetch_movies(self) -> List[Dict[str, Any]]:
        """
        Retrieve all movie documents from MongoDB.
        
        Filters out documents missing required fields (title or overview).
        
        Returns:
            List of movie dictionaries with fields:
            - title (str): Movie title
            - overview (str): Plot description
            - tmdb_id (int): The Movie Database ID
            - poster_url (str): URL to poster image
            - vote_average (float): Rating score
            - genres (List[str]): List of genre names
        
        Raises:
            RuntimeError: If not connected to MongoDB
        """
        if self.collection is None:
            raise RuntimeError("Not connected to MongoDB. Call connect() first.")
        
        movies = []
        skipped_count = 0
        
        try:
            # Fetch all documents from the collection
            cursor = self.collection.find({})
            
            for doc in cursor:
                # Check for required fields
                if not doc.get('title') or not doc.get('overview'):
                    skipped_count += 1
                    logger.warning(
                        f"Skipping document with _id={doc.get('_id')}: "
                        f"missing required field (title or overview)"
                    )
                    continue
                
                # Extract required fields
                movie = {
                    'title': doc.get('title', ''),
                    'overview': doc.get('overview', ''),
                    'tmdb_id': doc.get('tmdb_id', 0),
                    'poster_url': doc.get('poster_url', ''),
                    'vote_average': doc.get('vote_average', 0.0),
                    'genres': doc.get('genres', []),
                    'year': doc.get('year'),
                    'vote_count': doc.get('vote_count', 0),
                    'industry': doc.get('industry', 'hollywood'),
                    'popularity': doc.get('popularity', 0.0),
                    'release_date': doc.get('release_date', ''),
                }
                
                movies.append(movie)
            
            logger.info(
                f"Retrieved {len(movies)} valid movies from MongoDB "
                f"(skipped {skipped_count} documents with missing fields)"
            )
            
            return movies
            
        except Exception as e:
            error_msg = f"Error fetching movies from MongoDB: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
    
    def close(self) -> None:
        """Close MongoDB connection."""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")
            self.client = None
            self.db = None
            self.collection = None
