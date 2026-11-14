# 🚀 GCP Deployment Guide - Agricultural Analytics

Complete guide to deploy your app to Google Cloud Platform (GCP).

## 📋 Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│  USER BROWSER                                         │
│  https://agri-frontend-xyz.run.app                   │
└────────────────────┬─────────────────────────────────┘
                     │
        ┌────────────▼────────────┐
        │  Cloud Run (Frontend)   │
        │  React + Nginx          │
        │  Port 8080              │
        └────────────┬────────────┘
                     │ REST API
        ┌────────────▼────────────┐
        │  Cloud Run (Backend)    │
        │  FastAPI + Gunicorn     │
        │  Port 8080              │
        └────────────┬────────────┘
                     │ MongoDB
        ┌────────────▼────────────┐
        │  MongoDB Atlas          │
        │  Free Tier (512MB)      │
        │  Cloud-hosted           │
        └─────────────────────────┘
```

## 💰 Cost Estimate

| Service | Tier | Cost (1-2 weeks) |
|---------|------|------------------|
| **Cloud Run (Backend)** | Free tier + overage | $8-12 |
| **Cloud Run (Frontend)** | Free tier | $3-5 |
| **MongoDB Atlas** | Free tier (M0) | $0 |
| **Container Registry** | Free tier | $0 |
| **Total** | | **$11-17** |

## 📦 Prerequisites

### 1. Install Google Cloud CLI

**macOS:**
```bash
# Install gcloud CLI
brew install google-cloud-sdk

# Initialize
gcloud init
```

**Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

**Windows:**
- Download installer from: https://cloud.google.com/sdk/docs/install

### 2. Install Docker

**macOS:**
```bash
brew install --cask docker
# Or download Docker Desktop from docker.com
```

**Verify installations:**
```bash
gcloud --version
docker --version
```

## 🗄️ Step 1: MongoDB Atlas Setup (5 minutes)

### 1.1 Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Start Free" → Sign up with Google
3. Choose **FREE** tier (M0 Sandbox)
4. Select **Google Cloud** as provider
5. Choose region: **us-east1** (or closest to you)
6. Cluster name: `agri-analytics-cluster`

### 1.2 Create Database User

1. Click **Database Access** (left sidebar)
2. Click **Add New Database User**
3. Authentication: Username/Password
   - Username: `agri_admin`
   - Password: `[Generate Secure Password]` → Save this!
4. Database User Privileges: **Read and write to any database**
5. Click **Add User**

### 1.3 Whitelist IP Addresses

1. Click **Network Access** (left sidebar)
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (0.0.0.0/0)
   - ⚠️ For production, restrict to Cloud Run IPs
4. Click **Confirm**

### 1.4 Get Connection String

1. Click **Database** (left sidebar)
2. Click **Connect** on your cluster
3. Choose **Connect your application**
4. Driver: **Python**, Version: **3.12 or later**
5. Copy connection string:
   ```
   mongodb+srv://agri_admin:<password>@agri-analytics-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. **Replace `<password>`** with your actual password
7. Save this connection string → You'll need it for Cloud Run!

### 1.5 Migrate Data to Atlas

From your local machine:

```bash
# Export from local MongoDB
mongodump --db agri_analytics --out ./mongo_backup

# Import to Atlas (replace with YOUR connection string)
mongorestore \
  --uri "mongodb+srv://agri_admin:YOUR_PASSWORD@agri-analytics-cluster.xxxxx.mongodb.net/agri_analytics" \
  --db agri_analytics \
  ./mongo_backup/agri_analytics

# Verify migration
mongosh "mongodb+srv://agri_admin:YOUR_PASSWORD@agri-analytics-cluster.xxxxx.mongodb.net/agri_analytics" \
  --eval "db.districts.countDocuments({})"
# Should output: 515
```

**Expected data:**
- `districts`: ~515 documents
- `seasonal_crop_data`: ~100K documents
- `monthly_climate`: ~55K documents

## ☁️ Step 2: GCP Project Setup (3 minutes)

### 2.1 Create GCP Project

```bash
# Set project name
export PROJECT_ID="agri-analytics-$(date +%s)"
echo "Project ID: $PROJECT_ID"

# Create project
gcloud projects create $PROJECT_ID --name="Agricultural Analytics"

# Set as default project
gcloud config set project $PROJECT_ID

# Link billing account (REQUIRED for Cloud Run)
# List billing accounts
gcloud billing accounts list

# Link billing (replace with your account ID)
gcloud billing projects link $PROJECT_ID \
  --billing-account=XXXXXX-XXXXXX-XXXXXX
```

### 2.2 Enable Required APIs

```bash
# Enable Cloud Run, Container Registry, Cloud Build
gcloud services enable \
  run.googleapis.com \
  containerregistry.googleapis.com \
  cloudbuild.googleapis.com

# Verify APIs are enabled
gcloud services list --enabled
```

## 🐳 Step 3: Deploy Backend to Cloud Run (10 minutes)

### 3.1 Build and Push Docker Image

```bash
# Navigate to backend directory
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026/src/api

# Set region
export REGION="us-central1"

# Build image (uses Dockerfile)
gcloud builds submit \
  --tag gcr.io/$PROJECT_ID/agri-backend:v1 \
  .

# Verify image
gcloud container images list
```

### 3.2 Deploy to Cloud Run

```bash
# Deploy backend service
gcloud run deploy agri-backend \
  --image gcr.io/$PROJECT_ID/agri-backend:v1 \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 120 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "MONGODB_URI=mongodb+srv://agri_admin:YOUR_PASSWORD@agri-analytics-cluster.xxxxx.mongodb.net/agri_analytics" \
  --set-env-vars "MONGODB_DB_NAME=agri_analytics" \
  --set-env-vars "CORS_ORIGINS=*"

# Get backend URL
export BACKEND_URL=$(gcloud run services describe agri-backend \
  --region $REGION \
  --format 'value(status.url)')

echo "✅ Backend deployed at: $BACKEND_URL"
```

**Important:** Replace the MongoDB URI with YOUR actual connection string!

### 3.3 Test Backend

```bash
# Test health endpoint
curl $BACKEND_URL/health

# Test state boundaries endpoint
curl $BACKEND_URL/api/v1/geographic/state-boundaries | jq '.features | length'
# Should return: 33

# Test states endpoint
curl $BACKEND_URL/api/v1/states | jq '.states | length'
```

## 🎨 Step 4: Deploy Frontend to Cloud Run (10 minutes)

### 4.1 Update Frontend Environment

```bash
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026/frontend

# Create production environment file
cat > .env.production << EOF
REACT_APP_API_URL=$BACKEND_URL/api/v1
EOF

# Verify
cat .env.production
```

### 4.2 Build and Push Frontend Image

```bash
# Build image
gcloud builds submit \
  --tag gcr.io/$PROJECT_ID/agri-frontend:v1 \
  .

# Verify image
gcloud container images list
```

### 4.3 Deploy Frontend to Cloud Run

```bash
# Deploy frontend service
gcloud run deploy agri-frontend \
  --image gcr.io/$PROJECT_ID/agri-frontend:v1 \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5

# Get frontend URL
export FRONTEND_URL=$(gcloud run services describe agri-frontend \
  --region $REGION \
  --format 'value(status.url)')

echo "✅ Frontend deployed at: $FRONTEND_URL"
```

### 4.4 Update CORS on Backend

```bash
# Redeploy backend with correct CORS origin
gcloud run services update agri-backend \
  --region $REGION \
  --update-env-vars "CORS_ORIGINS=$FRONTEND_URL"

echo "✅ CORS updated to allow: $FRONTEND_URL"
```

## 🧪 Step 5: Test Deployment (5 minutes)

### 5.1 Backend Tests

```bash
echo "Testing Backend: $BACKEND_URL"

# Health check
curl $BACKEND_URL/health | jq .

# Get states
curl $BACKEND_URL/api/v1/states | jq '.states | length'

# Get districts
curl $BACKEND_URL/api/v1/districts | jq '.districts | length'

# Get state boundaries
curl $BACKEND_URL/api/v1/geographic/state-boundaries | jq '.type'
```

### 5.2 Frontend Test

```bash
echo "🌐 Open in browser: $FRONTEND_URL"

# Or open automatically
open $FRONTEND_URL  # macOS
# xdg-open $FRONTEND_URL  # Linux
```

**Manual testing:**
1. Open frontend URL in browser
2. Should see India map with state boundaries
3. Click on a state → State dialog should open
4. Click on district → District details should show
5. Check browser console for errors

### 5.3 Load Testing (Optional)

```bash
# Install Apache Bench
brew install httpd  # macOS

# Test backend (100 requests, 10 concurrent)
ab -n 100 -c 10 $BACKEND_URL/api/v1/states

# Check response times
# Target: <500ms average
```

## 📊 Step 6: Monitoring & Logs (Ongoing)

### View Logs

```bash
# Backend logs (last 50 lines)
gcloud run services logs read agri-backend \
  --region $REGION \
  --limit 50

# Frontend logs
gcloud run services logs read agri-frontend \
  --region $REGION \
  --limit 50

# Follow logs in real-time
gcloud run services logs tail agri-backend \
  --region $REGION
```

### Cloud Console Monitoring

1. Go to: https://console.cloud.google.com/run
2. Click on service name → **Metrics** tab
3. Monitor:
   - Request count
   - Request latency (p95)
   - Error rate
   - Memory/CPU usage

### Set Up Billing Alerts

```bash
# Create budget alert at $25
gcloud billing budgets create \
  --billing-account=$(gcloud billing accounts list --format="value(name)" | head -1) \
  --display-name="Agricultural Analytics Budget" \
  --budget-amount=25USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

## 🔄 Step 7: Update Deployment (When you make changes)

### Update Backend

```bash
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026/src/api

# Build new version
gcloud builds submit \
  --tag gcr.io/$PROJECT_ID/agri-backend:v2 \
  .

# Deploy update
gcloud run deploy agri-backend \
  --image gcr.io/$PROJECT_ID/agri-backend:v2 \
  --region $REGION

# Traffic automatically switches to new version
```

### Update Frontend

```bash
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026/frontend

# Build new version
gcloud builds submit \
  --tag gcr.io/$PROJECT_ID/agri-frontend:v2 \
  .

# Deploy update
gcloud run deploy agri-frontend \
  --image gcr.io/$PROJECT_ID/agri-frontend:v2 \
  --region $REGION
```

## 🗑️ Step 8: Cleanup (After demo)

```bash
# Delete Cloud Run services
gcloud run services delete agri-backend --region $REGION --quiet
gcloud run services delete agri-frontend --region $REGION --quiet

# Delete container images
gcloud container images delete gcr.io/$PROJECT_ID/agri-backend:v1 --quiet
gcloud container images delete gcr.io/$PROJECT_ID/agri-frontend:v1 --quiet

# Delete entire project (CAREFUL!)
gcloud projects delete $PROJECT_ID --quiet
```

**MongoDB Atlas:**
1. Go to https://cloud.mongodb.com
2. Clusters → Click **...** → **Terminate**
3. (Optional) Keep free tier for future use

## 🔧 Troubleshooting

### Issue 1: Backend 404 errors

**Check:**
```bash
# View logs
gcloud run services logs read agri-backend --region $REGION --limit 100

# Verify MongoDB connection
curl $BACKEND_URL/health
```

**Fix:** Update MongoDB URI environment variable
```bash
gcloud run services update agri-backend \
  --region $REGION \
  --update-env-vars "MONGODB_URI=mongodb+srv://..."
```

### Issue 2: CORS errors in browser

**Symptom:** Frontend can't connect to backend

**Fix:**
```bash
# Update CORS to allow frontend
gcloud run services update agri-backend \
  --region $REGION \
  --update-env-vars "CORS_ORIGINS=$FRONTEND_URL"
```

### Issue 3: Frontend shows blank page

**Check:**
```bash
# View frontend logs
gcloud run services logs read agri-frontend --region $REGION --limit 50

# Check nginx config
gcloud run services describe agri-frontend --region $REGION
```

**Fix:** Verify `.env.production` has correct backend URL, rebuild:
```bash
gcloud builds submit --tag gcr.io/$PROJECT_ID/agri-frontend:v2 .
gcloud run deploy agri-frontend --image gcr.io/$PROJECT_ID/agri-frontend:v2 --region $REGION
```

### Issue 4: Billing not enabled

**Error:** `Cloud Run requires billing to be enabled`

**Fix:**
```bash
# List billing accounts
gcloud billing accounts list

# Link billing account
gcloud billing projects link $PROJECT_ID \
  --billing-account=YOUR_BILLING_ACCOUNT_ID
```

### Issue 5: Out of memory errors

**Symptom:** Service crashes or restarts

**Fix:** Increase memory allocation
```bash
gcloud run services update agri-backend \
  --region $REGION \
  --memory 1Gi
```

## 📝 Environment Variables Reference

### Backend (Cloud Run)

| Variable | Value | Description |
|----------|-------|-------------|
| `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | `agri_analytics` | Database name |
| `CORS_ORIGINS` | `https://agri-frontend-xyz.run.app` | Allowed frontend origins |

### Frontend (.env.production)

| Variable | Value | Description |
|----------|-------|-------------|
| `REACT_APP_API_URL` | `https://agri-backend-xyz.run.app/api/v1` | Backend API base URL |

## 🎯 Deployment Checklist

**Before deploying:**
- [ ] MongoDB Atlas cluster created and populated
- [ ] GCP project created with billing enabled
- [ ] APIs enabled (Cloud Run, Container Registry, Cloud Build)
- [ ] Dockerfiles created
- [ ] Environment variables prepared

**Backend deployment:**
- [ ] Backend Docker image built and pushed
- [ ] Backend service deployed to Cloud Run
- [ ] MongoDB URI environment variable set
- [ ] Health endpoint returns 200 OK
- [ ] API endpoints return data

**Frontend deployment:**
- [ ] `.env.production` created with backend URL
- [ ] Frontend Docker image built and pushed
- [ ] Frontend service deployed to Cloud Run
- [ ] CORS updated on backend
- [ ] Frontend loads in browser
- [ ] State clicks work, district details load

**Monitoring:**
- [ ] Billing alert created
- [ ] Logs accessible via Cloud Console
- [ ] Metrics dashboard configured

## 📚 Useful Commands

```bash
# View all Cloud Run services
gcloud run services list --region $REGION

# Get service URL
gcloud run services describe SERVICE_NAME \
  --region $REGION \
  --format 'value(status.url)'

# View service details
gcloud run services describe SERVICE_NAME --region $REGION

# Stream logs
gcloud run services logs tail SERVICE_NAME --region $REGION

# Update environment variable
gcloud run services update SERVICE_NAME \
  --update-env-vars KEY=VALUE \
  --region $REGION

# Scale service
gcloud run services update SERVICE_NAME \
  --min-instances 0 \
  --max-instances 10 \
  --region $REGION

# Delete service
gcloud run services delete SERVICE_NAME \
  --region $REGION \
  --quiet
```

## 🎉 Success!

Your application is now deployed to GCP! 

**Access URLs:**
- **Frontend**: $FRONTEND_URL
- **Backend**: $BACKEND_URL
- **API Docs**: $BACKEND_URL/docs

**Next steps:**
1. Share frontend URL with stakeholders
2. Monitor usage via Cloud Console
3. Set up custom domain (optional)
4. Implement authentication (optional)

---

**Estimated deployment time:** 30-40 minutes

**Total cost for 1-2 weeks:** $11-17 (mostly Cloud Run, MongoDB Atlas is free)
