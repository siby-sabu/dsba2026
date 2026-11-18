# 🏗️ Building from Project Root

Both backend and frontend now build from the **project root** for consistency and simplicity.

## ✅ New Approach (Consistent!)

```bash
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026

# Build backend
gcloud builds submit --config=cloudbuild-backend.yaml .

# Build frontend  
gcloud builds submit --config=cloudbuild-frontend.yaml .
```

## ❌ Old Approach (Inconsistent)

```bash
# Backend from root
cd /path/to/dsba2026
gcloud builds submit --tag ... .

# Frontend from subdirectory (confusing!)
cd frontend
gcloud builds submit --tag ... .
```

## 📁 File Structure

```
dsba2026/                              # ← Always run commands from here!
├── cloudbuild-backend.yaml            # ← Backend build config
├── cloudbuild-frontend.yaml           # ← Frontend build config
├── .gcloudignore                      # ← Excludes for both builds
├── src/api/
│   ├── Dockerfile                     # Expects build context = project root
│   └── ...
├── frontend/
│   ├── Dockerfile                     # Expects build context = project root
│   ├── .gcloudignore                  # Excludes node_modules
│   ├── .env.production                # Backend URL (edit before build)
│   └── ...
└── data/processed/
    └── india_states_simplified.geojson
```

## 🔧 How It Works

### Backend Dockerfile (`src/api/Dockerfile`)

```dockerfile
# Build context is project root, so copy from subdirectories
COPY requirements-api.txt .
COPY src/api/ ./
COPY data/processed/india_states_simplified.geojson /app/data/processed/
```

### Frontend Dockerfile (`frontend/Dockerfile`)

```dockerfile
# Build context is project root, so copy from frontend/ subdirectory
COPY frontend/package*.json ./
COPY frontend/src/ ./src/
COPY frontend/public/ ./public/
COPY frontend/.env.production ./
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
```

## 🎯 Benefits

1. **Consistency** - Both use the same pattern
2. **Single .gcloudignore** - One file excludes for both
3. **No directory switching** - All commands from project root
4. **Clearer scripts** - No `cd` commands confusing the flow
5. **Easier automation** - CI/CD scripts are simpler

## 📝 Updated Commands

### Set Frontend Environment

```bash
# OLD (from frontend directory)
cd frontend
echo "REACT_APP_API_URL=$BACKEND_URL/api/v1" > .env.production

# NEW (from project root)
cd /path/to/dsba2026
echo "REACT_APP_API_URL=$BACKEND_URL/api/v1" > frontend/.env.production
```

### Build Commands

```bash
# From project root
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026

# Backend
gcloud builds submit --config=cloudbuild-backend.yaml .

# Frontend (MUST pass backend URL)
gcloud builds submit \
  --config=cloudbuild-frontend.yaml \
  --substitutions=_BACKEND_URL="$BACKEND_URL" \
  .

# If $BACKEND_URL not set, specify directly:
# --substitutions=_BACKEND_URL="https://agri-backend-xxx.run.app"
```

### Deploy Commands

```bash
# Backend deployment (same as before)
gcloud run deploy agri-backend \
  --image gcr.io/$PROJECT_ID/agri-backend:v1 \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --set-env-vars "MONGODB_URI=...,MONGODB_DB_NAME=...,CORS_ORIGINS=..."

# Frontend deployment (same as before)
gcloud run deploy agri-frontend \
  --image gcr.io/$PROJECT_ID/agri-frontend:v1 \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080
```

## 🔍 Troubleshooting

### Issue: "file not found in build context"

**Cause:** Running from wrong directory

**Solution:** Always run from project root:
```bash
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026
pwd  # Should show: .../dsba2026
```

### Issue: "node_modules being uploaded"

**Cause:** Missing `.gcloudignore` in frontend directory

**Solution:** Verify frontend/.gcloudignore exists:
```bash
cat frontend/.gcloudignore | grep node_modules
```

### Issue: Frontend has wrong backend URL

**Cause:** Forgot to update `frontend/.env.production` before build

**Solution:** Update before building:
```bash
echo "REACT_APP_API_URL=$BACKEND_URL/api/v1" > frontend/.env.production
gcloud builds submit --config=cloudbuild-frontend.yaml .
```

## 🚀 Quick Reference

| Task | Command (from project root) |
|------|-------------|
| **Build backend** | `gcloud builds submit --config=cloudbuild-backend.yaml .` |
| **Build frontend** | `gcloud builds submit --config=cloudbuild-frontend.yaml .` |
| **Set frontend env** | `echo "REACT_APP_API_URL=$BACKEND_URL/api/v1" > frontend/.env.production` |
| **List images** | `gcloud container images list` |
| **Check build context** | `pwd` (should be `.../dsba2026`) |

## 📚 Related Documentation

- **GCP_DEPLOYMENT_GUIDE.md** - Complete deployment guide
- **DEPLOY_QUICK_START.md** - 30-minute quick start
- **DEPLOY_QUICK_REFERENCE.md** - Command cheat sheet
- **TROUBLESHOOTING.md** - Common issues and fixes
