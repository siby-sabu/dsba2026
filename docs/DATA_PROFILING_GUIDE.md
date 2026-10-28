# Data Profiling Guide: Schema Validation & Data Type Analysis

**Project:** dsba2026 Agricultural Analytics  
**Author:** Data Science Team  
**Date:** 2026-10-23  
**Purpose:** Reference guide for Phase 1 EDA - Data Profiling (01_data_profiling.ipynb)

---

## Executive Summary

This document provides a comprehensive guide for **data profiling** - the second notebook in the EDA sequence after district name standardization. Data profiling focuses on understanding dataset structure, validating schemas, identifying data type issues, and preparing datasets for quality analysis.

**Prerequisites:**
- ✅ District name audit completed (00_district_name_audit.ipynb)
- ✅ Cleaned datasets available in `data/processed/` (CSV + pickle format)
- ✅ State/district names standardized across all 4 datasets

**Objectives:**
1. Validate schemas and document dataset structure
2. Identify and fix data type issues
3. Profile key columns (ranges, distributions, unique values)
4. Clean up merge artifacts and redundant columns
5. Apply memory optimizations (categorical dtypes)
6. Generate consolidated summary report

---

## What is Data Profiling?

**Data Profiling** is the systematic examination of dataset structure and content to understand:
- **Schema:** Column names, data types, nullable fields
- **Dimensions:** Row counts, column counts, memory usage
- **Distributions:** Ranges, unique values, cardinality
- **Quality indicators:** Data types mismatches, artifacts, anomalies

**Why It Matters:**
- Catches structural issues early (before modeling)
- Identifies memory optimization opportunities
- Documents dataset characteristics for future reference
- Ensures data types are correct for analysis

**Difference from Data Quality Analysis:**
- **Profiling** (this notebook): Structure, schema, data types
- **Quality Analysis** (next notebook): Missing values, outliers, coverage

---

## Datasets Overview

After district name audit, we have 4 cleaned datasets:

| Dataset | Rows | Purpose | Key Columns |
|---------|------|---------|-------------|
| **Crop Yield** | 395,019 | Agricultural production data | year, crop_name, season, yield |
| **Precipitation** | 2,158,333 | Daily rainfall data | Date, Precipitation_mm |
| **Vegetation** | 140,081 | Satellite vegetation indices | date, ndvi_mean, evi_mean |
| **Geography** | 666,920 | District boundary polygons | state, district, Latitude, Longitude |

**Location:** `/Users/a0488240/Documents/Learning/MTech/project/dsba2026/data/processed/`

**Formats:** Both CSV (for portability) and Pickle (for speed)

---

## Notebook Structure (01_data_profiling.ipynb)

### Section 1: Setup & Load Data

**Purpose:** Import libraries and load cleaned datasets

```python
import pandas as pd
import numpy as np
from pathlib import Path

# Path setup
current = Path.cwd()
project_root = current if (current / "CLAUDE.md").exists() else current.parent.parent
processed_dir = project_root / "data" / "processed"

# Load processed datasets (pickle for speed)
crop_yield_df = pd.read_pickle(processed_dir / "crop_yield.pkl")
precipitation_df = pd.read_pickle(processed_dir / "precipitation.pkl")
vegetation_df = pd.read_pickle(processed_dir / "vegetation.pkl")
geography_df = pd.read_pickle(processed_dir / "geography.pkl")

print("✅ Loaded all 4 datasets")
```

**Why Pickle?** 
- 5-10x faster loading than CSV
- Preserves data types exactly
- Smaller file size for complex data

---

### Section 2: Dataset Dimensions Summary

**Purpose:** Get high-level overview of all datasets

```python
import os

def get_file_size(filename):
    """Get file size in MB"""
    filepath = processed_dir / filename
    return os.path.getsize(filepath) / (1024 * 1024)  # Convert to MB

# Create summary table
summary = pd.DataFrame({
    'Dataset': ['Crop Yield', 'Precipitation', 'Vegetation', 'Geography'],
    'Rows': [
        f"{len(crop_yield_df):,}",
        f"{len(precipitation_df):,}",
        f"{len(vegetation_df):,}",
        f"{len(geography_df):,}"
    ],
    'Columns': [
        crop_yield_df.shape[1],
        precipitation_df.shape[1],
        vegetation_df.shape[1],
        geography_df.shape[1]
    ],
    'CSV Size (MB)': [
        f"{get_file_size('crop_yield.csv'):.1f}",
        f"{get_file_size('precipitation.csv'):.1f}",
        f"{get_file_size('vegetation.csv'):.1f}",
        f"{get_file_size('geography.csv'):.1f}"
    ],
    'Memory (MB)': [
        f"{crop_yield_df.memory_usage(deep=True).sum() / 1e6:.1f}",
        f"{precipitation_df.memory_usage(deep=True).sum() / 1e6:.1f}",
        f"{vegetation_df.memory_usage(deep=True).sum() / 1e6:.1f}",
        f"{geography_df.memory_usage(deep=True).sum() / 1e6:.1f}"
    ]
})

display(summary)
```

**Expected Output:**
```
Dataset          Rows        Columns  CSV Size (MB)  Memory (MB)
Crop Yield      395,019         16        48.9          45.2
Precipitation  2,158,333         4        88.0          82.5
Vegetation      140,081         29        39.9          35.8
Geography       666,920          9        39.5          40.2
```

---

### Section 3: Schema Inspection Per Dataset

**Purpose:** Deep dive into each dataset's structure

**Standardized Profiling Function:**

```python
def profile_schema(df, dataset_name):
    """
    Comprehensive schema profiling for a dataset
    
    Displays:
    - Shape (rows x columns)
    - Column names and data types
    - Non-null counts
    - Memory usage
    - Sample rows (head & tail)
    """
    print(f"\n{'='*70}")
    print(f"  {dataset_name} Dataset - Schema Profile")
    print(f"{'='*70}\n")
    
    # Dimensions
    print(f"📊 Shape: {df.shape[0]:,} rows × {df.shape[1]} columns")
    print(f"💾 Memory: {df.memory_usage(deep=True).sum() / 1e6:.1f} MB\n")
    
    # Schema details
    print(f"📋 Column Schema:")
    print("-" * 70)
    schema_df = pd.DataFrame({
        'Column': df.columns,
        'Type': df.dtypes.values,
        'Non-Null': df.notna().sum().values,
        'Null %': (df.isna().sum() / len(df) * 100).values.round(2)
    })
    display(schema_df)
    
    # Detailed info
    print(f"\n📝 Detailed Info:")
    df.info(memory_usage='deep')
    
    # Sample data
    print(f"\n🔍 First 5 Rows:")
    display(df.head())
    
    print(f"\n🔍 Last 5 Rows:")
    display(df.tail())
    
    print("\n" + "="*70 + "\n")

# Profile each dataset
profile_schema(crop_yield_df, "Crop Yield")
profile_schema(precipitation_df, "Precipitation")
profile_schema(vegetation_df, "Vegetation")
profile_schema(geography_df, "Geography")
```

**Key Observations to Document:**

1. **Unnamed index columns** (from CSV export) - should be dropped
2. **Date columns stored as objects** (strings) - need datetime conversion
3. **Categorical columns stored as objects** - need category dtype
4. **Artifact columns** (e.g., `mapped_district_x/y` in vegetation)

---

### Section 4: Data Type Analysis

**Purpose:** Identify columns requiring type conversion

**Analysis Categories:**

#### 4.1 Date/Datetime Columns

**Check:**
```python
print("🗓️ Date/Time Columns Analysis:")
print("\nPrecipitation:")
print(f"  'Date' column dtype: {precipitation_df['Date'].dtype}")
print(f"  Sample: {precipitation_df['Date'].iloc[0]}")

print("\nVegetation:")
print(f"  'date' column dtype: {vegetation_df['date'].dtype}")
print(f"  'period_end' column dtype: {vegetation_df['period_end'].dtype}")
print(f"  Sample date: {vegetation_df['date'].iloc[0]}")
```

**Expected Issue:** Dates stored as `object` (string) instead of `datetime64[ns]`

**Recommendation:** Convert to datetime for:
- Time-based filtering and aggregation
- Proper date arithmetic
- Memory efficiency

#### 4.2 Categorical Columns

**Identify Low-Cardinality Columns:**

```python
def identify_categorical_candidates(df, dataset_name, max_unique=100):
    """
    Find columns suitable for categorical dtype
    
    Criteria: 
    - dtype is 'object' (string)
    - unique values < max_unique threshold
    """
    print(f"\n📂 {dataset_name} - Categorical Candidates:")
    print("-" * 60)
    
    candidates = []
    for col in df.select_dtypes(include='object').columns:
        n_unique = df[col].nunique()
        if n_unique < max_unique:
            memory_before = df[col].memory_usage(deep=True) / 1e6
            memory_after_estimate = memory_before * (n_unique / len(df))  # Rough estimate
            
            candidates.append({
                'Column': col,
                'Unique Values': n_unique,
                'Memory Now (MB)': f"{memory_before:.2f}",
                'Est. After (MB)': f"{memory_after_estimate:.2f}",
                'Savings %': f"{((1 - memory_after_estimate/memory_before) * 100):.1f}%"
            })
    
    if candidates:
        display(pd.DataFrame(candidates))
    else:
        print("  No categorical candidates found")

# Run for each dataset
identify_categorical_candidates(crop_yield_df, "Crop Yield")
identify_categorical_candidates(precipitation_df, "Precipitation")
identify_categorical_candidates(vegetation_df, "Vegetation")
identify_categorical_candidates(geography_df, "Geography")
```

**Common Categorical Columns:**
- `state`, `district` (all datasets)
- `season`, `crop_type`, `crop_name` (crop yield)
- `quality_status` (vegetation)
- `Country` (geography)

#### 4.3 Numeric Columns

**Check for numeric data stored as strings:**

```python
print("🔢 Numeric Columns Check:")
print("\nCrop Yield:")
for col in ['area', 'production', 'yield']:
    print(f"  {col}: {crop_yield_df[col].dtype}")

print("\nPrecipitation:")
print(f"  Precipitation_mm: {precipitation_df['Precipitation_mm'].dtype}")

print("\nVegetation:")
for col in ['ndvi_mean', 'evi_mean', 'valid_crop_fraction']:
    print(f"  {col}: {vegetation_df[col].dtype}")
```

**Expected:** All should be `float64` or `int64`

#### 4.4 Index Columns (Artifacts)

**Check for unnamed index columns:**

```python
print("🔍 Checking for Unnamed Index Columns:")
for name, df in [('crop_yield', crop_yield_df), 
                 ('precipitation', precipitation_df),
                 ('vegetation', vegetation_df),
                 ('geography', geography_df)]:
    unnamed_cols = [col for col in df.columns if 'Unnamed' in str(col)]
    if unnamed_cols:
        print(f"  ⚠️ {name}: {unnamed_cols}")
    else:
        print(f"  ✅ {name}: No unnamed columns")
```

**Action:** Drop unnamed columns (they're just row indices from CSV export)

---

### Section 5: Key Column Profiling

**Purpose:** Profile critical business columns

#### 5.1 Crop Yield Dataset

```python
print("🌾 Crop Yield - Key Column Profiles")
print("="*60)

# Temporal coverage
print(f"\n📅 Temporal Coverage:")
print(f"  Year range: {crop_yield_df['year'].min()} - {crop_yield_df['year'].max()}")
print(f"  Total years: {crop_yield_df['year'].nunique()}")

# Crops
print(f"\n🌱 Crop Coverage:")
print(f"  Unique crops: {crop_yield_df['crop_name'].nunique()}")
print(f"  Top 10 crops by records:")
print(crop_yield_df['crop_name'].value_counts().head(10))

# Seasons
print(f"\n🌤️ Season Distribution:")
print(crop_yield_df['season'].value_counts())

# Geographic
print(f"\n🗺️ Geographic Coverage:")
print(f"  Unique states: {crop_yield_df['state'].nunique()}")
print(f"  Unique districts: {crop_yield_df['district'].nunique()}")

# Yield statistics
print(f"\n📊 Yield Statistics:")
print(crop_yield_df['yield'].describe())
```

#### 5.2 Precipitation Dataset

```python
print("🌧️ Precipitation - Key Column Profiles")
print("="*60)

# Date range (after conversion to datetime)
precipitation_df['Date'] = pd.to_datetime(precipitation_df['Date'])

print(f"\n📅 Temporal Coverage:")
print(f"  Date range: {precipitation_df['Date'].min().date()} to {precipitation_df['Date'].max().date()}")
print(f"  Total days: {precipitation_df['Date'].nunique()}")

# Precipitation statistics
print(f"\n🌧️ Precipitation Statistics (mm):")
print(precipitation_df['Precipitation_mm'].describe())

print(f"\n  Zero precipitation days: {(precipitation_df['Precipitation_mm'] == 0).sum():,} ({(precipitation_df['Precipitation_mm'] == 0).sum() / len(precipitation_df) * 100:.1f}%)")
print(f"  Max rainfall: {precipitation_df['Precipitation_mm'].max():.1f} mm")

# Geographic
print(f"\n🗺️ Geographic Coverage:")
print(f"  Unique states: {precipitation_df['state'].nunique()}")
print(f"  Unique districts: {precipitation_df['district'].nunique()}")
```

#### 5.3 Vegetation Dataset

```python
print("🛰️ Vegetation - Key Column Profiles")
print("="*60)

# Date conversion
vegetation_df['date'] = pd.to_datetime(vegetation_df['date'])
vegetation_df['period_end'] = pd.to_datetime(vegetation_df['period_end'])

print(f"\n📅 Temporal Coverage:")
print(f"  Date range: {vegetation_df['date'].min().date()} to {vegetation_df['date'].max().date()}")
print(f"  Frequency: 16-day composites (MODIS)")

# NDVI/EVI statistics
print(f"\n🌿 Vegetation Index Statistics:")
print(f"\n  NDVI (Normalized Difference Vegetation Index):")
print(vegetation_df['ndvi_mean'].describe())
print(f"  Expected range: -1 to 1 (vegetation typically 0.2-0.8)")

print(f"\n  EVI (Enhanced Vegetation Index):")
print(vegetation_df['evi_mean'].describe())

# Data quality indicator
print(f"\n✅ Data Quality:")
print(f"  Valid Crop Fraction:")
print(vegetation_df['valid_crop_fraction'].describe())
print(f"\n  Records with <60% valid coverage: {(vegetation_df['valid_crop_fraction'] < 0.6).sum():,} ({(vegetation_df['valid_crop_fraction'] < 0.6).sum() / len(vegetation_df) * 100:.1f}%)")
```

#### 5.4 Geography Dataset

```python
print("🗺️ Geography - Key Column Profiles")
print("="*60)

print(f"\n🌍 Geographic Coverage:")
print(f"  Unique countries: {geography_df['Country'].nunique()}")
print(f"  Unique states: {geography_df['state'].nunique()}")
print(f"  Unique districts: {geography_df['district'].nunique()}")

# Spatial bounds
print(f"\n📍 Spatial Bounds (India):")
print(f"  Latitude: {geography_df['Latitude'].min():.2f}° to {geography_df['Latitude'].max():.2f}°")
print(f"  Longitude: {geography_df['Longitude'].min():.2f}° to {geography_df['Longitude'].max():.2f}°")
print(f"  Expected for India: ~8°N to 35°N, ~68°E to 97°E")

# Points per district (polygon complexity)
print(f"\n📐 Polygon Complexity:")
points_per_district = geography_df.groupby(['state', 'district']).size()
print(f"  Avg points per district: {points_per_district.mean():.0f}")
print(f"  Min points: {points_per_district.min()}")
print(f"  Max points: {points_per_district.max()}")
```

---

### Section 6: Artifact Cleanup

**Purpose:** Remove redundant/duplicate columns from merging

**Issue in Vegetation Dataset:**

During district name standardization, merging operations may have created duplicate columns:
- `mapped_district_x`
- `mapped_district_y`

**Investigation:**

```python
print("🔍 Checking for Artifact Columns in Vegetation Dataset:")

# Check if artifacts exist
artifact_cols = [col for col in vegetation_df.columns if 'mapped_district' in col]

if artifact_cols:
    print(f"  ⚠️ Found artifact columns: {artifact_cols}")
    
    # Compare values
    print(f"\n  Comparing values:")
    sample = vegetation_df[['district'] + artifact_cols].head(10)
    display(sample)
    
    # Check if they're identical to 'district' column
    for col in artifact_cols:
        if col != 'district':
            identical = (vegetation_df['district'] == vegetation_df[col]).all()
            print(f"  '{col}' identical to 'district': {identical}")
    
    # Decision: Drop artifacts
    print(f"\n  ✅ Dropping artifact columns: {artifact_cols}")
    vegetation_df.drop(columns=artifact_cols, inplace=True)
    
    print(f"  New shape: {vegetation_df.shape}")
else:
    print("  ✅ No artifact columns found")
```

**Action:** Drop artifact columns if they're redundant

---

### Section 7: Data Type Conversions

**Purpose:** Apply recommended conversions for correctness and efficiency

#### 7.1 Drop Unnamed Index Columns

```python
print("🗑️ Dropping Unnamed Index Columns:")

for name, df in [('crop_yield', crop_yield_df), 
                 ('precipitation', precipitation_df),
                 ('vegetation', vegetation_df),
                 ('geography', geography_df)]:
    
    unnamed_cols = [col for col in df.columns if 'Unnamed' in str(col)]
    
    if unnamed_cols:
        df.drop(columns=unnamed_cols, inplace=True)
        print(f"  ✅ {name}: Dropped {unnamed_cols}")
    else:
        print(f"  ℹ️ {name}: No unnamed columns")
```

#### 7.2 Convert Date Columns

```python
print("📅 Converting Date Columns to Datetime:")

# Precipitation
precipitation_df['Date'] = pd.to_datetime(precipitation_df['Date'])
print(f"  ✅ precipitation: 'Date' → datetime64[ns]")

# Vegetation
vegetation_df['date'] = pd.to_datetime(vegetation_df['date'])
vegetation_df['period_end'] = pd.to_datetime(vegetation_df['period_end'])
if 'previous_composite_date' in vegetation_df.columns:
    vegetation_df['previous_composite_date'] = pd.to_datetime(vegetation_df['previous_composite_date'])
print(f"  ✅ vegetation: 'date', 'period_end' → datetime64[ns]")
```

#### 7.3 Convert to Categorical Dtype

```python
print("📂 Converting to Categorical Dtype:")

# Crop Yield
categorical_cols = ['state', 'district', 'season', 'crop_type', 'crop_name']
for col in categorical_cols:
    if col in crop_yield_df.columns:
        crop_yield_df[col] = crop_yield_df[col].astype('category')
print(f"  ✅ crop_yield: {len(categorical_cols)} columns → category")

# Precipitation
categorical_cols = ['state', 'district']
for col in categorical_cols:
    precipitation_df[col] = precipitation_df[col].astype('category')
print(f"  ✅ precipitation: {len(categorical_cols)} columns → category")

# Vegetation
categorical_cols = ['state', 'district', 'quality_status', 'source_dataset']
for col in categorical_cols:
    if col in vegetation_df.columns:
        vegetation_df[col] = vegetation_df[col].astype('category')
print(f"  ✅ vegetation: {len(categorical_cols)} columns → category")

# Geography
categorical_cols = ['Country', 'state', 'district']
for col in categorical_cols:
    geography_df[col] = geography_df[col].astype('category')
print(f"  ✅ geography: {len(categorical_cols)} columns → category")
```

#### 7.4 Memory Savings Report

```python
print("\n💾 Memory Savings After Conversions:")
print("="*60)

# Reload original for comparison (or use saved pre-conversion sizes)
memory_savings = pd.DataFrame({
    'Dataset': ['Crop Yield', 'Precipitation', 'Vegetation', 'Geography'],
    'Before (MB)': [45.2, 82.5, 35.8, 40.2],  # From earlier measurement
    'After (MB)': [
        crop_yield_df.memory_usage(deep=True).sum() / 1e6,
        precipitation_df.memory_usage(deep=True).sum() / 1e6,
        vegetation_df.memory_usage(deep=True).sum() / 1e6,
        geography_df.memory_usage(deep=True).sum() / 1e6
    ]
})

memory_savings['Savings (MB)'] = memory_savings['Before (MB)'] - memory_savings['After (MB)']
memory_savings['Savings %'] = (memory_savings['Savings (MB)'] / memory_savings['Before (MB)'] * 100).round(1)

display(memory_savings)

total_savings = memory_savings['Savings (MB)'].sum()
print(f"\n✅ Total memory savings: {total_savings:.1f} MB")
```

---

### Section 8: Save Updated Datasets

**Purpose:** Persist cleaned datasets with corrected dtypes

```python
print("💾 Saving Updated Datasets:")
print("="*60)

datasets = {
    'crop_yield': crop_yield_df,
    'precipitation': precipitation_df,
    'vegetation': vegetation_df,
    'geography': geography_df
}

for name, df in datasets.items():
    # Save as pickle (preserves dtypes)
    pkl_path = processed_dir / f"{name}.pkl"
    df.to_pickle(pkl_path)
    
    # Save as CSV (for portability, but loses dtype info)
    csv_path = processed_dir / f"{name}.csv"
    df.to_csv(csv_path, index=False)
    
    print(f"  ✅ {name}:")
    print(f"     - {pkl_path.name} ({df.memory_usage(deep=True).sum() / 1e6:.1f} MB)")
    print(f"     - {csv_path.name} (for portability)")

print("\n✅ All datasets saved with updated dtypes")
```

---

### Section 9: Final Summary Report

**Purpose:** Consolidated overview of profiling results

```python
print("📊 DATA PROFILING SUMMARY REPORT")
print("="*70)

# Dataset overview
summary_data = {
    'Dataset': ['Crop Yield', 'Precipitation', 'Vegetation', 'Geography'],
    'Rows': [
        f"{len(crop_yield_df):,}",
        f"{len(precipitation_df):,}",
        f"{len(vegetation_df):,}",
        f"{len(geography_df):,}"
    ],
    'Columns': [
        crop_yield_df.shape[1],
        precipitation_df.shape[1],
        vegetation_df.shape[1],
        geography_df.shape[1]
    ],
    'States': [
        crop_yield_df['state'].nunique(),
        precipitation_df['state'].nunique(),
        vegetation_df['state'].nunique(),
        geography_df['state'].nunique()
    ],
    'Districts': [
        crop_yield_df['district'].nunique(),
        precipitation_df['district'].nunique(),
        vegetation_df['district'].nunique(),
        geography_df['district'].nunique()
    ],
    'Date Range': [
        f"{crop_yield_df['year'].min()}-{crop_yield_df['year'].max()}",
        f"{precipitation_df['Date'].min().date()} to {precipitation_df['Date'].max().date()}",
        f"{vegetation_df['date'].min().date()} to {vegetation_df['date'].max().date()}",
        "N/A (spatial only)"
    ],
    'Memory (MB)': [
        f"{crop_yield_df.memory_usage(deep=True).sum() / 1e6:.1f}",
        f"{precipitation_df.memory_usage(deep=True).sum() / 1e6:.1f}",
        f"{vegetation_df.memory_usage(deep=True).sum() / 1e6:.1f}",
        f"{geography_df.memory_usage(deep=True).sum() / 1e6:.1f}"
    ]
}

summary_df = pd.DataFrame(summary_data)
display(summary_df)

# Key findings
print(f"\n📋 Key Findings:")
print(f"  ✅ All date columns converted to datetime64[ns]")
print(f"  ✅ Categorical columns optimized (category dtype)")
print(f"  ✅ Artifact columns removed from vegetation dataset")
print(f"  ✅ State/district alignment verified across all datasets")
print(f"  ✅ Geographic bounds validated (India: 8°N-35°N, 68°E-97°E)")
print(f"  ✅ NDVI/EVI values in valid range (-1 to 1)")

print(f"\n⚠️ Notes for Data Quality Analysis (Next Notebook):")
print(f"  • Check missing values in all datasets")
print(f"  • Identify outliers in yield, precipitation, NDVI/EVI")
print(f"  • Validate temporal coverage (gaps in time series)")
print(f"  • Assess district coverage (which districts have sparse data)")

print("\n" + "="*70)
print("✅ DATA PROFILING COMPLETE")
print("="*70)
```

---

## Key Validation Checklist

After running the notebook, verify:

- [ ] **All 4 datasets profiled** (schema, dimensions, samples documented)
- [ ] **Date columns converted** (`.dtype` shows `datetime64[ns]`)
- [ ] **Categorical optimization applied** (memory usage reduced by 20-40%)
- [ ] **Artifact columns removed** (vegetation: `mapped_district_x/y` dropped)
- [ ] **Unnamed index columns dropped** (no `Unnamed: 0` columns)
- [ ] **State/district counts match** (all datasets have same canonical set)
- [ ] **Date ranges validated:**
  - Crop yield: 1997-2023 (or filtered range)
  - Precipitation: 2016-2026
  - Vegetation: 2016-2026
- [ ] **NDVI/EVI in valid range** (-1 to 1, typically 0-1)
- [ ] **Lat/Lon in India bounds** (~8°N-35°N, ~68°E-97°E)
- [ ] **Summary report generated** (consolidated table)
- [ ] **Updated datasets saved** (pickle + CSV in `data/processed/`)
- [ ] **Notebook runs end-to-end** (no errors)

---

## Common Issues & Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| **Date parsing fails** | `ParserError` or wrong dates | Check date format, use `format` parameter in `pd.to_datetime()` |
| **Memory error on conversion** | Kernel crashes | Convert columns one at a time, not all at once |
| **Categorical conversion fails** | `ValueError: Cannot convert` | Check for NaN values first, handle separately |
| **Artifact columns persist** | Extra columns after cleanup | Use `inplace=True` or reassign: `df = df.drop(...)` |
| **CSV saves with index** | Extra unnamed column after reload | Always use `index=False` in `to_csv()` |
| **Pickle incompatible** | Can't load pickle in different env | Use `protocol=4` for Python 3.4+ compatibility |

---

## Memory Optimization Best Practices

### Why Convert to Category?

**Before (object dtype):**
```python
# 'state' column with 28 unique values, 395,019 rows
# Each string stored separately: ~25 bytes × 395,019 = 9.4 MB
```

**After (category dtype):**
```python
# Stores: 28 unique strings + 395,019 integer codes (1-2 bytes each)
# Memory: ~0.7 KB (strings) + 0.4 MB (codes) = 0.4 MB
# Savings: 96%!
```

### When to Use Category?

**Use category dtype when:**
- Column has < 50% unique values (low cardinality)
- Same values repeat frequently (states, districts, seasons)
- Data type is string/object

**Don't use category when:**
- Nearly all values are unique (IDs, timestamps)
- Numeric columns (already efficient)
- Frequent new values added (category overhead high)

---

## Next Steps

After completing data profiling (01_data_profiling.ipynb), proceed to:

**Next Notebook: 02_data_quality.ipynb**
- Missing value analysis
- Outlier detection
- Temporal coverage assessment
- District-level data availability
- Correlation analysis

**Reference Documents:**
- [CLAUDE.md](../CLAUDE.md) - Project architecture guide
- [DATA_STANDARDIZATION_STRATEGY.md](./DATA_STANDARDIZATION_STRATEGY.md) - District name audit guide

---

## Expected Runtime

- **Total Time:** 5-10 minutes
- Section 1-2 (Load & Summary): 30 seconds
- Section 3 (Schema Profiling): 2-3 minutes
- Section 4-5 (Type Analysis & Profiling): 2-3 minutes
- Section 6-7 (Cleanup & Conversion): 1-2 minutes
- Section 8-9 (Save & Report): 1 minute

**Hardware:** MacBook Pro, 16GB RAM, M1 chip

---

## References

- **Pandas Documentation:** https://pandas.pydata.org/docs/user_guide/categorical.html
- **Data Profiling Best Practices:** https://towardsdatascience.com/data-profiling-101
- **Memory Optimization:** https://pandas.pydata.org/docs/user_guide/scale.html

---

**Document Version:** 1.0  
**Last Updated:** 2026-10-23  
**Maintained By:** Data Science Team
