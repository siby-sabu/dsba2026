"""
MongoDB Database Connection
Singleton pattern for MongoDB client
"""

from pymongo import MongoClient
from pymongo.database import Database
from config import settings
import logging

logger = logging.getLogger(__name__)


class MongoDB:
    """MongoDB connection manager"""

    client: MongoClient = None
    db: Database = None

    @classmethod
    def connect(cls):
        """Connect to MongoDB"""
        try:
            cls.client = MongoClient(settings.MONGODB_URI)
            cls.db = cls.client[settings.MONGODB_DB_NAME]

            # Test connection
            cls.client.server_info()
            logger.info(f"✓ Connected to MongoDB: {settings.MONGODB_DB_NAME}")

        except Exception as e:
            logger.error(f"✗ MongoDB connection failed: {str(e)}")
            raise

    @classmethod
    def close(cls):
        """Close MongoDB connection"""
        if cls.client:
            cls.client.close()
            logger.info("MongoDB connection closed")

    @classmethod
    def get_collection(cls, collection_name: str):
        """Get a MongoDB collection"""
        if cls.db is None:
            cls.connect()
        return cls.db[collection_name]


# Convenience function
def get_db() -> Database:
    """Get database instance"""
    if MongoDB.db is None:
        MongoDB.connect()
    return MongoDB.db
