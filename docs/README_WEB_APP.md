# Agricultural Analytics Web Application

Interactive web application for visualizing Indian crop yield, precipitation, and vegetation data (2016-2023).

## Quick Start

### Prerequisites
- ✅ Python 3.10+ (you have 3.10.17)
- ✅ MongoDB 8.0+ running (you have 8.0.16)
- Node.js 18+ (for React frontend)

### Step 1: Install pymongo

You need network access to install pymongo:

```bash
pip install pymongo
```

### Step 2: Run Data Migration

This will:
- Load Parquet files from `data/processed/`
- Filter crop data to 2016+ (removes ~260K pre-2016 records)
- Insert ~156K documents into MongoDB
- Create indexes

```bash
# From project root
python src/etl/migrate_to_mongodb.py --clean
```

Expected output:
```
Loading Parquet files...
  Loaded fact_seasonal_crop.parquet: 361,023 records
  ✓ Filtered to 2016+: ~100,000 records (removed ~261,000)
  Loaded fact_monthly_climate.parquet: 55,000 records
  Loaded dim_districts.parquet: 515 records

Migrating districts collection...
  ✓ Inserted 515 districts
  ✓ Created indexes

Migrating seasonal_crop_data collection...
  ✓ Inserted batch: 5,000 documents
  ...
  ✓ Created indexes

Migrating monthly_climate collection...
  ✓ Inserted batch: 5,000 documents
  ...
  ✓ Created indexes

MIGRATION VALIDATION
districts                     : 515 documents
seasonal_crop_data            : ~100,000 documents
monthly_climate               : 55,000 documents
aggregated_insights           : 0 documents

✓ Migration completed successfully!
```

### Step 3: Start FastAPI Backend

```bash
cd src/api
uvicorn main:app --reload --port 8000
```

Access:
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **Districts Endpoint**: http://localhost:8000/api/v1/districts

### Step 4: Test the API

Open your browser to http://localhost:8000/docs

Try these endpoints:
1. **GET /health** - Check if MongoDB is connected
2. **GET /api/v1/states** - List all 26 states
3. **GET /api/v1/districts** - List all 515 districts
4. **GET /api/v1/districts?state=Punjab** - Filter districts by state

## Project Structure

```
dsba2026/
├── src/
│   ├── etl/
│   │   └── migrate_to_mongodb.py     # Data migration script
│   └── api/
│       ├── main.py                    # FastAPI app entry point
│       ├── config.py                  # Settings (MongoDB URI, CORS)
│       ├── database.py                # MongoDB connection
│       ├── models/
│       │   └── district.py            # Pydantic schemas
│       └── routers/
│           ├── districts.py           # District endpoints
│           ├── states.py              # State endpoints
│           ├── geographic.py          # Map data (TODO)
│           └── insights.py            # Insights (TODO)
├── data/
│   └── processed/
│       ├── fact_seasonal_crop.parquet  # Crop yields + climate
│       ├── fact_monthly_climate.parquet # Monthly time-series
│       └── dim_districts.parquet        # Geographic reference
├── requirements-etl.txt               # ETL dependencies
├── requirements-api.txt               # API dependencies
└── docs/
    └── 07_WEB_APPLICATION_IMPLEMENTATION_PLAN.md

```

## MongoDB Collections

After migration, you'll have:

### 1. `districts` (515 documents)
```javascript
{
  "district_id": "Andhra Pradesh_Anantapur",
  "state": "Andhra Pradesh",
  "district": "Anantapur",
  "centroid_lat": 14.312066,
  "centroid_lon": 77.460158,
  "location": {
    "type": "Point",
    "coordinates": [77.460158, 14.312066]
  }
}
```

### 2. `seasonal_crop_data` (~100K documents, 2016-2023)
```javascript
{
  "district_id": "Andhra Pradesh_Anantapur",
  "state": "Andhra Pradesh",
  "district": "Anantapur",
  "crop_year": 2020,
  "crop_name": "Rice",
  "season": "Kharif",
  "area": 21400.0,
  "production": 45600.0,
  "yield": 2.13,
  "climate": {
    "seasonal_precip_total": 450.5,
    "seasonal_precip_avg": 90.1
  },
  "vegetation": {
    "seasonal_ndvi_mean": 0.55
  },
  "location": { ... }
}
```

### 3. `monthly_climate` (55K documents)
```javascript
{
  "district_id": "Andhra Pradesh_Anantapur",
  "year": 2020,
  "month": 7,
  "precipitation_mm": 145.3,
  "ndvi_mean": 0.58
}
```

### 4. `aggregated_insights` (to be populated)
Pre-computed analytics for fast API responses.

## Data Filtering (IMPORTANT)

The migration script filters crop data from 1997-2023 down to **2016-2023 only**:
- **Before**: 361K records (1997-2023)
- **After**: ~100K records (2016-2023)
- **Reason**: Precipitation and vegetation data only available from 2016

This is done in `migrate_to_mongodb.py`:
```python
df_crop = df_crop[df_crop['crop_year'] >= 2016]
```

## Troubleshooting

### MongoDB Connection Error
```
✗ MongoDB connection failed: ...
```

**Solution**: Ensure MongoDB is running
```bash
brew services list  # Check status
brew services start mongodb-community@8.0  # Start if needed
```

### pymongo Import Error
```
ModuleNotFoundError: No module named 'pymongo'
```

**Solution**: Install pymongo when you have network access
```bash
pip install pymongo
```

### Network Error During pip install
```
ERROR: Could not find a version that satisfies the requirement pymongo
```

**Solution**: Check your internet connection or use a VPN if needed

## Next Steps

1. ✅ **Migration complete** - You have ~156K documents in MongoDB
2. ⏳ **Insights computation** - Run `compute_insights.py` (to be created)
3. ⏳ **Frontend** - Create React app (to be created)
4. ⏳ **Cloud deployment** - Optional MongoDB Atlas + GCP

See `docs/07_WEB_APPLICATION_IMPLEMENTATION_PLAN.md` for the full plan.

## Support

- **MongoDB**: Running on port 27017 (brew services)
- **API**: Running on port 8000 (uvicorn)
- **Frontend**: Will run on port 3000 (npm start)

Questions? Check the implementation plan in `docs/` folder.
