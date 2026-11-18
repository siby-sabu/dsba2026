# ⚡ Quick Deployment Reference

Quick commands for deploying the Agricultural Analytics app to GCP.

## 🔧 Prerequisites

```bash
# Set environment variables
export PROJECT_ID="dsba-2026"
export REGION="us-central1"
export FRONTEND_URL="https://agri-frontend-weju5ycsna-uc.a.run.app"
export BACKEND_URL="https://agri-backend-weju5ycsna-uc.a.run.app"
export MONGODB_URI="mongodb+srv://agri_analytics:PASSWORD@dsba.axklwdl.mongodb.net/agri_analytics"

# Set default project
gcloud config set project $PROJECT_ID
```

## 🚀 Deploy Backend

```bash
# Navigate to PROJECT ROOT (important!)
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026

# Build backend from root (includes data/processed/india_states_simplified.geojson)
gcloud builds submit --config=cloudbuild-backend.yaml .

# Deploy with all env vars (use semicolon ; for CORS!)
gcloud run deploy agri-backend \
  --image gcr.io/$PROJECT_ID/agri-backend:v1 \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --min-instances 0 \
  --timeout 120 \
  --set-env-vars "MONGODB_URI=$MONGODB_URI,MONGODB_DB_NAME=agri_analytics,CORS_ORIGINS=http://localhost:3000;$FRONTEND_URL"

# Get backend URL
export BACKEND_URL=$(gcloud run services describe agri-backend --region $REGION --format 'value(status.url)')
echo "Backend: $BACKEND_URL"
```

## 🎨 Deploy Frontend

```bash
# Stay in PROJECT ROOT (don't cd to frontend!)
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026

# Update frontend/.env.production with backend URL
echo "REACT_APP_API_URL=$BACKEND_URL/api/v1" > frontend/.env.production

# Build frontend from root using cloudbuild-frontend.yaml (MUST pass backend URL!)
gcloud builds submit \
  --config=cloudbuild-frontend.yaml \
  --substitutions=_BACKEND_URL="$BACKEND_URL" \
  .

# Deploy
gcloud run deploy agri-frontend \
  --image gcr.io/$PROJECT_ID/agri-frontend:v1 \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --min-instances 0

# Get frontend URL
export FRONTEND_URL=$(gcloud run services describe agri-frontend --region $REGION --format 'value(status.url)')
echo "Frontend: $FRONTEND_URL"
```

## 🧪 Test Deployment

```bash
# Test backend health
curl $BACKEND_URL/health | jq .

# Test API endpoints
curl $BACKEND_URL/api/v1/states | jq '.states | length'
curl $BACKEND_URL/api/v1/districts | jq '.districts | length'
curl $BACKEND_URL/api/v1/geographic/state-boundaries | jq '.features | length'

# Open frontend in browser
open $FRONTEND_URL  # macOS
```

## 🔄 Update Existing Deployment

### Update Backend Code

```bash
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026

# Rebuild backend
gcloud builds submit --config=cloudbuild-backend.yaml .

# Redeploy (uses existing env vars)
gcloud run deploy agri-backend \
  --image gcr.io/$PROJECT_ID/agri-backend:v1 \
  --region $REGION
```

### Update Frontend Code

```bash
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026

# Rebuild frontend (must pass backend URL)
gcloud builds submit \
  --config=cloudbuild-frontend.yaml \
  --substitutions=_BACKEND_URL="$BACKEND_URL" \
  .

# Redeploy
gcloud run deploy agri-frontend \
  --image gcr.io/$PROJECT_ID/agri-frontend:v1 \
  --region $REGION
```

### Update Environment Variables Only

```bash
# Update backend env vars (use semicolon for CORS!)
gcloud run services update agri-backend \
  --region $REGION \
  --update-env-vars "CORS_ORIGINS=http://localhost:3000;$FRONTEND_URL"

# No env vars to update for frontend (baked into build)
```

## 📊 Monitoring

```bash
# View logs
gcloud logging read "resource.labels.service_name=agri-backend" --limit=50
gcloud logging read "resource.labels.service_name=agri-frontend" --limit=50

# Check service status
gcloud run services list --region=$REGION

# View service details
gcloud run services describe agri-backend --region=$REGION
gcloud run services describe agri-frontend --region=$REGION
```

## 🗑️ Clean Up

```bash
# Delete services
gcloud run services delete agri-backend --region=$REGION --quiet
gcloud run services delete agri-frontend --region=$REGION --quiet

# Delete images
gcloud container images delete gcr.io/$PROJECT_ID/agri-backend:v1 --quiet
gcloud container images delete gcr.io/$PROJECT_ID/agri-frontend:v1 --quiet
```

## ⚠️ Important Notes

1. **Build backend from PROJECT ROOT** (not `src/api`!) - needs access to `data/processed/`
2. **Use semicolon (;) for CORS** - not comma!
3. **Frontend needs .gcloudignore** - or it uploads 400+ MB of node_modules
4. **Backend URL baked at build time** - frontend must rebuild if backend URL changes
5. **All env vars in ONE flag** - comma-separated: `--set-env-vars "A=1,B=2,C=3"`
6. **Frontend build REQUIRES backend URL** - pass via `--substitutions=_BACKEND_URL="..."`
7. **Two ways to set frontend URL**:
   - Via `--substitutions` in build command (recommended)
   - Via `frontend/.env.production` file (alternative)

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| 503 Service Unavailable | Check logs: `gcloud logging read "resource.labels.service_name=agri-backend" --limit=20` |
| CORS Error | Update CORS with semicolon: `--update-env-vars "CORS_ORIGINS=localhost:3000;$FRONTEND_URL"` |
| Build uploads 400+ MB | Create `.gcloudignore` with `node_modules/` |
| ModuleNotFoundError | Build from project root, not `src/api` |
| Frontend can't connect | Rebuild frontend with correct `$BACKEND_URL` in `.env.production` |

## 📚 File Locations

```
dsba2026/
├── .gcloudignore              # Excludes large files from backend build
├── cloudbuild.yaml            # Backend build config (from project root)
├── src/api/
│   ├── Dockerfile             # Backend Dockerfile
│   ├── requirements-api.txt   # Backend dependencies
│   └── *.py                   # Backend code
├── data/processed/
│   └── india_states_simplified.geojson  # Map data (1.1 MB, required!)
└── frontend/
    ├── .gcloudignore          # Excludes node_modules from frontend build
    ├── .env.production        # Backend URL (set before build!)
    ├── Dockerfile             # Frontend Dockerfile
    └── src/                   # Frontend code
```

## 🎯 Full Deployment (from scratch)

```bash
# 1. Set variables
export PROJECT_ID="dsba-2026"
export REGION="us-central1"
export MONGODB_URI="mongodb+srv://agri_analytics:PASSWORD@dsba.axklwdl.mongodb.net/agri_analytics"

# 2. Navigate to project root (all commands run from here!)
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026

# 3. Deploy backend
gcloud builds submit --config=cloudbuild-backend.yaml .
gcloud run deploy agri-backend \
  --image gcr.io/$PROJECT_ID/agri-backend:v1 \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --set-env-vars "MONGODB_URI=$MONGODB_URI,MONGODB_DB_NAME=agri_analytics,CORS_ORIGINS=http://localhost:3000;https://agri-frontend-weju5ycsna-uc.a.run.app"

# 4. Get backend URL
export BACKEND_URL=$(gcloud run services describe agri-backend --region $REGION --format 'value(status.url)')

# 5. Deploy frontend (still from project root!)
echo "REACT_APP_API_URL=$BACKEND_URL/api/v1" > frontend/.env.production
gcloud builds submit \
  --config=cloudbuild-frontend.yaml \
  --substitutions=_BACKEND_URL="$BACKEND_URL" \
  .
gcloud run deploy agri-frontend \
  --image gcr.io/$PROJECT_ID/agri-frontend:v1 \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080

# 6. Test
export FRONTEND_URL=$(gcloud run services describe agri-frontend --region $REGION --format 'value(status.url)')
echo "✅ Backend: $BACKEND_URL"
echo "✅ Frontend: $FRONTEND_URL"
curl $BACKEND_URL/health | jq .
open $FRONTEND_URL
```

**Note:** Everything runs from project root now - no more `cd frontend`!

Done! 🎉
