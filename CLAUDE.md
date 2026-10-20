# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**dsba2026** is an M.Tech agricultural analytics project focused on crop yield prediction and optimization for India. The project analyzes 26 years of crop production data (1997-2023) combined with weather and vegetation data to build predictive models and recommendation systems.

**Current Phase:** Moving from planning to Exploratory Data Analysis (EDA)

**Tech Stack Expertise:** Strong Python/PySpark/FastAPI background

**Key Goals:**
- Predict crop yields using weather, vegetation indices, and historical data
- Build crop recommendation system based on location and season
- Analyze regional agricultural performance and trends
- Optimize resource allocation and identify underperforming districts

## Data Assets & Critical Gotchas

### 1. Crop Yield Data (`data/raw/crop_yield/Crop yield data from Abhi.csv`)
- **Size:** 455K records covering 1997-2023
- **Coverage:** 35 states, 116 crop types
- **Key Fields:** year, state_name, district_name, crop_name, season, area, production, yield
- **Primary Key:** `(year, state_name, district_name, crop_name, season)`
- **Seasons:** Kharif (Jun-Oct), Rabi (Nov-Mar), Zaid (Mar-Jun)

**⚠️ CRITICAL GOTCHA:** District names are inconsistent across datasets. MUST create master `dim_geography` table before any joins.

**Recommendation:** Start EDA with district name audit (see Data Quality section below).

### 2. Geospatial Boundaries (`data/raw/geography/latitude longitude from Allu.csv`)
- **Size:** 784K coordinate points (polygon boundaries per district)
- **Key Fields:** Country, District, State, Latitude, Longitude, Ind_adm2_ID, point_order
- **Join Key:** `(State, District)` - note capitalization differs from crop data

**⚠️ GOTCHA:** This is point-in-polygon data, NOT one-row-per-district. Multiple rows form district boundaries.

**Recommendation:** Pre-compute district centroids for simpler mapping:
```python
centroids = geo.groupby(['State', 'District']).agg({
    'Latitude': 'mean',
    'Longitude': 'mean'
}).reset_index()
```

### 3. Precipitation Data (`data/raw/percipitation/*.xls`)
- **Files:** 20 Excel files covering Jun 2016 to May 2026
  - 10 Jun-Nov files (Kharif season coverage)
  - 10 Dec-May files (Rabi season coverage)
- **Complete Temporal Coverage:** ALL 12 months via two-file-per-year structure
- **Granularity:** Daily precipitation by state and district
- **Key Fields:** Date, State_Name, District_Name, Precipitation_mm

**⚠️ GOTCHA:** Excel format with potential date parsing issues.

**Recommendation:** 
- Convert to CSV/Parquet immediately to avoid Excel parsing issues
- Load both Jun-Nov and Dec-May files for complete year coverage
- Aggregate to monthly/seasonal level for ML features
- Now suitable for full year-round analysis including both Kharif and Rabi seasons
- Can compute complete seasonal aggregations without imputation

### 4. Vegetation Indices (`data/raw/vegetation/*.csv`)
- **Files:** 4 CSV files covering 2016-01-01 to 2026-10-16
  - `Vegetation_16day_2016-01-01_to_2017-12-31day.csv` (26,359 records)
  - `vegetation_16day_2017-01-01_to_2019-12-31.csv` (39,538 records)
  - `vegetation_16day_2020-01-01_to_2023-12-31.csv` (52,717 records)
  - `vegetation_16day_2024-01-01_to_2026-10-18.csv` (37,246 records)
- **Total Records:** 155,860 observations across 10+ years
- **Frequency:** 16-day composite intervals (MODIS satellite data)
- **Complete Temporal Coverage:** Suitable for time-series modeling and forecasting
- **Key Fields:** district_name, state_name, year, month, ndvi_mean, evi_mean, valid_crop_fraction
- **Metrics:** NDVI (Normalized Difference Vegetation Index), EVI (Enhanced Vegetation Index)

**⚠️ GOTCHA:** `valid_crop_fraction` field indicates satellite data quality. Low values mean poor coverage.

**Recommendation:** 
- NOW suitable for time-series analysis and multi-year vegetation trends
- 10+ years of data enables robust temporal modeling
- Can analyze long-term vegetation health patterns and their correlation with yield
- Concatenate 4 files when loading, handle overlapping year ranges
- Filter records where `valid_crop_fraction < 0.6`
- Compute vegetation health score: `ndvi_mean * valid_crop_fraction`

## Architectural Decision Guide

### When to Use Spark vs Pandas

| Scenario | Tool | Rationale |
|----------|------|-----------|
| EDA phase | **Pandas** | Faster iteration, data fits in memory (~188 MB) |
| ETL production | **Spark** | Reproducibility, future scaling, standardized pipeline |
| Operation takes >30s | **Port to Spark** | Performance threshold for migration |

**Pattern:** Prototype in pandas, productionize in Spark.

### Feature Store Design

Follow dimensional modeling pattern:

**Dimension Tables:**
- `dim_geography` (district_id, district_name, state_name, centroid_lat, centroid_lon)
- `dim_crops` (crop_id, crop_name, crop_type, typical_season)
- `dim_time` (date, year, month, season, crop_cycle_phase)

**Fact Tables:**
- `fact_crop_production` (year, district_id, crop_id, season, area, production, yield)
- `fact_weather` (date, district_id, precipitation, temperature, ...)
- `fact_vegetation` (year, month, district_id, ndvi_mean, evi_mean, valid_crop_fraction)

**Feature Tables (Pre-computed):**
- `features_seasonal_aggregates` (district_id, crop_id, year, season, total_precip, avg_ndvi, lagged_yield_1yr, lagged_yield_2yr, ...)
- `features_spatial` (district_id, year, z_score_yield_vs_state, neighbor_avg_yield, ...)

**Storage Pattern:** Save as Parquet with year partitioning: `data/processed/table_name/year=YYYY/`

### Data Quality Strategy

**Phase 1 (EDA - Current):**
- Document data quality issues in notebooks
- Build district name mapping manually
- Profile data distributions and outliers

**Phase 2 (ETL - Next):**
- Implement Great Expectations validation suite
- Add Spark assertions in pipeline

**Key Validations Required:**
1. District name standardization (use Levenshtein distance for fuzzy matching)
2. Outlier detection (yield > 3 std deviations from crop/state mean)
3. Temporal coverage checks (flag districts with <5 years data)
4. Spatial coverage (valid_crop_fraction > 0.6 for vegetation)

## Development Commands

### Environment Setup
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On macOS/Linux
# venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt

# Create project structure
mkdir -p notebooks/{eda,modeling,reports}
mkdir -p src/{etl,features,models,api,utils}
mkdir -p data/{raw,processed,features}
mkdir -p tests/{unit,integration}
mkdir -p models
```

### Phase 1: Exploratory Data Analysis (Current Phase)
```bash
# Start Jupyter Lab
jupyter lab

# Recommended notebook sequence:
# notebooks/eda/00_district_name_audit.ipynb     - District standardization (DO THIS FIRST!)
# notebooks/eda/01_data_profiling.ipynb          - Schema validation, data types
# notebooks/eda/02_data_quality.ipynb            - Missing values, outliers, coverage
# notebooks/eda/03_join_validation.ipynb         - Test joins across datasets
# notebooks/eda/04_temporal_analysis.ipynb       - Time series patterns
# notebooks/eda/05_spatial_analysis.ipynb        - Geographic patterns
```

### Phase 2: ETL Development
```bash
# Build dimension tables (START HERE - creates master geography)
spark-submit --master local[4] \
  --conf spark.sql.adaptive.enabled=true \
  src/etl/build_dimension_tables.py

# Build fact tables
spark-submit --master local[4] src/etl/build_fact_tables.py

# Build feature store
spark-submit --master local[4] src/etl/build_feature_store.py

# Data quality validation
python src/etl/data_quality.py --validate-all
```

### Phase 3: Feature Engineering
```bash
# Temporal aggregations
python src/features/temporal_aggregation.py --season Rabi --output data/features/

# Lagged features (historical yields)
python src/features/lagged_features.py --lags 1,2,3

# Spatial features (regional benchmarks)
python src/features/spatial_features.py
```

### Phase 4: Model Training
```bash
# Baseline model
python src/models/train_yield_predictor.py \
  --model-type linear \
  --features data/features/training_set.parquet \
  --output models/baseline_v1.pkl

# XGBoost model
python src/models/train_yield_predictor.py \
  --model-type xgboost \
  --features data/features/training_set.parquet \
  --output models/yield_v1.pkl \
  --tune  # Optuna hyperparameter tuning

# Crop recommendation model
python src/models/train_crop_recommender.py \
  --model-type lightgbm \
  --output models/crop_rec_v1.pkl
```

### Phase 5: API Development
```bash
# Start FastAPI development server
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000

# API endpoints:
# GET  /districts             - List all districts
# GET  /crops                 - List all crops
# POST /predict/yield         - Predict crop yield
# POST /recommend/crops       - Recommend crops for location/season
# GET  /insights/regional     - Regional performance analytics
```

### Testing & Code Quality
```bash
# Run tests
pytest tests/unit                        # Fast: test feature engineering logic
pytest tests/integration                 # Slower: test Spark ETL jobs
pytest --cov=src --cov-report=html      # With coverage report

# Code formatting
black src/ notebooks/                    # Auto-format
black --check src/                       # Check without modifying

# Linting
flake8 src/                              # Style checks
mypy src/                                # Type checking
```

## Recommended Project Structure

```
dsba2026/
├── data/
│   ├── raw/                             # Original data files (committed, LFS tracked)
│   │   ├── Crop yield data from Abhi.csv
│   │   ├── latitude longitude from Allu.csv
│   │   ├── Percipitation data from Siby/
│   │   └── Vegitation data from Sri/
│   ├── processed/                       # Cleaned Parquet files (gitignored)
│   │   ├── dim_geography/
│   │   ├── dim_crops/
│   │   ├── fact_crop_production/
│   │   └── district_name_mapping.csv   # Manual mapping file (committed)
│   └── features/                        # ML-ready feature sets (gitignored)
│       ├── training_set.parquet
│       └── features_seasonal_aggregates/
├── notebooks/
│   ├── eda/                             # Exploratory analysis (00-05)
│   ├── modeling/                        # Model development (06-10)
│   └── reports/                         # Final analysis notebooks
├── src/
│   ├── etl/
│   │   ├── build_dimension_tables.py   # Geography/crop dimensions
│   │   ├── build_fact_tables.py        # Production/weather/veg facts
│   │   ├── build_feature_store.py      # ML features
│   │   └── data_quality.py             # Validation rules
│   ├── features/
│   │   ├── temporal_aggregation.py     # Seasonal rollups
│   │   ├── lagged_features.py          # Historical features
│   │   └── spatial_features.py         # Geographic features
│   ├── models/
│   │   ├── train_yield_predictor.py    # Regression models
│   │   └── train_crop_recommender.py   # Classification models
│   ├── api/
│   │   ├── main.py                     # FastAPI app
│   │   ├── routers/                    # Endpoint definitions
│   │   └── schemas.py                  # Pydantic models
│   └── utils/
│       ├── spark_config.py             # Reusable Spark session
│       └── district_matcher.py         # Fuzzy name matching
├── tests/
│   ├── unit/                           # Fast unit tests
│   └── integration/                    # Spark integration tests
├── models/                             # Serialized ML models (gitignored)
├── requirements.txt
├── .gitignore
├── README.md
└── CLAUDE.md
```

## Python Dependencies

**Create `requirements.txt` with these exact versions:**

```
# Core data processing
pyspark==3.5.0
pandas==2.0.3
numpy==1.24.3
pyarrow==12.0.1

# Data quality & validation
great-expectations==0.18.8
fuzzywuzzy==0.18.0
python-Levenshtein==0.21.1

# Machine learning
scikit-learn==1.3.0
xgboost==2.0.3
lightgbm==4.1.0
optuna==3.4.0

# EDA & visualization
jupyter==1.0.0
jupyterlab==4.0.9
matplotlib==3.7.2
seaborn==0.13.0
plotly==5.18.0

# Web application
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0

# Geospatial
geopandas==0.14.1
shapely==2.0.2

# Testing & quality
pytest==7.4.3
pytest-cov==4.1.0
black==23.12.0
flake8==6.1.0
mypy==1.7.1

# Utilities
python-dotenv==1.0.0
loguru==0.7.2
```

**Key Version Rationales:**
- **PySpark 3.5.0:** Latest stable with good Pandas UDF support for feature engineering
- **Pandas 2.0+:** 2x performance improvements for large DataFrames
- **PyArrow 12+:** Required for Pandas 2.x Parquet compatibility
- **Great Expectations 0.18+:** Modern expectation suite API for data validation

## Data Quality Implementation (CRITICAL - DO THIS FIRST)

### Why This Matters
District name inconsistencies across datasets will cause **silent join failures**, leading to missing records and incorrect aggregations. This is the #1 blocker for all downstream analysis.

### Step 1: District Name Audit (Priority #1)

Create `notebooks/eda/00_district_name_audit.ipynb` and run this analysis:

```python
import pandas as pd
from fuzzywuzzy import process

# Load all 4 datasets
crops = pd.read_csv('data/raw/Crop yield data from Abhi.csv')
geo = pd.read_csv('data/raw/latitude longitude from Allu.csv')
# Load precipitation XLS files
# Load vegetation CSVs

# Extract unique district names from each (lowercase, stripped)
crops_districts = set(crops['district_name'].str.lower().str.strip())
geo_districts = set(geo['District'].str.lower().str.strip())
precip_districts = set(precip['District_Name'].str.lower().str.strip())
veg_districts = set(veg['district_name'].str.lower().str.strip())

# Find mismatches using fuzzy matching
mismatches = []
for geo_dist in geo_districts:
    # Find closest match in crops dataset
    match, score = process.extractOne(geo_dist, crops_districts)
    if score < 100:  # Not exact match
        mismatches.append({
            'geo_district': geo_dist,
            'closest_crops_match': match,
            'similarity_score': score
        })

# Sort by score (worst matches first)
mismatches_df = pd.DataFrame(mismatches).sort_values('similarity_score')

# Review manually: scores < 95 require manual verification
manual_review = mismatches_df[mismatches_df['similarity_score'] < 95]
print(f"Found {len(manual_review)} district names needing manual review")
```

**Expected issues:**
- "Bangalore" vs "Bengaluru"
- "Bombay" vs "Mumbai"  
- "Bangalore Urban" vs "Bangalore" vs "Bengaluru"
- Case inconsistencies, trailing spaces

### Step 2: Create Master Mapping

Create `data/processed/district_name_mapping.csv` (commit this file):

```csv
source_dataset,source_district_name,canonical_district_name,state_name
crops,Bangalore,Bengaluru,Karnataka
crops,Bombay,Mumbai,Maharashtra
geo,Bangalore Urban,Bengaluru,Karnataka
precip,Bangalore,Bengaluru,Karnataka
veg,Bangalore,Bengaluru,Karnataka
```

**Rules:**
- Use canonical names from official government sources where possible
- Standardize to current district names (Bengaluru, not Bangalore)
- Include state for disambiguation (there are multiple "Bilaspur" districts)

### Step 3: Build Geography Dimension Table

Create `src/etl/build_dimension_tables.py`:

```python
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, md5, concat_ws
import pyspark.sql.functions as F

def build_geography_dimension(spark):
    # Load mapping
    mapping = spark.read.csv(
        'data/processed/district_name_mapping.csv', 
        header=True
    )
    
    # Load geo dataset and standardize names
    geo = spark.read.csv('data/raw/latitude longitude from Allu.csv', header=True)
    
    # Compute district centroids
    centroids = geo.groupBy('State', 'District').agg(
        F.mean('Latitude').alias('centroid_lat'),
        F.mean('Longitude').alias('centroid_lon')
    )
    
    # Apply mapping and generate district_id
    dim_geo = centroids.join(
        mapping,
        (col('District') == col('source_district_name')) & 
        (col('State') == col('state_name')),
        'left'
    ).select(
        md5(concat_ws('_', col('canonical_district_name'), col('state_name'))).alias('district_id'),
        col('canonical_district_name').alias('district_name'),
        col('state_name'),
        col('centroid_lat'),
        col('centroid_lon')
    ).distinct()
    
    # Save as Parquet
    dim_geo.write.mode('overwrite').parquet('data/processed/dim_geography/')
    
    return dim_geo
```

### Step 4: Validation Rules

Every ETL job MUST validate data against `dim_geography`. Add to all pipelines:

```python
def validate_districts(df, spark):
    """Validate all districts exist in dim_geography"""
    valid_districts = spark.read.parquet('data/processed/dim_geography') \
        .select('district_id')
    
    # Rule 1: No invalid district_ids
    invalid = df.join(valid_districts, 'district_id', 'left_anti')
    invalid_count = invalid.count()
    assert invalid_count == 0, f"Found {invalid_count} invalid district_ids"
    
    # Rule 2: No null districts
    null_count = df.filter(col('district_id').isNull()).count()
    assert null_count == 0, f"Found {null_count} null district_ids"
    
    # Rule 3: Check coverage (>90% of districts)
    coverage = df.select('district_id').distinct().count() / valid_districts.count()
    assert coverage > 0.9, f"District coverage only {coverage:.1%}"
    
    print(f"✓ District validation passed: {coverage:.1%} coverage")
```

### Data Quality Checklist

Before proceeding to modeling, verify:

- [ ] District name audit complete (`00_district_name_audit.ipynb`)
- [ ] Manual mapping CSV created and reviewed (`district_name_mapping.csv`)
- [ ] `dim_geography` table built successfully
- [ ] All 4 source datasets can join to `dim_geography` with >90% coverage
- [ ] Validation rules implemented in all ETL scripts
- [ ] Data quality report generated (missing values, outliers, temporal coverage)

## Feature Engineering Patterns

### Temporal Features

**Lagged Yields (Most Important for Prediction):**
```python
from pyspark.sql.window import Window
import pyspark.sql.functions as F

window = Window.partitionBy('district_id', 'crop_id').orderBy('year')

df = df.withColumn('lagged_yield_1yr', F.lag('yield', 1).over(window)) \
       .withColumn('lagged_yield_2yr', F.lag('yield', 2).over(window)) \
       .withColumn('lagged_yield_3yr', F.lag('yield', 3).over(window))
```

**Seasonal Precipitation Aggregation:**
```python
# Aggregate daily precipitation to seasonal totals
seasonal_precip = precip.groupBy('district_id', 'year', 'season').agg(
    F.sum('precipitation').alias('total_precip'),
    F.mean('precipitation').alias('avg_precip'),
    F.stddev('precipitation').alias('std_precip'),
    F.max('precipitation').alias('max_precip')
)
```

**Cyclical Season Encoding:**
```python
# Encode month as sine/cosine for cyclical patterns
df = df.withColumn('month_sin', F.sin(2 * 3.14159 * col('month') / 12)) \
       .withColumn('month_cos', F.cos(2 * 3.14159 * col('month') / 12))
```

### Spatial Features

**District-Level Vegetation Health:**
```python
# Weight NDVI by valid crop fraction (data quality indicator)
df = df.withColumn(
    'vegetation_health_score',
    col('ndvi_mean') * col('valid_crop_fraction')
)
```

**Regional Benchmarking (Z-Score within State):**
```python
window = Window.partitionBy('state_name', 'year', 'crop_id')

df = df.withColumn('state_avg_yield', F.mean('yield').over(window)) \
       .withColumn('state_std_yield', F.stddev('yield').over(window)) \
       .withColumn('z_score_yield', 
                   (col('yield') - col('state_avg_yield')) / col('state_std_yield'))
```

### Interaction Features

```python
# Precipitation × vegetation (water stress proxy)
df = df.withColumn('water_veg_interaction', col('total_precip') * col('ndvi_mean'))

# Lagged yield × current area (crop expansion signal)
df = df.withColumn('expansion_signal', col('lagged_yield_1yr') * col('area'))

# Season × crop type (one-hot encoded interaction)
df = df.withColumn('crop_season_key', concat_ws('_', col('crop_name'), col('season')))
```

## Machine Learning Strategy

### Model Development Sequence

**Phase 1: Baseline Models**
1. **Linear Regression** with basic features (precipitation, lagged yield)
   - Goal: Establish baseline RMSE
   - Fast to train and interpret
   
2. **XGBoost** with all features
   - Goal: Test feature importance and non-linear relationships
   - Use `tree_method='hist'` for faster training

**Phase 2: Advanced Models**
1. **LightGBM** with spatial cross-validation
   - Split data geographically (not randomly)
   - Train on 80% of districts, test on held-out 20%
   - Prevents data leakage from spatial correlation

2. **Ensemble Model** (if time permits)
   - Combine XGBoost + Neural Network (LSTM for time series)

### Evaluation Strategy

**Primary Metric:** RMSE (Root Mean Squared Error)

**Secondary Metrics:**
- R² by crop type (some crops easier to predict)
- MAE (Mean Absolute Error) for interpretability
- Quantile loss at 10th/90th percentiles (tail performance)

**CRITICAL: Temporal Holdout (Not Random Split)**
```python
# Train: 1997-2021
# Validate: 2022
# Test: 2023 (final holdout)

train = df.filter(col('year') <= 2021)
val = df.filter(col('year') == 2022)
test = df.filter(col('year') == 2023)
```

**Reasoning:** Random split leaks future information. Temporal holdout tests real prediction scenario.

### Cross-Validation Strategy

**Spatial Cross-Validation** (Recommended):
```python
from sklearn.model_selection import GroupKFold

# Group by district to prevent data leakage
gkf = GroupKFold(n_splits=5)
for train_idx, val_idx in gkf.split(X, y, groups=districts):
    # Train on some districts, validate on others
    pass
```

### Outlier Handling

**In EDA:** Keep outliers for analysis (true anomalies vs data errors?)

**In ML Training:** Remove extreme outliers
```python
# Remove yields > 99th percentile by crop type
df = df.withColumn('percentile_99', 
                   F.expr('percentile_approx(yield, 0.99)').over(Window.partitionBy('crop_id')))
df_train = df.filter(col('yield') <= col('percentile_99'))
```

**Feature Transformation:** Log-transform yield (right-skewed distribution)
```python
df = df.withColumn('log_yield', F.log1p(col('yield')))
# Train on log_yield, exponentiate predictions
```

## Key Architectural Decisions

These decisions guide all implementation:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Storage Format** | Parquet with Snappy compression | Columnar storage, 10x smaller than CSV, faster reads |
| **Partitioning** | By year (`year=YYYY/`) | Enables temporal queries without full table scan |
| **Spark Mode** | `local[4]` in development | Cluster-ready for production without code changes |
| **API Design** | RESTful with `/predict/yield` and `/recommend/crops` | Standard HTTP APIs, easy integration |
| **Frontend Viz** | React + Mapbox (geo) + Recharts (time series) | Modern web stack, interactive maps |
| **Feature Store** | Pre-computed aggregations | Don't compute features on-demand (too slow) |
| **Model Format** | Pickle for scikit-learn/XGBoost | Standard serialization format |
| **Validation** | Temporal holdout (2022-2023) | Tests real prediction scenario, not random split |

## Temporal Alignment (Critical for Joins)

**Crop Seasons to Months Mapping:**

| Season | Months | Typical Crops | Precipitation Coverage |
|--------|--------|---------------|------------------------|
| **Kharif** | Jun-Oct (6-10) | Rice, maize, cotton, soybean | ✅ Full coverage (Jun-Nov files) |
| **Rabi** | Nov-Mar (11-3) | Wheat, mustard, chickpea, barley | ✅ Full coverage (Dec-May files) |
| **Zaid** | Mar-Jun (3-6) | Watermelon, cucumber | ✅ Full coverage (both file sets) |

**Implementation:**
```python
season_to_months = {
    'Kharif': (6, 10),   # June to October
    'Rabi': (11, 3),     # November to March (wraps year)
    'Zaid': (3, 6)       # March to June
}

# Add crop cycle months to features
df = df.withColumn('crop_cycle_start_month', 
                   F.when(col('season') == 'Kharif', 6)
                    .when(col('season') == 'Rabi', 11)
                    .when(col('season') == 'Zaid', 3))
```

**Note:** All seasons now have complete precipitation data from the two-file-per-year structure (Jun-Nov + Dec-May). No gaps requiring imputation.

## Common Gotchas & Solutions

| Gotcha | Symptom | Solution |
|--------|---------|----------|
| District name mismatch | Joins return 0 rows | Use `dim_geography.district_id` for all joins |
| Excel date parsing | Dates become numbers | Use `pd.read_excel(date_format='%Y-%m-%d')` |
| Parquet schema conflicts | "incompatible schema" error | Ensure consistent dtypes before write |
| Memory errors in pandas | Kernel crashes | Switch to Spark or use `chunksize` in `read_csv` |
| Sparse vegetation data | Low coverage | Filter `valid_crop_fraction > 0.6` |
| Yield outliers | Predictions way off | Log-transform yield, remove >99th percentile |

## Testing Strategy

**Unit Tests** (`tests/unit/`):
- Test feature engineering functions (lagged features, aggregations)
- Test district name matching logic
- Fast (<5 seconds total)

**Integration Tests** (`tests/integration/`):
- Test full ETL pipeline on sample data (100 rows)
- Validate Parquet schema consistency
- Slower (~30 seconds)

**Data Validation** (Great Expectations):
- Schema validation (column names, types)
- Range checks (yield > 0, year between 1997-2023)
- Referential integrity (all district_ids in dim_geography)

## Git Workflow

**Branches:**
- `main` - Stable, working code
- `siby-analysis` - Current analysis work (active)
- Feature branches: `feature/etl-pipeline`, `feature/yield-model`

**Before Committing:**
```bash
# Format code
black src/ notebooks/

# Run tests
pytest tests/

# Check git status
git status
```

**Large Files:** 
- CSV files already committed (use Git LFS if repository grows)
- `.gitignore` excludes: `data/processed/`, `data/features/`, `models/`, `*.pyc`

## Next Steps (Recommended Order)

1. **[NOW]** Run district name audit (`notebooks/eda/00_district_name_audit.ipynb`)
2. Create `district_name_mapping.csv` manually
3. Build `dim_geography` table (`src/etl/build_dimension_tables.py`)
4. Validate all datasets join successfully to `dim_geography`
5. Profile data quality (missing values, outliers, distributions)
6. Build feature store (temporal and spatial features)
7. Train baseline models (linear regression, XGBoost)
8. Evaluate on 2022-2023 holdout data
9. Deploy FastAPI for predictions

**Current Priority:** Data quality and geography standardization before ANY modeling work.
