"""
FastAPI Configuration
Environment variables and settings for local/production deployment
"""

import os
from typing import List


class Settings:
    """Application settings"""

    # MongoDB Configuration
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "agri_analytics")

    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Agricultural Analytics API"
    VERSION: str = "1.0.0"

    # CORS Configuration (for local React dev server)
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",  # React dev server
        "http://localhost:8000",  # Local API docs
    ]

    # Pagination defaults
    DEFAULT_PAGE_SIZE: int = 100
    MAX_PAGE_SIZE: int = 1000


# Global settings instance
settings = Settings()
