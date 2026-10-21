# Data Standardization Strategy: Multi-Source Dataset Integration

**Project:** dsba2026 Agricultural Analytics  
**Author:** Data Science Team  
**Date:** 2026-10-21  
**Purpose:** Reference guide for standardizing state/district names across 4 datasets

---

## Executive Summary

This document outlines the **industry-standard approach** for integrating multi-source agricultural datasets with inconsistent naming conventions. The strategy follows the **"Clean Individually → Then Combine"** pattern, ensuring traceability, data quality, and reproducibility.

**Datasets Involved:**
1. Crop Yield Data (455K records, 1997-2023)
2. Geography/Boundaries (784K points)
3. Precipitation (20 files, 2016-2026)
4. Vegetation Indices (4 files, 2016-2026)

**Core Challenge:** District and state names are inconsistent across datasets, causing silent join failures.

---

## Why Clean Individually First?

| **Advantage** | **Benefit** |
|---------------|-------------|
| **Traceability** | Track which dataset has which quality issues |
| **Validation** | Verify each source independently before joining |
| **Debugging** | Identify problematic sources immediately when joins fail |
| **Reproducibility** | Dataset-specific cleaning logic is well-documented |
| **Audit Trail** | Compare original vs. cleaned data side-by-side |

**Alternative (NOT Recommended):** Combining first, then cleaning later loses traceability and makes debugging extremely difficult.

---

## Implementation Phases

### Phase 1: Audit & Discovery

**Goal:** Understand state/district coverage and identify naming inconsistencies

**Steps:**
1. Load all 4 datasets (vegetation, precipitation, geography, crop yield)
2. Extract unique `(state, district)` combinations from each dataset
3. **State-level coverage analysis:**
   - Which states appear in ALL 4 datasets? → **Keep these**
   - Which states missing from ≥1 dataset? → **Drop these** (insufficient data)
4. **District-level variation analysis:**
   - Use fuzzy string matching (fuzzywuzzy library)
   - Identify variations: "Bangalore" vs "Bengaluru" vs "Bangalore Urban"
   - Flag case inconsistencies, spelling errors, trailing spaces
5. Document findings in notebook: `notebooks/eda/00_district_name_audit.ipynb`

**Expected Output:**
- List of states present in all 4 datasets (likely ~28 states)
- List of district name variations requiring manual review
- Coverage statistics per dataset (% of records mappable)

**Example Mismatches:**
```
Crops Dataset        Geography Dataset     Issue
--------------       -----------------     -----
Bangalore            Bangalore Urban       Extra word
BANGALORE            Bengaluru             Case + name change
Bombay               Mumbai                Historical name
```

---

### Phase 2: Create Master Lookup Table

**Goal:** Define canonical (ground truth) names for all districts

**Recommended Source:** Use **Geography dataset** as authority
- Contains official administrative boundaries
- Has latitude/longitude for spatial validation
- Most likely to use current official district names

**Alternative Sources:**
- Government Census district codes
- NITI Aayog administrative data

**Lookup Table Structure:**
```csv
district_id,canonical_state,canonical_district,centroid_lat,centroid_lon
KA_BGU,Karnataka,Bengaluru,12.9716,77.5946
MH_MUM,Maharashtra,Mumbai,19.0760,72.8777
UP_LKO,Uttar Pradesh,Lucknow,26.8467,80.9462
```

**Key Decisions:**
- Use standardized `district_id` format: `STATE_CODE_DISTRICT_CODE`
- Filter to ONLY states present in all 4 datasets
- Use current official names (Bengaluru, not Bangalore)
- Include state in ID to handle duplicate district names across states

**Save As:** `data/processed/master_district_lookup.csv`

**Create In:** `notebooks/eda/01_create_master_lookup.ipynb`

---

### Phase 3: Create Mapping Tables

**Goal:** Bridge from messy source names → clean canonical IDs

**For Each Dataset, Create:**
```csv
source_dataset,source_district_name,source_state_name,canonical_district_id,confidence_score
crops,Bangalore,Karnataka,KA_BGU,95
crops,Bangalore Urban,Karnataka,KA_BGU,92
vegetation,BANGALORE,KARNATAKA,KA_BGU,98
precip,Bengaluru,Karnataka,KA_BGU,100
geo,Bengaluru,Karnataka,KA_BGU,100
```

**Process:**

1. **Automated Fuzzy Matching:**
```python
from fuzzywuzzy import process

canonical_districts = master_lookup['canonical_district'].tolist()

for source_district in source_districts:
    match, score = process.extractOne(source_district, canonical_districts)
    
    if score >= 95:
        # Auto-accept high-confidence matches
        mapping.append({
            'source': source_district,
            'canonical_id': get_district_id(match),
            'score': score
        })
    else:
        # Flag for manual review
        manual_review.append({
            'source': source_district,
            'suggested': match,
            'score': score,
            'action': 'REVIEW'
        })
```

2. **Manual Review:** Review all matches with score < 95
   - Validate suggested mappings
   - Create manual overrides for incorrect auto-matches
   - Document ambiguous cases (e.g., multiple districts with similar names)

3. **Save Mapping:** `data/processed/district_name_mapping.csv`

**Critical Note:** This is a **one-time manual effort** (typically 2-4 hours) but prevents weeks of debugging join failures later.

**Create In:** `notebooks/eda/02_create_mapping_tables.ipynb`

---

### Phase 4: Clean Each Dataset Individually

**Goal:** Apply standardized IDs to each source dataset

**For Each Dataset (crops, vegetation, precipitation, geography):**

1. Load original data
2. Normalize source columns (lowercase, strip whitespace)
3. Join with mapping table on `(source_district_name, source_state_name)`
4. Add `canonical_district_id` column
5. Filter to states present in all datasets
6. **Validate cleaned data:**
   - ✓ No null district_ids (all records mapped successfully)
   - ✓ All district_ids exist in master lookup (referential integrity)
   - ✓ Coverage >95% (acceptable data loss threshold)
7. Save cleaned versions as Parquet:
   - `data/processed/crops_cleaned.parquet`
   - `data/processed/vegetation_cleaned.parquet`
   - `data/processed/precipitation_cleaned.parquet`
   - `data/processed/geography_cleaned.parquet`

**Example Cleaning Code:**
```python
import pandas as pd

# Load original data
crops = pd.read_csv('data/raw/crop_yield/Crop yield data from Abhi.csv')

# Load mapping
mapping = pd.read_csv('data/processed/district_name_mapping.csv')

# Normalize
crops['district_lower'] = crops['district_name'].str.lower().str.strip()
crops['state_lower'] = crops['state_name'].str.lower().str.strip()

# Join with mapping
crops_cleaned = crops.merge(
    mapping[mapping['source_dataset'] == 'crops'],
    left_on=['district_lower', 'state_lower'],
    right_on=['source_district_name', 'source_state_name'],
    how='left'
)

# Validate
null_count = crops_cleaned['canonical_district_id'].isnull().sum()
print(f"Unmapped records: {null_count} ({null_count/len(crops_cleaned):.2%})")

# Save
crops_cleaned.to_parquet('data/processed/crops_cleaned.parquet')
```

**Key Benefit:** Each cleaned file is independently valid and can be reused in future analyses.

**Create In:** `notebooks/eda/03_clean_individual_datasets.ipynb`

---

### Phase 5: Validation Before Joining

**Goal:** Verify data quality BEFORE attempting multi-dataset joins

**Validation Checks:**

1. **Referential Integrity:**
   ```python
   # All district_ids must exist in master lookup
   master_ids = set(master_lookup['district_id'])
   crops_ids = set(crops_cleaned['canonical_district_id'])
   
   orphan_ids = crops_ids - master_ids
   assert len(orphan_ids) == 0, f"Found {len(orphan_ids)} invalid district IDs"
   ```

2. **Temporal Alignment:**
   - Crop yield: 1997-2023 (yearly, by season)
   - Precipitation: 2016-2026 (daily → aggregate to seasonal)
   - Vegetation: 2016-2026 (16-day → aggregate to monthly/seasonal)
   - **Note:** Overlapping period is 2016-2023 (7 years)

3. **Join Coverage Test:**
   ```python
   # Test join on sample (2023 data only)
   test_join = crops_2023.merge(
       precip_seasonal_2023,
       on=['canonical_district_id', 'year', 'season'],
       how='left',
       indicator=True
   )
   
   match_rate = (test_join['_merge'] == 'both').sum() / len(test_join)
   print(f"Join coverage: {match_rate:.1%}")
   assert match_rate > 0.90, "Join coverage too low! Check mappings."
   ```

4. **State Coverage:**
   ```python
   # Count districts per state
   state_coverage = crops_cleaned.groupby('canonical_state')['canonical_district_id'].nunique()
   
   # Flag states with <5 districts (possible data quality issue)
   sparse_states = state_coverage[state_coverage < 5]
   print(f"States with <5 districts: {list(sparse_states.index)}")
   ```

**Expected Validation Output:**
```
✅ State Coverage:
   States in all 4 datasets: 28 states
   States dropped (missing data): 7 states
   
✅ District Mapping Success:
   Canonical districts (master): 642
   Crop yield mapped: 634/640 (99.1%)
   Precipitation mapped: 638/642 (99.4%)
   Vegetation mapped: 629/642 (98.0%)
   Geography: 642/642 (100% - ground truth)
   
✅ Join Coverage Test (2023 sample):
   Crop records: 54,230
   Matched with precipitation: 52,100 (96.1%)
   Matched with vegetation: 51,800 (95.5%)
   Final coverage: 51,500 (94.9%) ← ACCEPTABLE
   
⚠️  Sparse States (< 5 districts):
   - Sikkim: 3 districts
   - Goa: 2 districts
   → Consider excluding from state-level analysis
```

**Acceptance Criteria:**
- Join coverage >90% is acceptable
- Coverage 80-90% requires investigation
- Coverage <80% indicates mapping issues → revisit Phase 3

**Create In:** `notebooks/eda/04_validate_before_join.ipynb`

---

### Phase 6: Combine Datasets

**Goal:** Create unified analysis dataframe for modeling

**Join Strategy (Recommended for ML):**

**Base Table:** Crop Yield (year, district_id, crop, season, area, production, yield)

**Add Features:**
- **Precipitation:** Aggregate to seasonal totals/averages by (district_id, year, season)
- **Vegetation:** Aggregate to seasonal averages by (district_id, year, season)
- **Geography:** Add centroid lat/lon by (district_id)

**Join Keys:** `(canonical_district_id, year, season)`

**Example Code:**
```python
# Base: Crop yield
base = crops_cleaned[['year', 'canonical_district_id', 'crop_name', 'season', 'yield']]

# Aggregate precipitation to seasonal
precip_seasonal = precip_cleaned.groupby(
    ['canonical_district_id', 'year', 'season']
).agg({
    'precipitation_mm': ['sum', 'mean', 'std', 'max']
}).reset_index()

# Aggregate vegetation to seasonal
veg_seasonal = veg_cleaned.groupby(
    ['canonical_district_id', 'year', 'season']
).agg({
    'ndvi_mean': 'mean',
    'evi_mean': 'mean',
    'valid_crop_fraction': 'mean'
}).reset_index()

# Join all
unified = base \
    .merge(precip_seasonal, on=['canonical_district_id', 'year', 'season'], how='left') \
    .merge(veg_seasonal, on=['canonical_district_id', 'year', 'season'], how='left') \
    .merge(geo_cleaned[['canonical_district_id', 'centroid_lat', 'centroid_lon']], 
           on='canonical_district_id', how='left')

# Save
unified.to_parquet('data/processed/unified_features.parquet')
print(f"Unified dataset: {len(unified):,} records, {unified.columns.size} features")
```

**Alternative: Star Schema (for Spark/Data Warehouse):**
- **Fact Table:** Crop production (links to dimension tables)
- **Dimension Tables:** Geography, Time, Crops, Weather
- Better for large-scale ETL, worse for quick ML iteration

**Final Output:** `data/processed/unified_features.parquet`

**Create In:** `notebooks/eda/05_create_unified_dataset.ipynb`

---

## Common Pitfalls & How to Avoid Them

| **Pitfall** | **Symptom** | **Solution** |
|-------------|-------------|--------------|
| **Combining first, cleaning later** | Lost traceability of issues | Always clean individually first |
| **Using district names as join keys** | Silent join failures ("Bangalore" ≠ "Bengaluru") | Use standardized IDs only |
| **Skipping validation phase** | Discovered data issues during modeling | Validate BEFORE joining datasets |
| **Assuming 100% coverage** | Unrealistic expectations | Document 5-10% data loss as acceptable |
| **Ignoring temporal misalignment** | Mismatched aggregation periods | Align all datasets to common temporal unit (seasonal) |
| **No audit trail** | Can't reproduce cleaning decisions | Version control mapping CSVs |

---

## Recommended Notebook Sequence

```
notebooks/eda/
├── 00_district_name_audit.ipynb        ← START HERE (Phase 1)
│   └── Output: List of state/district mismatches
│
├── 01_create_master_lookup.ipynb       ← Phase 2
│   └── Output: data/processed/master_district_lookup.csv
│
├── 02_create_mapping_tables.ipynb      ← Phase 3 (REQUIRES MANUAL REVIEW)
│   └── Output: data/processed/district_name_mapping.csv
│
├── 03_clean_individual_datasets.ipynb  ← Phase 4
│   └── Output: 4 cleaned parquet files
│
├── 04_validate_before_join.ipynb       ← Phase 5 (CRITICAL)
│   └── Output: Validation report
│
└── 05_create_unified_dataset.ipynb     ← Phase 6
    └── Output: data/processed/unified_features.parquet
```

**Estimated Time:**
- Phase 1 (Audit): 1-2 hours
- Phase 2 (Master Lookup): 1 hour
- Phase 3 (Mapping + Manual Review): 2-4 hours ← **Most time-consuming**
- Phase 4 (Cleaning): 1 hour
- Phase 5 (Validation): 1 hour
- Phase 6 (Combine): 30 minutes

**Total:** 6-9 hours for initial setup, saves weeks of debugging later

---

## Required Tools & Libraries

```python
# Fuzzy string matching
from fuzzywuzzy import process, fuzz
from fuzzywuzzy import utils  # For preprocessing

# Data manipulation
import pandas as pd
import numpy as np

# Validation (optional but recommended)
from great_expectations import dataset

# Visualization for audit reports
import seaborn as sns
import matplotlib.pyplot as plt

# File I/O
import pyarrow.parquet as pq  # For Parquet files
```

**Installation:**
```bash
pip install fuzzywuzzy python-Levenshtein pandas numpy pyarrow seaborn matplotlib
```

---

## File Artifacts Created

| **File** | **Purpose** | **Version Control** |
|----------|-------------|---------------------|
| `master_district_lookup.csv` | Ground truth canonical names | ✅ Commit to git |
| `district_name_mapping.csv` | Source → canonical mappings | ✅ Commit to git |
| `*_cleaned.parquet` | Cleaned datasets | ❌ Gitignore (too large) |
| `unified_features.parquet` | Final joined dataset | ❌ Gitignore (regenerable) |

---

## Success Criteria

✅ **Phase 1-3 Complete When:**
- All district names mapped with confidence score
- Manual review completed for scores <95
- Mapping CSV committed to version control

✅ **Phase 4 Complete When:**
- All 4 datasets have `canonical_district_id` column
- <5% of records dropped due to unmapped districts
- Cleaned Parquet files saved and loadable

✅ **Phase 5 Complete When:**
- Referential integrity validated (all IDs in master lookup)
- Join coverage >90% on test sample
- Validation report documents any data gaps

✅ **Phase 6 Complete When:**
- Unified dataset created with all features
- Final record count documented
- Ready for feature engineering and modeling

---

## Next Steps After Standardization

Once unified dataset is created:

1. **Exploratory Data Analysis (EDA):**
   - Distributions of yield, precipitation, vegetation by state/district
   - Correlation analysis between weather and yield
   - Temporal trends (are yields improving over time?)

2. **Feature Engineering:**
   - Lagged features (previous year's yield)
   - Seasonal aggregations (total Kharif precipitation)
   - Spatial features (regional yield benchmarks)

3. **Model Training:**
   - Baseline: Linear regression
   - Advanced: XGBoost, LightGBM with spatial cross-validation
   - Evaluation: RMSE on temporal holdout (2022-2023)

---

## References

- **Project Documentation:** [CLAUDE.md](/Users/a0488240/Documents/Learning/MTech/project/dsba2026/CLAUDE.md)
- **Data Quality Section:** See "Data Quality Implementation (CRITICAL - DO THIS FIRST)"
- **Fuzzy Matching Library:** https://github.com/seatgeek/fuzzywuzzy
- **Best Practices:** Kimball Dimensional Modeling (star schema design)

---

**Document Version:** 1.0  
**Last Updated:** 2026-10-21  
**Maintained By:** Data Science Team

