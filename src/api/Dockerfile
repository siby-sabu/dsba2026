# Backend Dockerfile for Google Cloud Run
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Prevent debconf warnings during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for better caching)
# When building from project root, requirements is at root level
COPY requirements-api.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements-api.txt

# Copy API application code from src/api directory
# (Build context is project root, so copy from src/api/)
# This copies everything including models/, routers/, utils/ subdirectories
COPY src/api/ ./

# Create data directory at FILESYSTEM ROOT (not /app/data) and copy GeoJSON file
# geographic.py looks for file at: /data/processed/india_states_simplified.geojson
# (Build context is project root, so copy from data/processed/)
RUN mkdir -p /data/processed
COPY data/processed/india_states_simplified.geojson /data/processed/india_states_simplified.geojson

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Run with gunicorn for production
CMD exec gunicorn main:app \
    --workers 2 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8080 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
