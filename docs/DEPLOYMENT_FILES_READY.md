# ✅ Deployment Files Ready

All files needed for GCP deployment have been created!

## 📁 Files Created

### Backend Deployment
- ✅ [`src/api/Dockerfile`](src/api/Dockerfile) - Backend container configuration
- ✅ [`src/api/.dockerignore`](src/api/.dockerignore) - Files to exclude from Docker build
- ✅ [`requirements-api.txt`](requirements-api.txt) - Updated with gunicorn

### Frontend Deployment
- ✅ [`frontend/Dockerfile`](frontend/Dockerfile) - Frontend container (multi-stage build)
- ✅ [`frontend/.dockerignore`](frontend/.dockerignore) - Files to exclude from Docker build
- ✅ [`frontend/nginx.conf`](frontend/nginx.conf) - Nginx config for SPA routing

### Documentation
- ✅ [`GCP_DEPLOYMENT_GUIDE.md`](GCP_DEPLOYMENT_GUIDE.md) - Complete deployment guide (30-40 min)
- ✅ [`DEPLOY_QUICK_START.md`](DEPLOY_QUICK_START.md) - Quick reference (30 min)

## 🎯 Next Steps

### Option 1: Quick Deploy (30 minutes)

Follow the quick start guide:
```bash
# Open the quick start guide
open DEPLOY_QUICK_START.md
```

### Option 2: Detailed Deploy (40 minutes)

Follow the comprehensive guide:
```bash
# Open the full deployment guide
open GCP_DEPLOYMENT_GUIDE.md
```

## 📋 Pre-Deployment Checklist

Before you start deploying, make sure you have:

- [ ] **MongoDB populated locally** (verify with: `mongosh agri_analytics --eval "db.districts.countDocuments({})"`)
- [ ] **GCP account** with billing enabled (get $300 free credits for new accounts)
- [ ] **gcloud CLI installed** (`brew install google-cloud-sdk`)
- [ ] **Docker installed** (`brew install --cask docker`)
- [ ] **30-40 minutes** of uninterrupted time
- [ ] **MongoDB Atlas password** ready (you'll create it during deployment)

## 🚀 Deployment Flow

```
1. MongoDB Atlas Setup (5 min)
   ↓
2. GCP Project Setup (5 min)
   ↓
3. Deploy Backend (10 min)
   ↓
4. Deploy Frontend (10 min)
   ↓
5. Test Everything (5 min)
   ↓
✅ LIVE APPLICATION!
```

## 💰 Expected Costs

| Period | Cost | Details |
|--------|------|---------|
| **1-2 weeks** | $11-17 | Cloud Run backend + frontend |
| **Per month** | $30-50 | If left running 24/7 |
| **MongoDB Atlas** | $0 | Free tier (512MB) |

**Cost savings:** Cloud Run scales to zero when idle, so nights/weekends cost $0!

## 🔍 What Gets Deployed

### Backend (FastAPI)
- **Service**: `agri-backend`
- **Image**: `gcr.io/PROJECT_ID/agri-backend:v1`
- **Port**: 8080
- **Memory**: 512Mi
- **URL**: `https://agri-backend-[random].run.app`
- **Endpoints**:
  - `/health` - Health check
  - `/api/v1/states` - States list
  - `/api/v1/districts` - Districts list
  - `/api/v1/geographic/state-boundaries` - GeoJSON boundaries
  - `/docs` - Interactive API docs (Swagger)

### Frontend (React)
- **Service**: `agri-frontend`
- **Image**: `gcr.io/PROJECT_ID/agri-frontend:v1`
- **Port**: 8080
- **Memory**: 256Mi
- **URL**: `https://agri-frontend-[random].run.app`
- **Features**:
  - Interactive India map
  - Clickable state boundaries
  - District markers (when state selected)
  - State dialog with mini-map
  - District detail cards

### Database (MongoDB Atlas)
- **Cluster**: M0 Free Tier (512MB)
- **Provider**: Google Cloud
- **Region**: us-east1 (or your choice)
- **Collections**:
  - `districts` (~515 docs)
  - `seasonal_crop_data` (~100K docs)
  - `monthly_climate` (~55K docs)

## 📖 Deployment Commands Summary

```bash
# Set up GCP project
export PROJECT_ID="agri-analytics-$(date +%s)"
gcloud projects create $PROJECT_ID
gcloud config set project $PROJECT_ID
gcloud services enable run.googleapis.com

# Deploy backend
cd src/api
gcloud builds submit --tag gcr.io/$PROJECT_ID/agri-backend:v1 .
gcloud run deploy agri-backend --image gcr.io/$PROJECT_ID/agri-backend:v1 --region us-central1 --allow-unauthenticated

# Deploy frontend
cd ../../frontend
gcloud builds submit --tag gcr.io/$PROJECT_ID/agri-frontend:v1 .
gcloud run deploy agri-frontend --image gcr.io/$PROJECT_ID/agri-frontend:v1 --region us-central1 --allow-unauthenticated
```

## 🧪 Testing Your Deployment

After deployment completes:

1. **Backend health check**:
   ```bash
   curl https://agri-backend-xyz.run.app/health
   ```

2. **API endpoints**:
   ```bash
   curl https://agri-backend-xyz.run.app/api/v1/states | jq .
   ```

3. **Frontend**:
   - Open URL in browser
   - Click on a state → Dialog opens
   - Click on district → Details show
   - Check browser console (should be no errors)

4. **API docs**:
   - Open: https://agri-backend-xyz.run.app/docs
   - Try out the endpoints interactively

## 🔄 Updating After Deployment

When you make code changes:

```bash
# Backend update
cd src/api
gcloud builds submit --tag gcr.io/$PROJECT_ID/agri-backend:v2 .
gcloud run deploy agri-backend --image gcr.io/$PROJECT_ID/agri-backend:v2 --region us-central1

# Frontend update
cd ../../frontend
gcloud builds submit --tag gcr.io/$PROJECT_ID/agri-frontend:v2 .
gcloud run deploy agri-frontend --image gcr.io/$PROJECT_ID/agri-frontend:v2 --region us-central1
```

## 🗑️ Cleanup (After Demo)

```bash
# Delete services
gcloud run services delete agri-backend --region us-central1 --quiet
gcloud run services delete agri-frontend --region us-central1 --quiet

# Delete entire project
gcloud projects delete $PROJECT_ID --quiet
```

## 📚 Additional Resources

- **GCP Cloud Run Docs**: https://cloud.google.com/run/docs
- **MongoDB Atlas Docs**: https://www.mongodb.com/docs/atlas/
- **Docker Best Practices**: https://docs.docker.com/develop/dev-best-practices/
- **FastAPI Deployment**: https://fastapi.tiangolo.com/deployment/docker/
- **React Production Build**: https://create-react-app.dev/docs/production-build/

## 💡 Tips

1. **First-time deployers**: Follow the full guide ([`GCP_DEPLOYMENT_GUIDE.md`](GCP_DEPLOYMENT_GUIDE.md))
2. **Experienced with GCP**: Use the quick start ([`DEPLOY_QUICK_START.md`](DEPLOY_QUICK_START.md))
3. **Set billing alerts**: Create a $25 budget alert to avoid surprise charges
4. **Test locally first**: Make sure `npm run build` and Docker builds work locally
5. **Save credentials**: Keep your MongoDB Atlas password and GCP project ID safe

## ❓ Common Issues

| Issue | Solution |
|-------|----------|
| "Billing not enabled" | Link billing account: `gcloud billing projects link ...` |
| CORS errors | Update backend CORS: `gcloud run services update agri-backend --update-env-vars "CORS_ORIGINS=..."` |
| MongoDB connection fails | Check Atlas IP whitelist (0.0.0.0/0) and connection string |
| Docker build fails | Check Dockerfile syntax, ensure `requirements-api.txt` exists |
| Frontend blank page | Verify `.env.production` has correct `REACT_APP_API_URL` |

## 🎉 Ready to Deploy!

You have everything you need. Choose your guide:

- **Quick (30 min)**: [`DEPLOY_QUICK_START.md`](DEPLOY_QUICK_START.md)
- **Detailed (40 min)**: [`GCP_DEPLOYMENT_GUIDE.md`](GCP_DEPLOYMENT_GUIDE.md)

Good luck! 🚀
