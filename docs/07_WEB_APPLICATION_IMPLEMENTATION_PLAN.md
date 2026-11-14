# Agricultural Analytics Web Application - Implementation Plan

## Context

This plan creates an interactive full-stack web application to visualize agricultural insights from 10 years of Indian crop yield, precipitation, and vegetation data (1997-2023). The application enables exploration of rainfall trends, yield patterns, and crop recommendations across 26 states, 486 districts, and 114 crops.

**Purpose**: Provide an interactive geographic interface for agricultural stakeholders to:
- Identify drought-prone and heavy rainfall regions
- Analyze rainfall impact on crop yields
- Compare district performance within states
- Discover optimal crop selections by location and season
- Monitor vegetation health (NDVI) and water stress

**Current State**: Extensive EDA completed, processed data available as Parquet files (~200MB), no existing web infrastructure.

**User Requirements**: Python FastAPI backend, React frontend with interactive maps, MongoDB database, GCP deployment for 1-2 weeks.

**Development Strategy**: 
- ✅ **Start local**: MongoDB + FastAPI + React all running on localhost
- ✅ **Validate first**: Complete feature set working locally before any cloud deployment
- ✅ **Cloud optional**: Deploy to MongoDB Atlas + GCP only after local validation
- ✅ **Data alignment**: Filter crop data to 2016+ to match precipitation/vegetation coverage

---

## Quick Start (Local Development)

```bash
# 1. Install and start local MongoDB
# macOS:
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Linux (Ubuntu/Debian):
sudo apt-get install mongodb
sudo systemctl start mongod

# Windows:
# Download from https://www.mongodb.com/try/download/community
# Install as Windows Service (runs automatically)

# 2. Run migration (filters to 2016+ automatically)
python src/etl/migrate_to_mongodb.py --local

# 3. Start FastAPI backend
cd src/api
uvicorn main:app --reload --port 8000

# 4. Start React frontend (in new terminal)
cd frontend
npm start  # Opens http://localhost:3000

# Access:
# - Frontend: http://localhost:3000
# - API Docs: http://localhost:8000/docs
# - MongoDB: mongodb://localhost:27017
```

---

## Data Foundation

### Available Data Files (data/processed/)

1. **fact_seasonal_crop.parquet** (~100K records, **2016-2023 only**)
   - **IMPORTANT**: Filter to 2016+ for consistency with precipitation/vegetation data
   - Crop yields + climate + geography combined
   - 23 columns: state, district, crop_year, crop_name, season, yield, area, production
   - Pre-computed: seasonal_precip_total/avg/max, rainy_days, seasonal_ndvi_mean/min/max
   - Geography: centroid_lat, centroid_lon

2. **fact_monthly_climate.parquet** (55K records, 2016-2026)
   - Monthly precipitation + NDVI time-series
   - For detailed temporal analysis

3. **dim_districts.parquet** (515 districts)
   - Geographic reference with coordinates

**Data Filtering Strategy**:
```python
# Filter crop data to match precipitation/vegetation coverage
crop_data = pd.read_parquet('data/processed/fact_seasonal_crop.parquet')
crop_data_filtered = crop_data[crop_data['crop_year'] >= 2016]
# ~100K records after filtering (down from 361K)
```

### Key Insights Available (from notebooks)
- Yield trends (2016-2023) for 62 major crops
- Water stress classification (drought/irrigated/pest-disease/normal)
- Agro-ecological zones (6 clusters)
- Precipitation-NDVI correlation by district
- Performance benchmarking (z-scores vs state average)
- Optimal lag analysis (1-2 months between rainfall and vegetation)

---

## Architecture Overview

### Phase 1: Local Development (Start Here)

```
┌─────────────────────────────────────────────────────┐
│              USER BROWSER (localhost:3000)           │
│                                                      │
│   ┌────────────────────────────────────────┐        │
│   │   React Dev Server                     │        │
│   │   - Interactive India Map              │        │
│   │   - Filters (state/crop/season/year)   │        │
│   │   - Charts & Tables                    │        │
│   └─────────────────┬──────────────────────┘        │
│                     │ REST API                       │
└─────────────────────┼────────────────────────────────┘
                      │
             ┌────────▼────────────┐
             │  localhost:8000     │
             │  FastAPI Backend    │
             │  (uvicorn dev)      │
             └────────┬────────────┘
                      │
             ┌────────▼─────────────┐
             │  localhost:27017     │
             │  MongoDB (Native)    │
             │  4 Collections       │
             └──────────────────────┘
```

**Local Setup**:
- MongoDB: Native installation (brew/apt/Windows installer)
- FastAPI: `uvicorn main:app --reload` (port 8000)
- React: `npm start` (port 3000)
- **Cost**: $0 (all local)

### Phase 2: Cloud Deployment (Optional - After Local Validation)

```
┌─────────────────────────────────────────────────────┐
│              USER BROWSER                            │
│   ┌────────────────────────────────────────┐        │
│   │   React SPA (Frontend)                 │        │
│   └─────────────────┬──────────────────────┘        │
│                     │ REST API                       │
└─────────────────────┼────────────────────────────────┘
                      │
             ┌────────▼────────┐
             │  Cloud Run      │
             │  FastAPI Backend│
             │  (Python 3.10)  │
             └────────┬────────┘
                      │
             ┌────────▼────────────┐
             │  MongoDB Atlas      │
             │  (Free Tier 512MB)  │
             │  4 Collections      │
             └─────────────────────┘
```

**Cloud Deployment**: Google Cloud Run (serverless, auto-scales to zero)
**Storage**: MongoDB Atlas Free Tier (512MB, cloud-hosted)
**Estimated Cost**: $15-25 for 1-2 weeks deployment

---

## MongoDB Schema Design

### Collection 1: `districts` (515 documents)
**Purpose**: Geographic reference with metadata

```javascript
{
  _id: ObjectId,
  district_id: "Andhra Pradesh_Anantapur",  // Primary key
  state: "Andhra Pradesh",
  district: "Anantapur",
  centroid_lat: 14.312066,
  centroid_lon: 77.460158,
  metadata: {
    total_crops: 62,
    data_years: [1997, ..., 2023]
  }
}
```

**Indexes**: 
- `district_id` (unique)
- `state` + `district` (compound)
- `2dsphere` on coordinates for geospatial queries

---

### Collection 2: `seasonal_crop_data` (~100K documents, 2016-2023 only)
**Purpose**: Core fact table with crop yields + climate + geography

```javascript
{
  _id: ObjectId,
  district_id: "Andhra Pradesh_Anantapur",
  state: "Andhra Pradesh",
  district: "Anantapur",
  crop_year: 2020,
  crop_name: "Rice",
  crop_type: "Cereals",
  season: "Kharif",
  
  // Crop metrics
  area: 21400.0,
  production: 45600.0,
  yield: 2.13,
  
  // Climate (seasonal aggregates)
  climate: {
    seasonal_precip_total: 450.5,
    seasonal_precip_avg: 90.1,
    seasonal_precip_max: 180.2,
    rainy_days: 42
  },
  
  // Vegetation health
  vegetation: {
    seasonal_ndvi_mean: 0.55,
    early_season_ndvi: 0.45,
    mid_season_ndvi: 0.62,
    late_season_ndvi: 0.58
  },
  
  // Geographic (for map queries)
  location: {
    type: "Point",
    coordinates: [77.460158, 14.312066]  // [lon, lat]
  }
}
```

**Indexes**:
- `district_id` + `crop_year` + `crop_name` + `season` (compound, unique)
- `state` (for state aggregations)
- `crop_year` (for time-series)
- `location` (2dsphere for geographic queries)

---

### Collection 3: `monthly_climate` (55K documents)
**Purpose**: Time-series data for detailed charts

```javascript
{
  _id: ObjectId,
  district_id: "Andhra Pradesh_Anantapur",
  state: "Andhra Pradesh",
  district: "Anantapur",
  year: 2020,
  month: 7,
  date: ISODate("2020-07-01"),
  precipitation_mm: 145.3,
  ndvi_mean: 0.58
}
```

**Indexes**: `district_id` + `year` + `month` (compound)

---

### Collection 4: `aggregated_insights` (~1,500 documents)
**Purpose**: Pre-computed analytics for fast API responses

**Document types**:

1. **District summaries** (515 documents)
```javascript
{
  _id: ObjectId,
  insight_type: "district_summary",
  district_id: "Andhra Pradesh_Anantapur",
  state: "Andhra Pradesh",
  district: "Anantapur",
  
  rainfall_stats: {
    avg_annual_precipitation: 545.2,
    drought_prone: true,  // < 25th percentile
    heavy_rainfall_months: [7, 8]  // > 75th percentile
  },
  
  vegetation_stats: {
    avg_ndvi: 0.45,
    vegetation_health: "moderate"  // low/moderate/good
  },
  
  top_crops: [
    {crop: "Groundnut", avg_yield: 1.2, area_share: 0.35},
    {crop: "Rice", avg_yield: 2.1, area_share: 0.25},
    {crop: "Cotton", avg_yield: 0.8, area_share: 0.15}
  ],
  
  performance: {
    yield_zscore_vs_state: -0.5,  // Below state average
    rank_in_state: 12,
    total_districts_in_state: 18
  },
  
  water_stress_category: "drought",  // drought|irrigated|normal|pest_disease
  
  location: {
    type: "Point",
    coordinates: [77.460158, 14.312066]
  }
}
```

2. **Crop analyses** (114 documents)
```javascript
{
  _id: ObjectId,
  insight_type: "crop_analysis",
  crop_name: "Rice",
  
  national_stats: {
    total_area: 43000000,
    avg_yield: 2.8,
    top_producing_states: ["West Bengal", "Punjab", "Uttar Pradesh"]
  },
  
  yield_trends: {
    trend_slope: 0.03,
    start_yield_1997: 2.34,
    end_yield_2023: 3.03
  },
  
  optimal_conditions: {
    precipitation_range: [150, 300],
    ndvi_range: [0.5, 0.7],
    preferred_seasons: ["Kharif"]
  }
}
```

3. **State summaries** (26 documents)
```javascript
{
  _id: ObjectId,
  insight_type: "state_summary",
  state: "Andhra Pradesh",
  
  num_districts: 18,
  total_crops: 87,
  dominant_crops: ["Rice", "Cotton", "Groundnut"],
  avg_annual_rainfall: 920,
  
  high_performing_districts: ["Krishna", "Guntur"],
  underperforming_districts: ["Anantapur", "Kurnool"]
}
```

**Indexes**:
- `insight_type` + `district_id`
- `insight_type` + `state`
- `insight_type` + `crop_name`
- `location` (2dsphere)

---

## Migration Strategy (Parquet → MongoDB)

### Script: `src/etl/migrate_to_mongodb.py`

**Approach**:
1. Load Parquet files with pandas
2. Validate schemas with Pydantic models
3. Transform to nested documents
4. Batch insert to MongoDB (5,000 docs per batch)
5. Create indexes after load
6. Log progress and validation results

**Key transformations**:
- **Filter crop data to 2016+**: `crop_data[crop_data['crop_year'] >= 2016]`
- Flatten columns → nested objects (climate, vegetation)
- Add GeoJSON location field from lat/lon
- Generate composite district_id: `f"{state}_{district}"`
- Handle NaN values (minimal since all data aligned to 2016+)

**Execution time**: ~2-3 minutes for ~100K records

### Script: `src/etl/compute_insights.py`

**Pre-computes**:
1. District summaries (rainfall stats, top crops, performance ranks)
2. Water stress classification per district
3. Crop-level statistics (trends, optimal conditions)
4. State-level aggregates

**Execution time**: ~2-3 minutes

**Verification**:
- Validate document counts match source data
- Check index creation success
- Test sample queries for performance

---

## FastAPI Backend

### Project Structure

```
src/api/
├── main.py                  # App init, CORS, routes
├── config.py                # Env vars, MongoDB connection
├── database.py              # MongoDB client singleton
├── models/
│   ├── district.py          # Pydantic schemas
│   ├── crop.py
│   ├── insights.py
│   └── responses.py
├── routers/
│   ├── districts.py         # District endpoints
│   ├── states.py            # State endpoints
│   ├── crops.py             # Crop endpoints
│   ├── insights.py          # Pre-computed insights
│   ├── filters.py           # Advanced filtering
│   └── geographic.py        # Map data endpoints
└── utils/
    ├── aggregations.py      # MongoDB pipelines
    └── helpers.py
```

### Key API Endpoints

#### Geographic/Map Endpoints

**GET `/api/v1/districts`**
- Query params: `state` (optional)
- Returns: List of districts with coordinates
- Used for: Populating state/district dropdowns

**GET `/api/v1/states`**
- Returns: List of states with summary stats
- Used for: State selector, overview cards

**GET `/api/v1/map/data`**
- Query params: `year`, `season`, `metric` (yield|precipitation|ndvi)
- Returns: All district markers with color-coded values for map visualization
```json
{
  "districts": [
    {
      "district_id": "...",
      "state": "...",
      "coordinates": [77.46, 14.31],
      "value": 2.13,
      "metadata": {
        "crop_count": 12,
        "water_stress": "drought"
      }
    }
  ],
  "summary": {
    "min": 0.5,
    "max": 4.2,
    "avg": 2.1
  }
}
```

#### Insights Endpoints

**GET `/api/v1/insights/district/{district_id}`**
- Returns: Pre-computed district summary (from `aggregated_insights`)
- Used for: Map marker popup content
```json
{
  "district_id": "...",
  "state": "...",
  "district": "...",
  "rainfall_stats": {...},
  "vegetation_stats": {...},
  "top_crops": [...],
  "performance": {...},
  "water_stress_category": "drought"
}
```

**GET `/api/v1/insights/state/{state}`**
- Returns: State-level summary
- Used for: State detail page

**GET `/api/v1/insights/crop/{crop_name}`**
- Returns: Crop-specific analysis
- Used for: Crop detail page

#### Filter Endpoints

**POST `/api/v1/filter/districts`**
- Body: Filter criteria
```json
{
  "filters": {
    "water_stress": ["drought", "heavy_rainfall"],
    "yield_category": "high",
    "precipitation_range": [0, 100],
    "states": ["Andhra Pradesh"]
  },
  "year": 2023,
  "season": "Kharif"
}
```
- Returns: Matching district IDs with coordinates
- Used for: Special filters (drought-prone, heavy rainfall)

**GET `/api/v1/crops/search`**
- Query params: `state`, `district`, `season`, `year_range`
- Returns: Crops grown in that location
- Used for: Crop selector (filtered by location)

#### Time-Series Endpoints

**GET `/api/v1/timeseries/precipitation`**
- Query params: `district_id`, `start_year`, `end_year`
- Returns: Monthly precipitation array
- Used for: Rainfall trend charts

**GET `/api/v1/timeseries/yield`**
- Query params: `district_id`, `crop_name`, `start_year`, `end_year`
- Returns: Yearly yield array
- Used for: Yield trend charts

### Dependencies (requirements-api.txt)

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
pymongo==4.6.0
python-dotenv==1.0.0
pandas==2.0.3
pyarrow==12.0.1
gunicorn==21.2.0
```

---

## React Frontend

### Project Structure

```
frontend/
├── public/
│   ├── index.html
│   └── india-states.geojson    # From data/raw/geography/
├── src/
│   ├── App.js
│   ├── index.js
│   ├── api/
│   │   └── client.js           # Axios API calls
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.js
│   │   │   ├── Sidebar.js
│   │   │   └── Footer.js
│   │   ├── map/
│   │   │   ├── IndiaMap.js     # Main map (React Leaflet)
│   │   │   ├── DistrictMarker.js
│   │   │   └── Legend.js
│   │   ├── filters/
│   │   │   ├── StateSelector.js
│   │   │   ├── YearSelector.js
│   │   │   ├── SeasonSelector.js
│   │   │   ├── CropSelector.js
│   │   │   └── SpecialFilters.js
│   │   ├── charts/
│   │   │   ├── YieldTrend.js   # Recharts line chart
│   │   │   ├── PrecipitationBar.js
│   │   │   └── DistrictTable.js
│   │   └── insights/
│   │       ├── DistrictPopup.js # Popup content
│   │       ├── SummaryCards.js  # KPI cards
│   │       └── WaterStressBadge.js
│   ├── hooks/
│   │   ├── useMapData.js       # Fetch map data
│   │   ├── useFilters.js       # Filter state
│   │   └── useInsights.js      # Fetch insights
│   ├── context/
│   │   └── FilterContext.js    # Global filter state
│   ├── utils/
│   │   ├── colorScales.js      # Color mapping
│   │   └── formatters.js
│   └── styles/
│       ├── App.css
│       └── theme.js
├── package.json
└── .env.production
```

### Technology Stack

- **Map**: React Leaflet (free, open-source, excellent GeoJSON support)
- **Charts**: Recharts (declarative React components, responsive)
- **UI**: Material-UI (MUI) (comprehensive component library)
- **State**: React Context API (sufficient for moderate complexity)
- **HTTP**: Axios

### Key Features

#### 1. Interactive India Map (`IndiaMap.js`)

```javascript
<MapContainer center={[20.5937, 78.9629]} zoom={5}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  
  {/* State boundaries */}
  <GeoJSON data={indiaStatesGeoJSON} style={{fillOpacity: 0.1}} />
  
  {/* District markers */}
  {districtData.map(d => (
    <CircleMarker
      center={d.coordinates}
      radius={8}
      fillColor={getColor(d.value)}
      onClick={() => showPopup(d)}
    >
      <Popup><DistrictPopup district={d} /></Popup>
    </CircleMarker>
  ))}
</MapContainer>
```

#### 2. District Popup (Essential Metrics)

When clicking a district marker, popup shows:
- District name, state
- Average annual precipitation
- Average crop yield
- Vegetation health (NDVI)
- Top 3 crops (by area)
- Water stress badge (color-coded)
- "View Details" button → detailed page

#### 3. Filter Sidebar

Controls:
- **State dropdown**: All states
- **Year slider**: 1997-2023
- **Season selector**: Kharif/Rabi/Summer/Whole Year
- **Crop selector**: All crops (filtered by selected location)
- **Special filters** (checkboxes):
  - Drought-prone regions
  - Heavy rainfall regions
  - High yield areas
  - Low yield areas

Filter changes trigger map data refresh via API call.

#### 4. Dashboard Views

**Home Page**: Interactive map + filters + summary cards
**District Detail Page**: Time-series charts, crop table, performance comparison
**State Detail Page**: District comparison table, state-level trends
**Crop Detail Page**: Top producing states, optimal conditions, trends

### Dependencies (package.json)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-leaflet": "^4.2.1",
    "leaflet": "^1.9.4",
    "recharts": "^2.10.3",
    "@mui/material": "^5.15.0",
    "@emotion/react": "^11.11.1",
    "@emotion/styled": "^11.11.0",
    "axios": "^1.6.2",
    "react-router-dom": "^6.20.1"
  }
}
```

---

## GCP Deployment

### Target: Cloud Run (Serverless)

**Why Cloud Run**:
- Pay per request (auto-scales to 0 when idle)
- No cluster management
- Fast deployment (`gcloud run deploy`)
- Perfect for 1-2 week demo

**Architecture**:
- **Backend**: Cloud Run service (FastAPI container)
- **Frontend**: Cloud Run service (nginx serving React build)
- **Database**: MongoDB Atlas Free Tier (512MB, cloud-hosted)

**Estimated Cost** (1-2 weeks):
- Cloud Run (backend): $8-12 (assuming 200 requests/day)
- Cloud Run (frontend): $3-5 (static serving)
- MongoDB Atlas: $0 (Free Tier)
- **Total**: $15-25 (vs $0 when idle due to auto-scaling)

### Cloud Deployment Options (Choose One)

#### Option 1: Direct Deployment (No Docker)
Deploy FastAPI and React directly to cloud platforms:

**Backend (FastAPI)**:
- Google App Engine (Python runtime)
- Heroku (Python buildpack)
- Vercel Serverless Functions

**Frontend (React)**:
- Vercel (easiest for React)
- Netlify
- GitHub Pages (static build)

```bash
# Example: Vercel deployment (no Docker needed)
# Backend
cd src/api
vercel deploy --prod

# Frontend
cd frontend
npm run build
vercel deploy --prod
```

#### Option 2: Docker Deployment (Optional, for Cloud Run)

Only needed if specifically deploying to Google Cloud Run. Can be skipped for local development.

**Backend Dockerfile** (src/api/Dockerfile):
```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements-api.txt .
RUN pip install --no-cache-dir -r requirements-api.txt
COPY . .
EXPOSE 8080
CMD ["gunicorn", "main:app", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8080"]
```

**Frontend Dockerfile** (frontend/Dockerfile):
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment Variables

**.env.production** (Backend)
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/agri_analytics
MONGODB_DB_NAME=agri_analytics
CORS_ORIGINS=["https://agri-frontend-xyz.run.app"]
```

**.env.production** (Frontend)
```
REACT_APP_API_URL=https://agri-backend-xyz.run.app
```

---

## Implementation Phases

### Phase 1: Local Development Setup (Days 1-2)

**Day 1: Local MongoDB & Migration**
1. **Install local MongoDB** (choose your platform):
   
   **macOS**:
   ```bash
   brew tap mongodb/brew
   brew install mongodb-community
   brew services start mongodb-community
   # Verify: mongo --eval "db.version()"
   ```
   
   **Linux (Ubuntu/Debian)**:
   ```bash
   sudo apt-get update
   sudo apt-get install mongodb
   sudo systemctl start mongod
   sudo systemctl enable mongod  # Auto-start on boot
   # Verify: mongosh --eval "db.version()"
   ```
   
   **Windows**:
   - Download MongoDB Community Server from https://www.mongodb.com/try/download/community
   - Run installer, select "Install MongoDB as a Service"
   - Default port: 27017 (runs automatically as Windows Service)
   - Verify: Open MongoDB Compass or run `mongosh`

2. **Write migration script**: `src/etl/migrate_to_mongodb.py`
   - **IMPORTANT**: Filter crop data to 2016+ before loading
   - Transform to nested documents
   - Batch insert to local MongoDB

3. **Run migration**:
   ```bash
   python src/etl/migrate_to_mongodb.py --local
   # ~100K crop records (2016-2023 only) + 55K climate + 515 districts
   ```

4. **Write insights computation**: `src/etl/compute_insights.py`
5. Run insights generation
6. Validate data integrity

**Deliverables**:
- Local MongoDB running on port 27017
- ~156K documents across 4 collections (100K crop + 55K climate + 515 districts + insights)
- Pre-computed insights (1,500 documents)
- Migration logs and validation report

**Day 2: Local FastAPI Backend**
1. Initialize FastAPI project structure
2. **Implement local database connection**:
   ```python
   # src/api/config.py
   MONGODB_URI = "mongodb://localhost:27017"  # Local connection
   MONGODB_DB_NAME = "agri_analytics"
   CORS_ORIGINS = ["http://localhost:3000"]   # React dev server
   ```

3. Create Pydantic models (10+ schemas)
4. Implement routers:
   - `/districts` (GET list, GET by ID)
   - `/states` (GET list, GET summary)
   - `/map/data` (GET with filters)
   - `/insights/district/{id}` (GET)
   - `/filter/districts` (POST)
5. Add CORS middleware (allow localhost:3000)
6. **Run locally**:
   ```bash
   cd src/api
   uvicorn main:app --reload --port 8000
   # API docs: http://localhost:8000/docs
   ```
7. Test with Postman/curl

**Deliverables**:
- Working FastAPI backend on `localhost:8000`
- 12-15 operational endpoints
- API docs at `http://localhost:8000/docs` (Swagger)
- Connected to local MongoDB

---

### Phase 2: Local Frontend Development (Days 3-4)

**Day 3: React Setup & Map**
1. **Initialize React app**:
   ```bash
   npx create-react-app frontend
   cd frontend
   npm install react-leaflet leaflet recharts @mui/material axios
   ```

2. **Configure local API connection**:
   ```javascript
   // frontend/src/api/client.js
   const API_BASE_URL = "http://localhost:8000/api/v1";
   ```

3. Set up routing (React Router)
4. Implement `IndiaMap.js`:
   - Load India states GeoJSON
   - Plot district markers
   - Color-code by metric (yield/precipitation/NDVI)
5. Implement `DistrictPopup.js`:
   - Fetch district insights from local API
   - Display essential metrics
   - Add water stress badge
6. Create filter context (`FilterContext.js`)
7. Connect map to local API (`useMapData` hook)

8. **Run locally**:
   ```bash
   npm start  # Starts on http://localhost:3000
   ```

**Deliverables**:
- Interactive map with 486 district markers
- Clickable markers with popup insights
- Color-coding by selected metric
- Connected to local FastAPI backend

**Day 4: Filters & Charts**
1. Implement filter sidebar:
   - State/year/season/crop selectors (MUI Autocomplete)
   - Special filters (checkboxes)
2. Wire filters to map data (re-fetch on change)
3. Implement charts (Recharts):
   - Yield trend line chart
   - Precipitation bar chart
   - District comparison table
4. Add summary KPI cards (total area, avg yield, district count)
5. Responsive design (desktop/tablet)
6. Loading states and error handling

**Deliverables**:
- Fully functional filter system
- 3-4 chart/table components
- Responsive UI

---

### Phase 3: Feature Completion & Local Testing (Day 5)

1. Implement remaining endpoints:
   - `/timeseries/*` (yield, precipitation)
   - `/crops/search`
   - `/insights/state/{state}`
   - `/insights/crop/{crop}`
2. Add water stress visualization:
   - Color-coded map markers
   - Filter by category
3. Performance optimization:
   - Debounce filter inputs
   - Lazy load charts
   - Cache API responses (React Query)
4. Error handling (404, 500, network errors)
5. Integration testing (E2E with Cypress)
6. Write documentation (README.md, API docs)

**Deliverables**:
- Complete feature set
- Bug-free UX
- Test coverage >80%
- Comprehensive docs

---

### Phase 4: Cloud Deployment (Optional - Days 6-7)

**⚠️ Only proceed to cloud deployment after local validation is complete**

**Day 6: MongoDB Atlas & GCP Setup**
1. Create MongoDB Atlas Free Tier cluster
2. Migrate data from local MongoDB to Atlas:
   ```bash
   mongodump --db agri_analytics
   mongorestore --uri "mongodb+srv://..." --db agri_analytics dump/agri_analytics
   ```
3. Create GCP project
4. Enable APIs (Cloud Run, Container Registry)
5. Update environment variables for production
6. **Optional**: Create Dockerfiles if needed for Cloud Run deployment

**Deliverables**:
- MongoDB Atlas cluster populated
- GCP project configured
- Production environment variables ready

**Day 7: Cloud Deployment**
1. Push images to Google Container Registry
2. Deploy backend to Cloud Run
3. Deploy frontend to Cloud Run
4. Configure custom domain (optional)
5. End-to-end testing in production
6. Set up monitoring (Cloud Logging, uptime checks)
7. Load testing (100 concurrent users)
8. Final UAT (User Acceptance Testing)
9. Document deployment process

**Deliverables**:
- Live application at Cloud Run URL
- All endpoints operational
- Monitoring active
- Deployment guide (DEPLOYMENT.md)

---

## Feature Prioritization

### Must-Have (MVP)
1. ✅ Interactive India map with state boundaries
2. ✅ District markers (color-coded by yield/precipitation/NDVI)
3. ✅ Click marker → popup with essential insights
4. ✅ Filters: state, year, season, crop
5. ✅ Special filters: drought-prone, heavy rainfall
6. ✅ Top crops table for district
7. ✅ Rainfall and yield time-series charts

### Should-Have (Week 1)
1. ✅ Water stress classification visualization
2. ✅ Performance benchmarking (z-scores)
3. ✅ District comparison table
4. ✅ State detail page
5. ✅ Crop detail page
6. ✅ Responsive design

### Nice-to-Have (If Time Permits)
1. Agro-ecological zones overlay
2. Animated time-lapse (1997-2023)
3. Export data as CSV
4. Share map view via URL

---

## Critical Files to Create

### Migration Scripts (src/etl/)
1. **migrate_to_mongodb.py** - Load Parquet → MongoDB (361K docs)
2. **compute_insights.py** - Pre-compute district/state/crop summaries
3. **validate_migration.py** - Data integrity checks

### Backend (src/api/)
4. **main.py** - FastAPI app initialization
5. **config.py** - Configuration (MongoDB URI, CORS)
6. **database.py** - MongoDB client singleton
7. **models/district.py** - District Pydantic schemas
8. **models/crop.py** - Crop data schemas
9. **models/insights.py** - Insights schemas
10. **routers/districts.py** - District endpoints
11. **routers/states.py** - State endpoints
12. **routers/crops.py** - Crop endpoints
13. **routers/insights.py** - Insights endpoints
14. **routers/filters.py** - Filter/search endpoints
15. **routers/geographic.py** - Map data endpoints
16. **utils/aggregations.py** - MongoDB aggregation pipelines
17. **requirements-api.txt** - Python dependencies
18. **Dockerfile** - Backend container config

### Frontend (frontend/)
19. **package.json** - Node dependencies
20. **src/App.js** - Main app component with routing
21. **src/api/client.js** - Axios API client
22. **src/components/map/IndiaMap.js** - Map component (React Leaflet)
23. **src/components/map/DistrictMarker.js** - Marker component
24. **src/components/map/Legend.js** - Map legend
25. **src/components/filters/Sidebar.js** - Filter sidebar
26. **src/components/filters/StateSelector.js** - State dropdown
27. **src/components/filters/SpecialFilters.js** - Checkboxes (drought/heavy rainfall)
28. **src/components/charts/YieldTrend.js** - Line chart (Recharts)
29. **src/components/charts/PrecipitationBar.js** - Bar chart
30. **src/components/charts/DistrictTable.js** - Data table
31. **src/components/insights/DistrictPopup.js** - Popup content
32. **src/components/insights/SummaryCards.js** - KPI cards
33. **src/components/insights/WaterStressBadge.js** - Color-coded badge
34. **src/context/FilterContext.js** - Global filter state
35. **src/hooks/useMapData.js** - Fetch map data hook
36. **src/hooks/useFilters.js** - Filter state hook
37. **src/utils/colorScales.js** - Color mapping functions
38. **Dockerfile** - Frontend container config
39. **nginx.conf** - Nginx config for SPA routing

### Deployment
40. **README.md** - Project documentation
41. **DEPLOYMENT.md** - Deployment guide
42. **vercel.json** (optional) - Vercel deployment config
43. **app.yaml** (optional) - Google App Engine config

---

## Verification Strategy

### Unit Tests
- **Backend**: pytest for API endpoints (70% coverage target)
  - Mock MongoDB queries
  - Validate Pydantic schemas
  - Test aggregation pipelines

### Integration Tests
- **Backend**: Test MongoDB queries with test database
- **Frontend**: React Testing Library for components

### E2E Tests
- **Cypress**: Test critical user flows
  1. Load map → filter by state → click district → view popup
  2. Apply drought filter → verify markers update
  3. Change year → verify data refreshes
  4. Navigate to state detail page → view charts

### Performance Tests
- **Backend**: Load test with `locust` (100 concurrent users)
  - Target: <500ms response time (p95)
  - Target: <1% error rate
- **Frontend**: Lighthouse audit
  - Target: >90 performance score
  - Target: <3s page load

---

## Risk Mitigation

### Risk 1: MongoDB Atlas 512MB Limit
**Impact**: Data may not fit
**Mitigation**: Current data is ~200MB (fits with 2.5x headroom). Monitor storage usage. If needed, upgrade to $9/month M10 tier.

### Risk 2: GCP Cost Overrun
**Impact**: Higher than expected charges
**Mitigation**: 
- Set billing alert at $25 threshold
- Use min-instances=0 (scales to zero when idle)
- Monitor daily spend in Cloud Console
- Delete resources after 1-2 weeks

### Risk 3: Map Performance (486 Markers)
**Impact**: Browser lag with many markers
**Mitigation**:
- Implement marker clustering (react-leaflet-markercluster)
- Lazy load district details (fetch on click)
- Optimize GeoJSON (reduce polygon complexity)
- Consider pagination (load only visible districts)

### Risk 4: API Response Times
**Impact**: Slow queries degrade UX
**Mitigation**:
- Use pre-computed `aggregated_insights` collection
- Add indexes on all query fields
- Implement caching (Redis or in-memory)
- Use projection to reduce data transfer
- Monitor with Cloud Monitoring

---

## Success Criteria

### Technical
- ✅ All 486 districts plotted on map with coordinates
- ✅ API response times <500ms (p95)
- ✅ Frontend page load <3s
- ✅ Zero downtime deployment
- ✅ Test coverage >70%

### Functional
- ✅ User can filter by state/year/season/crop
- ✅ User can identify drought-prone regions
- ✅ User can identify heavy rainfall regions
- ✅ User can view district insights on click
- ✅ User can see rainfall impact on yield (charts)
- ✅ User can discover top crops by district

### Deployment
- ✅ Application accessible via public URL
- ✅ Cost <$25 for 1-2 weeks
- ✅ Auto-scales to zero when idle
- ✅ Monitoring and logging active

---

## Timeline Summary

| Phase | Duration | Key Deliverables | Environment |
|-------|----------|------------------|-------------|
| **Phase 1: Local Backend** | 2 days | Local MongoDB, FastAPI, 15 endpoints | **Local** |
| **Phase 2: Local Frontend** | 2 days | React map, filters, charts | **Local** |
| **Phase 3: Testing** | 1 day | Complete features, local testing | **Local** |
| **Phase 4: Cloud (Optional)** | 2 days | MongoDB Atlas, GCP Cloud Run | **Cloud** |
| **Total (Local MVP)** | **5 days** | Fully functional local app |  |
| **Total (with Cloud)** | **7 days** | Live application on GCP |  |

**Critical Path**:
1. **Local MongoDB setup** (blocks everything)
2. **Data filtering to 2016+** (critical for consistency)
3. Map data endpoint (blocks frontend map)
4. Local validation complete before cloud deployment

---

## Post-Deployment

### Monitoring
- **Cloud Monitoring**: Request latency, error rates, memory/CPU
- **Cloud Logging**: Centralized logs
- **Uptime Checks**: Ping `/health` every 5 minutes

### Cost Management
- Set billing alert at $25
- Monitor daily spend
- Scale to zero when idle (min-instances=0)
- Delete resources after demo period

### Future Enhancements (Post-MVP)
- Add user authentication
- Implement crop recommendations (ML model)
- Add export to CSV/PDF
- Create admin dashboard
- Add real-time data updates (websockets)
- Mobile app (React Native)
