# Data Quality Assessment Guide: Agricultural Analytics

**Project:** dsba2026 Agricultural Analytics  
**Purpose:** Comprehensive guide for data quality validation in 03_data_quality.ipynb  
**Phase:** Phase 1 EDA - Quality Assessment (Step 3 of 6)  
**Prerequisites:** District standardization (00) and data profiling (01/02) completed

---

## Executive Summary

Data quality assessment identifies **completeness, validity, consistency, and accuracy** issues that could compromise model performance. This phase bridges exploratory profiling and feature engineering by quantifying data reliability and establishing quality thresholds.

**What's Different from Profiling:**
- **Profiling (01/02):** "What does the data look like?" (schema, types, distributions)
- **Quality (03):** "Is the data good enough to use?" (missing values, outliers, coverage gaps)

**Key Outputs:**
1. Missing value analysis per dataset and column
2. Outlier detection with actionable recommendations
3. Temporal and spatial coverage assessment
4. Data completeness scores per district/crop/season
5. Quality acceptance criteria for feature engineering

**Expected Runtime:** 15-25 minutes for all 4 datasets

---

## 1. Missing Value Analysis

### 1.1 Overview Assessment

**Goal:** Quantify missing data across all datasets to understand data completeness

**Key Questions:**
- Which columns have missing values?
- What percentage of records are affected?
- Are missing values random or systematic (e.g., specific years, districts)?

**Analysis Approach:**

**A. Per-Column Missing Counts**
- Calculate count and percentage of nulls per column
- Identify columns with >20% missing (potential drop candidates)
- Compare missing patterns across datasets

**B. Missing Value Heatmap**
- Visualize missing patterns by year/district/crop
- Identify systematic gaps (e.g., certain districts never report certain crops)

**C. Missingness Correlation**
- Check if missing values in one column predict missing in another
- Example: If `production` is null, is `yield` also null?

**Typical Patterns:**

| Dataset | Common Missing Columns | Cause |
|---------|------------------------|-------|
| **Crop Yield** | `production`, `yield` | Crop not grown in that district/season |
| **Precipitation** | `Precipitation_mm` | Sensor outages, data gaps |
| **Vegetation** | `ndvi_mean`, `evi_mean` | Cloud cover, satellite issues |
| **Geography** | (Usually complete) | Reference dataset |

### 1.2 Domain-Specific Missing Value Rules

**Crop Yield Missing Values:**
- **Missing `yield` when `production = 0`:** VALID - crop not harvested
- **Missing `production` but `area > 0`:** INVALID - data collection error
- **Both area and production = 0:** Consider as "crop not grown" (valid)

**Vegetation Missing Values:**
- **`valid_crop_fraction < 0.6`:** Treat as unreliable (functionally missing)
- **NDVI/EVI = -9999 or -3000:** Sensor error code, replace with NaN

**Precipitation Missing Values:**
- **Consecutive days missing:** Likely sensor failure
- **Single day missing:** Acceptable (interpolate from neighbors)

### 1.3 Handling Strategies

**Strategy Decision Matrix:**

| Missing % | Action | Rationale |
|-----------|--------|-----------|
| **0-5%** | Drop rows or impute with median | Minimal impact |
| **5-20%** | Impute with domain logic (seasonal median, spatial interpolation) | Preserve sample size |
| **20-50%** | Create "missing" indicator feature, then impute | Missingness itself may be informative |
| **>50%** | Drop column entirely | Too unreliable for modeling |

**Imputation Methods by Column Type:**

- **Precipitation:** Spatial interpolation from nearest 3 districts
- **Vegetation (NDVI/EVI):** Temporal interpolation (previous + next period average)
- **Crop Yield:** DO NOT impute - missing yield means crop wasn't grown
- **Categorical (season, crop_type):** Mode imputation (most common value)

---

## 2. Outlier Detection

### 2.1 Statistical Outliers

**Goal:** Identify values that are statistically extreme but may or may not be errors

**Methods:**

**A. IQR (Interquartile Range) Method**
- Calculate Q1 (25th percentile) and Q3 (75th percentile)
- IQR = Q3 - Q1
- Outliers: Values < (Q1 - 1.5 × IQR) or > (Q3 + 1.5 × IQR)
- **Use for:** Precipitation, vegetation indices, area under cultivation

**B. Z-Score Method**
- Calculate mean and standard deviation
- Z-score = (value - mean) / std_dev
- Outliers: |Z-score| > 3 (3 standard deviations from mean)
- **Use for:** Normally distributed continuous variables

**C. Modified Z-Score (Robust to Outliers)**
- Uses median absolute deviation (MAD) instead of std dev
- Modified Z-score = 0.6745 × (value - median) / MAD
- Outliers: |Modified Z-score| > 3.5
- **Use for:** Skewed distributions (yield, production)

### 2.2 Domain-Specific Outlier Rules

**Crop Yield Outliers:**

**Physical Constraints:**
- Yield must be ≥ 0 (negative yield = data error, drop)
- Yield must be ≤ biological maximum per crop type
  - Example: Rice typically 2-8 tons/hectare; >15 tons/hectare = likely error

**Relative Benchmarks:**
- Flag yields >3 std deviations from crop-specific state average
- Compare to national/state record yields for that crop
- Example: If max recorded wheat yield in Punjab is 6 tons/ha, flag 10 tons/ha

**Contextual Checks:**
- If `yield > 0` but `production = 0` or `area = 0` → data error
- If `yield = production / area` doesn't match reported yield → calculation error

**Precipitation Outliers:**

**Physical Constraints:**
- Precipitation must be ≥ 0 (negative = data error)
- Daily precipitation >500mm → extremely rare, verify (cloudbursts possible but rare)

**Seasonal Context:**
- Kharif (monsoon): Higher precipitation expected (100-300mm/month normal)
- Rabi (winter): Lower precipitation (20-50mm/month normal)
- Flag days with >200mm in non-monsoon season

**Vegetation Index Outliers:**

**Valid Ranges:**
- NDVI: Valid range [-1, 1], typical vegetation [0.2, 0.8]
- EVI: Valid range [-1, 1], typical vegetation [0.2, 0.8]
- Values outside [-1, 1] = sensor error, replace with NaN

**Quality Flags:**
- `valid_crop_fraction < 0.3` → Discard (too much cloud/noise)
- NDVI/EVI = 0 and `valid_crop_fraction` high → Likely bare soil (valid)

**Geography Outliers:**

**India Boundary Checks:**
- Latitude: Valid range [8°N, 35°N] (India's extent)
- Longitude: Valid range [68°E, 97°E]
- Points outside this box → data error (wrong country)

**District Boundary Checks:**
- Calculate centroid for each district
- Flag points >100km from district centroid (likely GPS error)

### 2.3 Outlier Handling Decision Framework

**Step 1: Investigate Before Removing**
- Is it a true extreme value (rare but real) or data error?
- Check original data source and documentation
- Cross-reference with external sources (government reports, news)

**Step 2: Classification**

| Type | Definition | Action |
|------|------------|--------|
| **Error** | Physically impossible or contradicts other data | Remove or correct |
| **True Extreme** | Rare but plausible (drought, record harvest) | Keep, but may transform |
| **Measurement Error** | Typo, decimal error (50 → 5000) | Correct if original value known |

**Step 3: Handling Strategies**

**For Modeling:**
- **Winsorize:** Cap at 1st/99th percentile (preserve records, limit extreme influence)
- **Log Transform:** Reduce outlier impact for right-skewed distributions (yield, production)
- **Create Indicator:** Binary flag "is_outlier" as additional feature
- **Exclude from Training:** Remove extreme outliers, but test model performance on them separately

**Document All Decisions:**
- Which outliers were removed and why
- Which were kept and why
- Impact on sample size (% records dropped)

---

## 3. Temporal Coverage Analysis

### 3.1 Year Coverage by Dataset

**Goal:** Ensure sufficient historical data for time-series modeling and validation

**Key Checks:**

**A. Temporal Extent**
- Identify min and max years per dataset
- Overlapping period across all datasets (critical for joins)
- Expected: 2016-2023 overlap (7 years post-filtering)

**B. Year Completeness**
- Check for missing years within the range
- Example: Data for 2016, 2017, 2019, 2020 (2018 missing) → gap

**C. Records Per Year**
- Count records per year to identify sparse years
- Flag years with <50% of expected records

**Temporal Coverage Table:**

| Dataset | Min Year | Max Year | Complete Years | Missing Years | Notes |
|---------|----------|----------|----------------|---------------|-------|
| Crop Yield | 1997 | 2023 | 27 | None | Full historical coverage |
| Precipitation | 2016 | 2026 | 10 | None | Daily data complete |
| Vegetation | 2016 | 2026 | 10 | None | 16-day intervals complete |
| Geography | N/A | N/A | N/A | N/A | Spatial reference only |

### 3.2 Seasonal Coverage

**Goal:** Verify all crop seasons have adequate data

**Crop Seasons Analysis:**
- Count records per season (Kharif, Rabi, Zaid)
- Identify crops grown in specific seasons
- Flag season-crop combinations with <3 years of data

**Expected Distribution:**
- Kharif (monsoon crops): ~60% of records (rice, cotton, soybean)
- Rabi (winter crops): ~35% of records (wheat, chickpea, mustard)
- Zaid (summer crops): ~5% of records (watermelon, vegetables)

**Red Flags:**
- Zero records for a major season (e.g., no Kharif data for a state)
- Crops appearing in wrong seasons (e.g., rice in Rabi)

### 3.3 Sub-Annual Granularity

**Precipitation:**
- Daily records for 2016-2026
- Check for consecutive missing days (>7 days = sensor outage)
- Aggregate to monthly/seasonal for modeling

**Vegetation:**
- 16-day intervals (MODIS satellite frequency)
- ~23 observations per year expected
- Check for gaps >32 days (2+ consecutive periods missing)

**Recommendation:**
- Minimum 5 years of continuous data per district required for time-series forecasting
- Flag districts with <5 years for exclusion from temporal models

---

## 4. Spatial Coverage Analysis

### 4.1 Geographic Completeness

**Goal:** Identify districts/states with insufficient data coverage

**State-Level Coverage:**
- List states present in all datasets (post-filtering)
- Expected: ~28 states after removing states missing from any dataset
- Rank states by number of districts covered

**District-Level Coverage:**
- Count unique districts per state
- Compare to official district counts (Census 2011: 640 districts)
- Expected coverage: ~500-550 districts (some small/new districts missing)

**Coverage Metrics:**

| Metric | Calculation | Threshold |
|--------|-------------|-----------|
| **State Coverage** | (States with data) / (Total states in India) | >80% acceptable |
| **District Coverage** | (Districts with data) / (Total districts) | >75% acceptable |
| **Major Crop States** | Coverage for top 10 producing states | 100% required |

**Top Agricultural States (Must Have):**
- Uttar Pradesh, Punjab, Haryana (wheat belt)
- West Bengal, Andhra Pradesh (rice)
- Maharashtra, Gujarat, Madhya Pradesh (diverse crops)

### 4.2 Crop Distribution by Region

**Goal:** Ensure regional crop diversity is captured

**Analysis:**
- Count unique crops per state
- Identify state-crop specializations (e.g., Punjab = wheat, Kerala = spices)
- Flag states with <10 crop types (possible data gap)

**Regional Crop Expectations:**

| Region | Expected Major Crops | Districts |
|--------|---------------------|-----------|
| **North (Punjab, Haryana)** | Wheat, rice, sugarcane | 50+ |
| **South (TN, AP, Karnataka)** | Rice, millets, pulses, cotton | 100+ |
| **West (Maharashtra, Gujarat)** | Cotton, soybean, groundnut | 80+ |
| **East (WB, Odisha, Bihar)** | Rice, jute, vegetables | 120+ |
| **Central (MP, Chhattisgarh)** | Wheat, rice, pulses | 100+ |

### 4.3 Spatial Gaps and Clusters

**Spatial Clustering Analysis:**
- Identify contiguous regions with missing data
- Check if missing districts are geographically clustered (border districts, hilly terrain)

**Common Missing Patterns:**
- **Hill states:** Himachal Pradesh, Uttarakhand (terrain challenges)
- **Northeast states:** Often excluded from national surveys
- **Union territories:** Small area, different admin structure

**Impact Assessment:**
- Missing districts represent what % of total agricultural area?
- Missing districts represent what % of total production?
- If <5% of production affected, acceptable data loss

---

## 5. Data Consistency Checks

### 5.1 Cross-Dataset Consistency

**Goal:** Verify data is internally consistent across datasets

**State/District Alignment:**
- All datasets should have same set of states/districts after standardization
- Run assertion: `crop_yield_states == precipitation_states == vegetation_states`

**Temporal Alignment:**
- Check overlapping years across datasets
- Verify join keys exist: (district_id, year, season)

**Referential Integrity:**
- All district_ids in fact tables must exist in geography dimension
- All crop_ids (if using) must exist in crop dimension

### 5.2 Within-Dataset Consistency

**Crop Yield Internal Consistency:**

**Yield Calculation Check:**
```
Reported Yield = Production / Area
```
- Calculate yield from production and area
- Compare to reported yield
- Flag records where difference >10% (calculation errors)

**Logical Constraints:**
- If area = 0, then production and yield must also = 0
- If production = 0, yield can be 0 OR missing (crop failure)

**Temporal Consistency:**
- Year-over-year changes >200% (doubling or halving) → flag for review
- Check if extreme changes match known events (drought, policy changes)

**Vegetation Internal Consistency:**

**Index Correlation:**
- NDVI and EVI should be highly correlated (r > 0.85)
- If correlation <0.7 for a district, possible data quality issue

**Valid Crop Fraction Logic:**
- If `valid_crop_fraction = 1.0`, NDVI/EVI should not be null
- If NDVI/EVI are null, `valid_crop_fraction` should be 0

---

## 6. Data Completeness Scoring

### 6.1 Record-Level Completeness

**Goal:** Calculate completeness score per record

**Formula:**
```
Completeness Score = (Non-null columns) / (Total columns) × 100%
```

**Thresholds:**
- **>90%:** High quality, use as-is
- **70-90%:** Medium quality, impute missing values
- **<70%:** Low quality, consider excluding from training

**Per-Dataset Critical Columns:**

**Crop Yield:**
- Critical: `year`, `state`, `district`, `crop_name`, `season`, `yield`
- Optional: `area`, `production` (can be derived from yield)

**Precipitation:**
- Critical: `Date`, `state`, `district`, `Precipitation_mm`

**Vegetation:**
- Critical: `date`, `state`, `district`, `ndvi_mean`, `evi_mean`, `valid_crop_fraction`

**Geography:**
- Critical: `state`, `district`, `Latitude`, `Longitude`

### 6.2 District-Level Data Sufficiency

**Goal:** Identify districts with insufficient data for modeling

**Sufficiency Criteria:**

| Metric | Threshold | Rationale |
|--------|-----------|-----------|
| **Years of Data** | ≥5 years | Minimum for temporal patterns |
| **Crops per District** | ≥5 crops | Crop diversity for recommendations |
| **Seasonal Coverage** | All seasons present | Full crop cycle coverage |
| **Vegetation Coverage** | ≥80% periods with valid data | Sufficient NDVI/EVI |

**District Quality Score:**
```
Quality Score = (Years Available / 7) × 0.4 
              + (Crops Available / 10) × 0.3
              + (Seasonal Coverage) × 0.3
```
- Score >0.7: Tier 1 districts (high priority for modeling)
- Score 0.4-0.7: Tier 2 districts (use with caution)
- Score <0.4: Tier 3 districts (exclude from training)

### 6.3 Crop-Level Data Sufficiency

**Goal:** Identify crops with insufficient data for crop-specific models

**Crop Sufficiency Criteria:**
- **Districts Growing Crop:** ≥20 districts (spatial diversity)
- **Years of Data:** ≥5 years (temporal stability)
- **Records per Year:** ≥50 records/year (sample size)

**Crop Tiers:**
- **Tier 1 (Major Crops):** Rice, wheat, cotton, sugarcane, maize → Full models
- **Tier 2 (Regional Crops):** Pulses, oilseeds, millets → Simplified models
- **Tier 3 (Specialty Crops):** Spices, fruits, vegetables → Exclude or group

---

## 7. Outlier and Anomaly Patterns

### 7.1 Known Agricultural Events

**Goal:** Distinguish true anomalies from data errors

**Historical Events to Check:**

**Droughts:**
- 2002-2003: Severe drought in Rajasthan, Gujarat
- 2015-2016: Maharashtra drought
- 2018-2019: Tamil Nadu, Karnataka drought

**Expected Data Patterns:**
- Low precipitation in affected states/years
- Low NDVI/EVI (vegetation stress)
- Low crop yields (especially rain-fed crops)

**Policy Changes:**
- 2016: Demonetization impact on input purchases
- 2018-2020: MSP (Minimum Support Price) changes

**Validation:** If extreme values align with known events, they are likely REAL, not errors.

### 7.2 Systematic Data Quality Issues

**Reporting Biases:**
- Round number bias: Yields reported as 10, 15, 20 (rounded, not measured precisely)
- Zero inflation: Excess zero values (crop not grown vs. data not collected)

**Seasonal Patterns:**
- Kharif yields should be higher in regions with strong monsoons
- Rabi yields should be higher in irrigated areas

**Detection Methods:**
- Histogram analysis: Check for spikes at round numbers
- Time series plots: Visual inspection for systematic gaps

---

## 8. Quality Acceptance Criteria

### 8.1 Go/No-Go Thresholds for Feature Engineering

**Minimum Acceptable Quality:**

| Metric | Threshold | Action if Below Threshold |
|--------|-----------|---------------------------|
| **Overall Completeness** | >85% records usable | Re-examine data sources |
| **Key Column Missing** | <10% missing for critical columns | Impute or drop column |
| **Temporal Coverage** | ≥5 consecutive years | Limit to time-series models |
| **Spatial Coverage** | ≥75% districts | Focus on covered regions |
| **Outlier Rate** | <5% extreme outliers | Investigate and handle |

### 8.2 Quality Report Summary Template

**Section 1: Overview**
- Total records per dataset
- Completeness scores
- Overall quality grade (A/B/C/D/F)

**Section 2: Missing Value Summary**
- Columns with >10% missing
- Recommended imputation strategy

**Section 3: Outlier Summary**
- Number of outliers detected per method
- Recommended handling (remove, winsorize, keep)

**Section 4: Coverage Assessment**
- States/districts with insufficient data
- Years/seasons with gaps

**Section 5: Recommendations**
- Which records to exclude from training
- Which columns to drop
- Which districts to prioritize

---

## 9. Validation Checklist

Before proceeding to feature engineering, verify:

### 9.1 Missing Value Analysis Complete
- [ ] Missing counts calculated per column and dataset
- [ ] Missing patterns visualized (heatmaps, time series)
- [ ] Imputation strategy defined for each column
- [ ] Records with >30% missing flagged for exclusion

### 9.2 Outlier Detection Complete
- [ ] Statistical outliers identified (IQR, Z-score)
- [ ] Domain-specific outliers flagged (physical constraints)
- [ ] Outliers investigated (true extreme vs. error)
- [ ] Handling strategy documented (remove/winsorize/keep)

### 9.3 Coverage Analysis Complete
- [ ] Temporal coverage assessed (year gaps identified)
- [ ] Spatial coverage assessed (missing districts documented)
- [ ] Seasonal coverage verified (all seasons present)
- [ ] Crop coverage evaluated (major crops present)

### 9.4 Consistency Checks Complete
- [ ] Cross-dataset consistency verified (state/district alignment)
- [ ] Within-dataset consistency checked (yield = production/area)
- [ ] Referential integrity validated (all IDs in dimension tables)
- [ ] Temporal consistency checked (no impossible year-over-year changes)

### 9.5 Completeness Scoring Complete
- [ ] Record-level completeness calculated
- [ ] District-level sufficiency evaluated
- [ ] Crop-level sufficiency evaluated
- [ ] Quality tiers assigned (Tier 1/2/3 districts and crops)

### 9.6 Documentation Complete
- [ ] Quality report generated (summary statistics)
- [ ] Acceptance criteria evaluated (go/no-go decision)
- [ ] Data cleaning recommendations documented
- [ ] Next steps defined (feature engineering ready)

---

## 10. Common Issues and Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| **High Missing Rate (>30%)** | Column unusable | Drop column or use missingness as feature |
| **Systematic Missing Pattern** | Certain districts always missing | Investigate data collection process |
| **Extreme Outliers** | Values 10x larger than typical | Winsorize at 1st/99th percentile |
| **Temporal Gaps** | Missing years in middle of range | Interpolate or exclude district from time-series |
| **Spatial Clusters Missing** | Entire regions absent | Note limitation in model scope |
| **Zero Inflation** | Excess zero yields | Create binary "crop grown" flag before modeling |
| **Round Number Bias** | Yields at 10, 15, 20 | Note measurement precision limit |
| **Inconsistent Calculations** | Yield ≠ production/area | Recalculate yield, flag original errors |

---

## 11. Tool Recommendations

**Python Libraries:**

**Missing Value Analysis:**
- `missingno`: Missing data visualization
- `pandas.DataFrame.isnull()`: Basic missing checks

**Outlier Detection:**
- `scipy.stats.zscore()`: Z-score calculation
- `numpy.percentile()`: IQR calculation
- `sklearn.ensemble.IsolationForest`: Unsupervised outlier detection

**Visualization:**
- `seaborn.heatmap()`: Missing value patterns
- `matplotlib.pyplot.boxplot()`: Outlier visualization
- `plotly.express`: Interactive plots for exploration

**Automated Quality Profiling:**
- `pandas-profiling`: Auto-generate quality reports
- `Great Expectations`: Data validation framework

---

## 12. Next Steps After Quality Assessment

Once data quality assessment is complete and quality acceptance criteria are met:

1. **Document Findings:** Save quality report to `docs/data_quality_report.md`
2. **Apply Cleaning:** Implement recommended imputation and outlier handling
3. **Create Clean Datasets:** Save quality-controlled datasets to `data/processed/quality_controlled/`
4. **Feature Engineering:** Proceed to Phase 2 (temporal, spatial, lagged features)
5. **Model Training:** Use quality-scored districts for prioritized modeling

**Critical:** Do NOT skip data quality checks. Poor data quality is the #1 cause of model failure.

---

## Expected Runtime

| Section | Estimated Time | Notes |
|---------|----------------|-------|
| Missing Value Analysis | 3-5 minutes | Calculation + visualization |
| Outlier Detection | 5-8 minutes | Multiple methods, per-dataset |
| Temporal Coverage | 2-3 minutes | Grouping and counting |
| Spatial Coverage | 2-3 minutes | District/state aggregation |
| Consistency Checks | 3-5 minutes | Join validation |
| Completeness Scoring | 2-3 minutes | Per-record calculation |
| Visualization & Reporting | 5-10 minutes | Plots and summary tables |
| **Total** | **20-37 minutes** | Full notebook execution |

---

**Document Version:** 1.0  
**Created:** 2026-10-28  
**Purpose:** Reference guide for 03_data_quality.ipynb notebook  
**Next Phase:** Feature Engineering (Phase 2)
