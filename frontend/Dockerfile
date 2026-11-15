# Multi-stage build for React frontend

# Stage 1: Build
FROM node:18-alpine AS builder

# Build argument for API URL (MUST be provided at build time)
# Pass via: --build-arg REACT_APP_API_URL=https://your-backend-url/api/v1
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

WORKDIR /app

# Copy package files
# When building from project root, copy from frontend/
COPY frontend/package*.json ./

# Install ALL dependencies (needed for build)
# Using npm install instead of npm ci to handle lock file sync issues
RUN npm install

# Copy source code and configuration files
# When building from project root, copy from frontend/
COPY frontend/src/ ./src/
COPY frontend/public/ ./public/

# Note: .env.production not needed - REACT_APP_API_URL is set via build arg above

# Build app (production mode) - env vars baked into the build
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy custom nginx config
# When building from project root, copy from frontend/
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port 8080 (Cloud Run requirement)
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
