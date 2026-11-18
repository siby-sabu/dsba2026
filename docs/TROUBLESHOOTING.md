# 🐛 Deployment Troubleshooting Guide

Common issues and their solutions when deploying to Google Cloud Platform.

## 🚨 Backend Issues

### Issue 1: Backend Returns 503 Service Unavailable

**Symptoms:**
- Frontend shows "Failed to load data"
- Browser console shows: `503 Service Unavailable`
- CORS error in browser console

**Solution: Check Cloud Run Logs**

```bash
# View backend logs
gcloud logging read "resource.labels.service_name=agri-backend" --limit=50
```

**Common causes:**

#### A) `ModuleNotFoundError: No module named 'main'`

**Problem:** Dockerfile copying wrong files or building from wrong directory.

**Solution:**
```bash
# Build from PROJECT ROOT (not src/api!)
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026
gcloud builds submit --config=cloudbuild.yaml .
```

**Why:** The backend needs access to both `src/api/` and `data/processed/india_states_simplified.geojson`.

#### B) `FileNotFoundError: india_states_simplified.geojson not found`

**Problem:** GeoJSON file not included in Docker image.

**Solution:** Verify the Dockerfile includes:
```dockerfile
COPY data/processed/india_states_simplified.geojson /app/data/processed/india_states_simplified.geojson
```

And build from project root (see above).

#### C) MongoDB Connection Failed

**Problem:** Invalid MongoDB connection string or network access not configured.

**Solution:**
1. Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0` (allow all)
2. Check connection string format:
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster.xxxxx.mongodb.net/DATABASE_NAME
   ```
3. Test connection locally first:
   ```bash
   mongosh "mongodb+srv://agri_analytics:PASSWORD@dsba.axklwdl.mongodb.net/agri_analytics"
   ```

---

### Issue 2: CORS Errors in Browser

**Symptoms:**
```
Access to XMLHttpRequest has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present
```

**Solution 1: Check CORS Environment Variable**

```bash
# Check current CORS setting
gcloud run services describe agri-backend \
  --region=us-central1 \
  --format="value(spec.template.spec.containers[0].env)"
```

Should show: `CORS_ORIGINS=http://localhost:3000;https://agri-frontend-xxx.run.app`

**Solution 2: Update CORS**

```bash
# Update with your actual frontend URL
export FRONTEND_URL="https://agri-frontend-weju5ycsna-uc.a.run.app"

gcloud run services update agri-backend \
  --region=us-central1 \
  --update-env-vars "CORS_ORIGINS=http://localhost:3000;$FRONTEND_URL"
```

**Important:** Use **semicolon (;)** not comma to separate origins!

**Solution 3: Verify Backend Received Config**

```bash
# Test CORS headers
curl -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS \
  $BACKEND_URL/api/v1/states -v
```

Should show: `Access-Control-Allow-Origin: YOUR_FRONTEND_URL`

---

### Issue 3: Build Upload Too Large (400+ MB)

**Symptoms:**
```
Creating temporary archive of 76,135 file(s) totalling 926 MiB before compression
```

**Problem:** `node_modules/` or other large files being uploaded.

**Solution: Create/Update .gcloudignore**

**For backend (project root):**
```bash
cat > .gcloudignore << 'EOF'
.gcloudignore
.git
.gitignore

# Python
__pycache__/
*.pyc
venv/
dsba/

# Node.js (exclude frontend entirely for backend builds)
frontend/node_modules/
frontend/build/

# Data (keep only GeoJSON)
data/raw/
data/processed/*.csv
data/processed/*.pkl
data/processed/*.parquet
!data/processed/india_states_simplified.geojson

# Notebooks
notebooks/
*.ipynb

# MongoDB backups
mongodb_backup/

# Documentation
docs/
*.md
EOF
```

**For frontend:**
```bash
cd frontend
cat > .gcloudignore << 'EOF'
.gcloudignore
.git
.gitignore

# Node.js
node_modules/
npm-debug.log*

# Build outputs
build/
dist/

# Testing
coverage/

# Documentation
*.md
EOF
```

**Verify:**
```bash
# Expected: ~2-5 MB for backend, ~15 MB for frontend
gcloud builds submit --config=cloudbuild.yaml .
```

---

## 🎨 Frontend Issues

### Issue 4: Frontend Shows "Failed to load data"

**Symptoms:**
- Map doesn't render
- Browser console shows connection errors

**Solution: Check Backend URL in Build**

The backend URL must be set **at build time**, not deploy time!

```bash
# Verify .env.production has correct URL
cd frontend
cat .env.production

# Should show:
# REACT_APP_API_URL=https://agri-backend-xxx.run.app/api/v1
```

If wrong, rebuild:
```bash
# Update .env.production
echo "REACT_APP_API_URL=$BACKEND_URL/api/v1" > .env.production

# Rebuild (React bakes env vars into bundle)
gcloud builds submit --tag gcr.io/$PROJECT_ID/agri-frontend:v1 .

# Redeploy
gcloud run deploy agri-frontend \
  --image gcr.io/$PROJECT_ID/agri-frontend:v1 \
  --region=us-central1
```

---

### Issue 5: npm ci Fails - Lock File Out of Sync

**Symptoms:**
```
npm error Missing: yaml@2.9.1 from lock file
npm error npm ci can only install packages when your package.json and package-lock.json are in sync
```

**Solution: Use npm install in Dockerfile**

Edit `frontend/Dockerfile`:
```dockerfile
# Change from:
RUN npm ci

# To:
RUN npm install
```

**Better solution (for production):** Update lock file locally:
```bash
cd frontend
npm install
git add package-lock.json
git commit -m "Update package-lock.json"
```

---

## 🔧 Build Issues

### Issue 6: Build Context Too Large

**Problem:** Uploading 500+ MB instead of 2-5 MB.

**Solution:** See Issue 3 above - create proper `.gcloudignore` files.

---

### Issue 7: Can't Find requirements-api.txt

**Symptoms:**
```
COPY failed: file not found: requirements-api.txt
```

**Problem:** Building from wrong directory.

**Solution:**
```bash
# Copy requirements to src/api if building from there
cp requirements-api.txt src/api/

# OR (better): Build from project root
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026
gcloud builds submit --config=cloudbuild.yaml .
```

---

## 📊 Monitoring & Debugging

### View Logs

```bash
# Backend logs (recent)
gcloud logging read "resource.labels.service_name=agri-backend" --limit=50

# Frontend logs
gcloud logging read "resource.labels.service_name=agri-frontend" --limit=50

# Filter for errors only
gcloud logging read "resource.labels.service_name=agri-backend AND severity>=ERROR" --limit=20
```

### Check Service Status

```bash
# Describe service
gcloud run services describe agri-backend --region=us-central1

# Check if service is ready
gcloud run services describe agri-backend \
  --region=us-central1 \
  --format="value(status.conditions[0].status)"
# Should show: True
```

### Test Endpoints Directly

```bash
# Health check
curl https://agri-backend-xxx.run.app/health

# API endpoints
curl https://agri-backend-xxx.run.app/api/v1/states
curl https://agri-backend-xxx.run.app/api/v1/districts
curl https://agri-backend-xxx.run.app/api/v1/geographic/state-boundaries | jq '.features | length'
```

---

## 🆘 Quick Fixes

### Reset Everything and Redeploy

```bash
# Delete services
gcloud run services delete agri-backend --region=us-central1 --quiet
gcloud run services delete agri-frontend --region=us-central1 --quiet

# Delete images
gcloud container images delete gcr.io/$PROJECT_ID/agri-backend:v1 --quiet
gcloud container images delete gcr.io/$PROJECT_ID/agri-frontend:v1 --quiet

# Rebuild and redeploy from scratch
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026

# Backend
gcloud builds submit --config=cloudbuild.yaml .
gcloud run deploy agri-backend \
  --image gcr.io/$PROJECT_ID/agri-backend:v1 \
  --region=us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --set-env-vars "MONGODB_URI=mongodb+srv://USER:PASS@cluster.xxx.mongodb.net/agri_analytics,MONGODB_DB_NAME=agri_analytics,CORS_ORIGINS=http://localhost:3000;https://agri-frontend-xxx.run.app"

# Frontend
cd frontend
gcloud builds submit --tag gcr.io/$PROJECT_ID/agri-frontend:v1 .
gcloud run deploy agri-frontend \
  --image gcr.io/$PROJECT_ID/agri-frontend:v1 \
  --region=us-central1 \
  --allow-unauthenticated \
  --port 8080
```

---

## 📞 Getting Help

1. **Check logs first**: 90% of issues show up in Cloud Run logs
2. **Test backend separately**: Use curl to verify API works before blaming frontend
3. **Verify CORS**: Most frontend connection issues are CORS-related
4. **Check .gcloudignore**: Large uploads = missing .gcloudignore file
5. **Build from correct directory**: Backend must build from project root

**Still stuck?** Check:
- https://cloud.google.com/run/docs/troubleshooting
- https://github.com/your-repo/issues
