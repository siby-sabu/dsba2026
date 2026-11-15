# 🚀 Quick Deploy to GCP - 30 Minutes

## Prerequisites (5 min)

```bash
# Install gcloud CLI (macOS)
brew install google-cloud-sdk
gcloud init

# Install Docker
brew install --cask docker

# Verify
gcloud --version
docker --version
```

## Step 1: MongoDB Atlas (5 min)

1. Go to https://www.mongodb.com/cloud/atlas → Sign up (FREE tier)
2. Create cluster: **M0 Free**, Provider: **Google Cloud**, Region: **us-east1**
3. Create user: `agri_admin` with password
4. Network Access: Allow **0.0.0.0/0** (all IPs)
5. Get connection string:
   ```
   mongodb+srv://agri_admin:PASSWORD@cluster.xxxxx.mongodb.net/agri_analytics
   ```
6. Migrate data:
   ```bash
   mongodump --db agri_analytics --out ./mongodb_backup
   mongorestore --uri "mongodb+srv://..." --db agri_analytics ./backup/agri_analytics
   ```

## Step 2: GCP Setup (5 min)

```bash
# Create project
export PROJECT_ID="dsba-2026"
gcloud projects create $PROJECT_ID
gcloud config set project $PROJECT_ID

# Link billing (REQUIRED)
gcloud billing accounts list
gcloud billing projects link $PROJECT_ID --billing-account=XXXXXX-XXXXXX-XXXXXX

# Enable APIs
gcloud services enable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com

# Set region
export REGION="us-central1"
```

## Step 3: Deploy Backend (10 min)

```bash
# Navigate to PROJECT ROOT (important!)
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026

# Build backend from root (includes map data)
gcloud builds submit --config=cloudbuild-backend.yaml .

# Deploy (use semicolon for CORS!)
gcloud run deploy agri-backend \
  --image gcr.io/$PROJECT_ID/agri-backend:v1 \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --min-instances 0 \
  --set-env-vars "MONGODB_URI=mongodb+srv://agri_admin:PASSWORD@cluster.xxxxx.mongodb.net/agri_analytics,MONGODB_DB_NAME=agri_analytics,CORS_ORIGINS=http://localhost:3000;https://agri-frontend-weju5ycsna-uc.a.run.app"

# Get backend URL
export BACKEND_URL=$(gcloud run services describe agri-backend --region $REGION --format 'value(status.url)')
echo "Backend: $BACKEND_URL"

# Test
curl $BACKEND_URL/health | jq .
curl $BACKEND_URL/api/v1/states | jq '.states | length'
```

**Important:**
- Build from **project root**, not `src/api`
- Use **semicolon (;)** for multiple CORS origins
- All env vars in **ONE** `--set-env-vars` flag

## Step 4: Deploy Frontend (10 min)

```bash
# Still in project root
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026

# Set backend URL in frontend/.env.production
echo "REACT_APP_API_URL=$BACKEND_URL/api/v1" > frontend/.env.production

# Build frontend from project root using cloudbuild-frontend.yaml
# MUST provide backend URL
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

# Update CORS (if needed)
gcloud run services update agri-backend --region $REGION --update-env-vars "CORS_ORIGINS=http://localhost:3000;$FRONTEND_URL"
```

**Note:** Both backend and frontend now build from project root for consistency!

## Step 5: Test

```bash
# Open in browser
open $FRONTEND_URL

# Or visit manually
echo "🌐 Frontend: $FRONTEND_URL"
echo "📡 Backend: $BACKEND_URL"
echo "📖 API Docs: $BACKEND_URL/docs"
```

## Done! 🎉

Your app is live at: **$FRONTEND_URL**

Cost: ~$11-17 for 1-2 weeks

---

**Full guide:** See [`GCP_DEPLOYMENT_GUIDE.md`](GCP_DEPLOYMENT_GUIDE.md)
