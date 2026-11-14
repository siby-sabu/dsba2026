"""
FastAPI Main Application
Agricultural Analytics Web API
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from config import settings
from database import MongoDB
from routers import districts, states, geographic, insights

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting Agricultural Analytics API...")
    MongoDB.connect()
    yield
    # Shutdown
    logger.info("Shutting down Agricultural Analytics API...")
    MongoDB.close()


# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware (allow local React dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Root endpoint
@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "running",
        "docs": "/docs",
    }


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check MongoDB connection
        if MongoDB.db is None:
            MongoDB.connect()
        MongoDB.db.command("ping")
        return {
            "status": "healthy",
            "database": "connected",
            "collections": {
                "districts": MongoDB.db['districts'].count_documents({}),
                "seasonal_crop_data": MongoDB.db['seasonal_crop_data'].count_documents({}),
                "monthly_climate": MongoDB.db['monthly_climate'].count_documents({})
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }


# Include routers
app.include_router(districts.router, prefix=settings.API_V1_PREFIX, tags=["Districts"])
app.include_router(states.router, prefix=settings.API_V1_PREFIX, tags=["States"])
app.include_router(geographic.router, prefix=f"{settings.API_V1_PREFIX}/geographic", tags=["Geographic"])
app.include_router(insights.router, prefix=settings.API_V1_PREFIX, tags=["Insights"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
