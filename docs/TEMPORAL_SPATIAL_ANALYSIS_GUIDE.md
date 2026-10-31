# Temporal & Spatial Analysis Guide: All-Dataset Descriptive EDA

**Project:** dsba2026 Agricultural Analytics  
**Author:** Data Science Team  
**Date:** 2026-10-31  
**Purpose:** Reference guide for Phase 1 EDA - Temporal Analysis (04_temporal_analysis.ipynb) and Spatial Analysis (05_spatial_analysis.ipynb)

---

## Executive Summary

This document provides a guide for the **temporal and spatial analysis** notebooks - the last two notebooks in the EDA sequence after district name audit and data profiling. Notebook 04 describes how crop yields, rainfall and vegetation change **over time**; notebook 05 compares them **across states and districts**. Both notebooks read all four processed datasets, need no input settings, and keep all code inside the notebook (no helper modules).

**Prerequisites:**
- ✅ Raw caches built (00_data_format_process.ipynb)
- ✅ District name audit completed (01_district_name_audit.ipynb)
- ✅ Processed datasets available in `data/processed/` (CSV + pickle format)
- ✅ Project `.venv` kernel selected (`requirements-eda.txt`)

**Objectives:**
1. Report coverage (rows, states, districts) for every processed dataset
2. Calculate crop yield as production / area within each crop and season
3. Summarise rainfall and vegetation (NDVI/EVI) by month (04) and by year (05)
4. Explain why NDVI is missing and keep usable-observation counts beside every mean
5. Compare states and districts for the latest shared year (05)
6. Export all summary tables and charts, and record findings and limitations

---

## What is Temporal & Spatial Analysis?

**Temporal Analysis** examines how values change over time:
- **Trends:** Is yield rising or falling across crop years?
- **Seasonality:** Which months are wettest and greenest?
- **Anomalies:** Which years stand out (e.g. drought years)?
- **Coverage over time:** How many districts report in each year?

**Spatial Analysis** examines how values differ across places:
- **Coverage:** Which states/districts are present in each dataset?
- **Rankings:** Which states have the highest and lowest yields?
- **Climate maps:** Where is it wettest and greenest?
- **Associations:** Do wetter districts also have higher NDVI?

**Why It Matters:**
- Shows whether the data supports the planned yield models
- Reveals coverage gaps that would bias trends or rankings
- Gives the team agreed, numbers-backed findings before feature engineering

**Difference from Modelling Features:**
- **This EDA** (04/05): Calendar months/years, descriptive summaries, no joins to crop seasons
- **Feature Engineering** (next phase): Crop-season windows (Kharif Jun-Sep, Rabi Oct-Mar) matched to crop years

---

## Datasets Overview

Both notebooks read the 4 processed datasets created by notebook 01:

| Dataset | Rows | States | Districts | Time Coverage | Key Columns |
|---------|------|--------|-----------|---------------|-------------|
| **Crop Yield** | 286,784 | 26 | 399 | Crop years 1997-98 to 2022-23 | year, crop_name, season, area, production |
| **Rainfall** | 1,490,016 | 26 | 408 | 2016-06-01 to 2026-05-31 (daily) | Date, Precipitation_mm |
| **Vegetation** | 127,725 | 26 | 513 | 2016 to Oct 2026 (16-day composites) | date, period_end, ndvi_mean, evi_mean, quality_status |
| **Geography** | 784,562 | 35 | 594 | Static | state, district, Latitude, Longitude |

**Location:** `data/processed/` (relative to project root)

**Formats:** Notebooks 04/05 read the CSV files

**Overlap:** Crop and climate data overlap only for crop years **2016-2022**.

---

## Notebook Structure (04_temporal_analysis.ipynb)

### Section 1: Setup & Load Data

**Purpose:** Find the project root, import libraries and load all processed datasets

```python
current = Path.cwd().resolve()
# Find the project folder, starting from the notebook's current folder.
for folder in [current, *current.parents]:
    if (folder / "data/processed").is_dir() and (folder / "notebooks").is_dir():
        project_root = folder
        break
else:
    raise FileNotFoundError("Start this notebook inside the project folder.")

processed_dir = project_root / "data/processed"
output_dir = processed_dir / "eda/temporal_all_datasets"
output_dir.mkdir(parents=True, exist_ok=True)

crop_df = pd.read_csv(processed_dir / "crop_yield.csv")
rain_df = pd.read_csv(processed_dir / "precipitation.csv")
vegetation_df = pd.read_csv(processed_dir / "vegetation.csv")
geography_df = pd.read_csv(processed_dir / "geography.csv")
```

**Why search for the root?**
- Works whether Jupyter starts in the project root or in `notebooks/eda/`
- No hardcoded user paths

---

### Section 2: Dataset Coverage & Key Checks

**Purpose:** Count rows, states and districts per dataset and assert unique observation keys

```python
for name, frame in datasets.items():
    district_count = len(frame[["state", "district"]].drop_duplicates())
    summary_rows.append({"dataset": name, "rows": len(frame),
                         "states": frame["state"].nunique(), "districts": district_count})
assert not crop_df.duplicated(["state", "district", "year", "crop_name", "season"]).any()
assert not rain_df.duplicated(["state", "district", "Date"]).any()
assert not vegetation_df.duplicated(["state", "district", "date"]).any()
```

**Expected Output:**
```
      dataset     rows  states  districts
0  Crop yield   286784      26        399
1    Rainfall  1490016      26        408
2  Vegetation   127725      26        513
3   Geography   784562      35        594
```

---

### Section 3: Crop Yield Calculation

**Purpose:** Calculate yield only from valid tonnes and hectares

```python
year_parts = crop_df["year"].str.extract(r"^(\d{4})-(\d{4})$").apply(pd.to_numeric, errors="coerce")
crop_df["crop_year"] = year_parts[0]
valid_year = year_parts[1] == year_parts[0] + 1
valid_numbers = np.isfinite(crop_df["area"]) & np.isfinite(crop_df["production"])
valid_amounts = (crop_df["area"] > 0) & (crop_df["production"] >= 0)
valid_units = (crop_df["area_unit"] == "Hectare") & (crop_df["production_unit"] == "Tonnes")
non_tonne_crops = ["Coconut", "Cotton(Lint)", "Kapas", "Jute", "Mesta", "Jute & Mesta", "Sannhamp"]
valid_season = crop_df["season"] != "Total"  # "Total" repeats the sum of the other seasons
valid_crop = (valid_year & valid_numbers & valid_amounts & valid_units & valid_season
              & ~crop_df["crop_name"].isin(non_tonne_crops))
crop_df = crop_df.loc[valid_crop].copy()
crop_df["yield_t_ha"] = crop_df["production"] / crop_df["area"]
```

**Expected Output:**
```
Crop rows excluded from yield calculations: 43290
```

**Exclusion Rules:**
1. **"Total" season** (27,814 rows) - it is the sum of the other seasons for the same district/crop/year, so keeping it double-counts
2. **Crops not measured in tonnes** - coconut is in nuts, cotton/jute/mesta in bales, even though the unit column says Tonnes
3. **Missing production / non-positive area** - yield cannot be calculated

**Key Rule:** Crop names and seasons are never combined; yield is total production / total area within one crop and season.

---

### Section 4: Crop Trends Over Time

**Purpose:** Summarise every state/crop/season/year and chart the four largest groups by area

```python
crop_state_year = crop_df.groupby(["state", "crop_name", "season", "crop_year"], as_index=False).agg(
    area_ha=("area", "sum"), production_t=("production", "sum"), districts=("district", "nunique")
)
crop_state_year["yield_t_ha"] = crop_state_year["production_t"] / crop_state_year["area_ha"]

top_groups = crop_df.groupby(["crop_name", "season"])["area"].sum().nlargest(4).index
# Each panel: yield line + dashed "districts reporting" line on a second axis (ax.twinx())
```

**Expected Output (chart `01_crop_trends.png`):**
```
Group             Yield 1997   Yield 2022   Districts reporting
Wheat - Rabi        2.49 t/ha    3.67 t/ha    271-328
Rice - Kharif       2.34 t/ha    3.03 t/ha    167-320
Soyabean - Kharif   1.10 t/ha    1.18 t/ha     78-177
Bajra - Kharif      0.76 t/ha    1.54 t/ha    168-243
```

**Key Observations to Document:**
1. **2002 dip** across all Kharif crops - consistent with the 2002 monsoon drought
2. **2009 dip** coincides with fewer reporting districts - coverage and weather cannot be separated
3. **Changing district counts** mean part of each trend reflects coverage, not real change

---

### Section 5: Monthly Rainfall

**Purpose:** Sum daily rainfall by district/month; keep incomplete months missing

```python
rain_df["month"] = rain_df["date"].dt.to_period("M").dt.to_timestamp()
rain_monthly = rain_df.groupby(["state", "district", "month"], as_index=False).agg(
    observed_days=("rain_mm", "count"), observed_rain_mm=("rain_mm", lambda values: values.sum(min_count=1))
)
rain_monthly["expected_days"] = rain_monthly["month"].dt.days_in_month
complete_month = rain_monthly["observed_days"] == rain_monthly["expected_days"]
rain_monthly["rain_mm"] = rain_monthly["observed_rain_mm"]
rain_monthly.loc[~complete_month, "rain_mm"] = np.nan
```

**Expected Output:**
```
Unusable rain dates: 0 Missing rain values: 0
```

**Chart:** `02_monthly_rainfall.png` - state × month heatmap (state means give each complete district equal weight)

**Key Observation:** Mean district rainfall peaks in **July (348 mm)** and is lowest in **February (12 mm)**.

---

### Section 6: Vegetation Quality & Missing NDVI

**Purpose:** Keep only source-approved NDVI and explain every missing value

```python
approved_by_source = vegetation_df["quality_status"] == "valid"
valid_ndvi = vegetation_df["ndvi_mean"].between(-1, 1)
valid_fraction = vegetation_df["valid_crop_fraction"].between(0, 1)
valid_interval = vegetation_df["period_end"] > vegetation_df["date"]
usable = approved_by_source & valid_ndvi & valid_fraction & valid_interval
vegetation_df["ndvi_used"] = vegetation_df["ndvi_mean"].where(usable)
```

**Expected Output:**
```
           quality_status  records  published_ndvi  raw_ndvi  usable_ndvi
0  low_valid_crop_fraction    40464               0     40464            0
1     missing_source_image     1026               0         0            0
2       no_mapped_cropland     1528               0         0            0
3          no_valid_pixels    11874               0         0            0
4                    valid    72833           72833     72833        72833
```

**Why NDVI is Missing (54,892 records):**

| Source Quality Status | Missing NDVI | Meaning |
|-----------------------|-------------:|---------|
| `low_valid_crop_fraction` | 40,464 | Raw NDVI exists, but the source rejected its usable-area coverage |
| `no_valid_pixels` | 11,874 | No valid pixels (mostly cloud) |
| `no_mapped_cropland` | 1,528 | No mapped cropland in the district |
| `missing_source_image` | 1,026 | Satellite image missing |

**Decision:** Use the source's `valid` flag; do **not** add the older `valid_crop_fraction >= 0.6` rule (it would reject another 24,777 source-approved rows). Missing NDVI is never filled with zero, raw NDVI, interpolation or a global mean.

---

### Section 7: Monthly NDVI/EVI with Usable Share

**Purpose:** Average available composites by start month and keep usable counts

```python
vegetation_monthly = vegetation_df.groupby(["state", "district", "month"], as_index=False).agg(
    observed_composites=("date", "size"), usable_composites=("ndvi_used", "count"),
    ndvi_mean=("ndvi_used", "mean"), evi_mean=("evi_used", "mean")
)
vegetation_monthly["usable_share"] = vegetation_monthly["usable_composites"] / vegetation_monthly["observed_composites"]
```

**Chart:** `03_monthly_ndvi_and_coverage.png` - NDVI heatmap beside the usable-share heatmap

**Key Observations:**
- NDVI is lowest in **April-May (0.35)** and highest in **August (0.64)**
- Only **13% (July)** and **27% (August)** of composites are usable vs **83% (April)** - monsoon NDVI is indicative only

---

### Section 8: Rainfall-NDVI Overlap & Export

**Purpose:** Outer-join monthly rainfall and NDVI by state/district/month to measure overlap (not a crop-season join), then save all tables

```python
climate_monthly = rain_monthly.merge(vegetation_monthly, on=["state", "district", "month"],
    how="outer", validate="one_to_one", indicator="source_match")
climate_monthly["usable_pair"] = climate_monthly["rain_mm"].notna() & climate_monthly["ndvi_mean"].notna()
```

**Expected Output:** 34,268 of 66,690 district-months have both complete rainfall and usable NDVI.

**Saved to `data/processed/eda/temporal_all_datasets/`:** 11 CSVs (`source_summary`, `crop_state_year`, `crop_trends`, `rain_district_month`, `rain_state_month`, `vegetation_district_month`, `vegetation_state_month`, `ndvi_quality`, `ndvi_missing_columns`, `climate_monthly`, `climate_overlap`) + 3 charts

---

## Notebook Structure (05_spatial_analysis.ipynb)

### Section 1: Setup, Load Data & Coverage Checks

**Purpose:** Same root discovery, loading and key checks as notebook 04 (05 runs independently)

**Output Folder:** `data/processed/eda/spatial_all_datasets/`

**Expected Output:** Same dataset summary as 04 Section 2.

---

### Section 2: District Coverage by State

**Purpose:** Compare how many districts each state has in every dataset

```python
for name, frame in datasets.items():
    counts = frame[["state", "district"]].drop_duplicates().groupby("state").size().rename(name)
    coverage_parts.append(counts)
state_coverage = pd.concat(coverage_parts, axis=1).fillna(0).astype(int)
```

**Expected Output (sample):**
```
                Crop yield  Rainfall  Vegetation  Geography
Andhra Pradesh          12        13          23         23
Assam                   11        13          23         23
Bihar                   36        34          37         37
Chhattisgarh             4         7          16         16
```

**Chart:** `01_state_coverage.png`

**Key Observation:** States missing from crop/rain/vegetation after mapping: Odisha, Uttarakhand, J&K, Arunachal Pradesh and some UTs. Telangana districts still sit under Andhra Pradesh (pre-2014 boundaries).

---

### Section 3: Crop Yield, Annual Rainfall & Annual NDVI

**Purpose:** Apply the same crop yield rules as 04 Section 3, then build district/year climate tables

```python
rain_df["calendar_year"] = rain_df["date"].dt.year
rain_annual = rain_df.groupby(["state", "district", "calendar_year"], as_index=False).agg(
    observed_days=("rain_mm", "count"), observed_rain_mm=("rain_mm", lambda values: values.sum(min_count=1))
)
year_start = pd.to_datetime(rain_annual["calendar_year"].astype(str) + "-01-01")
rain_annual["expected_days"] = 365 + year_start.dt.is_leap_year.astype(int)
complete_year = rain_annual["observed_days"] == rain_annual["expected_days"]
rain_annual.loc[~complete_year, "rain_mm"] = np.nan

vegetation_annual = vegetation_df.groupby(["state", "district", "calendar_year"], as_index=False).agg(
    observed_composites=("date", "size"), usable_composites=("ndvi_used", "count"),
    ndvi_mean=("ndvi_used", "mean"), evi_mean=("evi_used", "mean"),
    first_observation=("date", "min"), last_observation=("date", "max")
)
```

**Rules:**
- Annual rainfall only when **every calendar day** is present (2016 and 2026 are partial, so they stay missing)
- NDVI uses the same source-approved filter as 04 Section 6

---

### Section 4: Select the Comparison Year

**Purpose:** Pick the latest year present in crop, complete rainfall and vegetation automatically

```python
shared_years = crop_years & rain_years & vegetation_years
comparison_year = int(max(shared_years))
```

**Expected Output:**
```
Crop label: 2022-2023; climate: calendar 2022.
These periods are not assumed to be identical crop seasons.
```

---

### Section 5: State Crop Comparisons

**Purpose:** Compare state yields for the four largest crop/season groups by area

```python
crop_state = crop_latest.groupby(["state", "crop_name", "season"], as_index=False).agg(
    area_ha=("area", "sum"), production_t=("production", "sum"), districts=("district", "nunique")
)
crop_state["yield_t_ha"] = crop_state["production_t"] / crop_state["area_ha"]
top_groups = crop_state.groupby(["crop_name", "season"])["area_ha"].sum().nlargest(4).index
# Chart only states with >= 3 districts; all states remain in the exported CSV
values = crop_state.loc[(crop_state["crop_name"] == crop) & (crop_state["season"] == season)
                        & (crop_state["districts"] >= 3)].sort_values("yield_t_ha")
```

**Expected Output (chart `02_crop_state_comparisons.png`):**
```
Group                     Highest                          Lowest
Wheat - Rabi              Haryana 4.74, Punjab 4.67 t/ha   Assam 1.24, Karnataka 1.33 t/ha
Rice - Kharif             Punjab 4.34, Haryana 3.61 t/ha   Manipur 1.25 t/ha
Soyabean - Kharif         (see chart)
Rapeseed & Mustard - Rabi (see chart)
```

**Why the >=3 District Rule?** States with 1-2 districts (e.g. Chandigarh) give unstable rankings.

---

### Section 6: District Climate Maps

**Purpose:** Map annual rainfall and NDVI using approximate district markers

```python
locations = geography_df.loc[valid_points].groupby(["state", "district"], as_index=False).agg(
    latitude=("Latitude", "mean"), longitude=("Longitude", "mean")
)
map_data = locations.merge(rain_latest, on=["state", "district"], how="left", validate="one_to_one")
map_data = map_data.merge(vegetation_latest.drop(columns="calendar_year"), on=["state", "district"],
    how="left", validate="one_to_one")
```

**Expected Output:**
```
Invalid coordinate rows excluded: 0
Geography markers: 594 Rain values: 408 NDVI values: 505
```

**Chart:** `03_district_climate_maps.png` - grey crosses mark districts with no usable value

**Note:** Markers are means of boundary points, **not** true centroids.

---

### Section 7: State & District Comparison Tables

**Purpose:** List rainfall, NDVI and usable counts together before interpreting the maps

```python
district_comparison = rain_latest.merge(vegetation_latest, on=["state", "district", "calendar_year"],
    how="outer", validate="one_to_one")
state_comparison = district_comparison.groupby("state", as_index=False).agg(
    district_records=("district", "nunique"), complete_rain_districts=("rain_mm", "count"),
    ndvi_districts=("ndvi_mean", "count"), mean_district_rain_mm=("rain_mm", "mean"),
    mean_district_ndvi=("ndvi_mean", "mean"), usable_composites=("usable_composites", "sum")
)
```

**Key Observations:**
- **Kerala:** highest mean rainfall (3,295 mm) and NDVI (0.634)
- **Rajasthan:** lowest mean NDVI (0.372)
- Rainfall and NDVI correlate positively across districts (**r = 0.627**, 400 districts) - not tested against yield

**Saved to `data/processed/eda/spatial_all_datasets/`:** 10 CSVs (`source_summary`, `state_coverage`, `crop_district_year`, `rain_district_year`, `vegetation_district_year`, `crop_state_comparison`, `ndvi_quality`, `district_comparison`, `state_comparison`, `map_data`) + 3 charts

---

### Section 8: Findings & Limitations

**Purpose:** Both notebooks end with a markdown cell recording findings and limitations, with the numbers from the current run. Recheck the numbers whenever the processed inputs change.

---

## Key Validation Checklist

After running both notebooks, verify:

- [ ] **Both notebooks run end-to-end** (Restart Kernel → Run All, no errors)
- [ ] **Dataset summary matches** (286,784 / 1,490,016 / 127,725 / 784,562 rows)
- [ ] **Crop rows excluded = 43,290** ("Total" season, non-tonne crops, invalid amounts)
- [ ] **No "Total" season or coconut** in `crop_trends.csv` / `crop_state_comparison.csv`
- [ ] **Unique keys asserted** (crop, rainfall, vegetation, climate tables)
- [ ] **Empty NDVI groups stay missing** (final-cell assert passes)
- [ ] **Comparison year = 2022** (crop 2022-23, calendar 2022 climate)
- [ ] **Charts show** Wheat/Rabi and Rice/Kharif (not Rice/Total)
- [ ] **Outputs saved** (11 CSVs + 3 PNGs in 04; 10 CSVs + 3 PNGs in 05)
- [ ] **Findings cells updated** if any number changed

---

## Common Issues & Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| **Root not found** | `FileNotFoundError: Start this notebook inside the project folder` | Open Jupyter from the project or `notebooks/eda/` folder |
| **Processed files missing** | `FileNotFoundError` on `crop_yield.csv` | Run notebooks 00 → 01 first |
| **Wrong kernel** | `ModuleNotFoundError` | Select the project `.venv` kernel (`requirements-eda.txt`) |
| **Old notebooks reappear** | 04/05 overwritten with helper-based versions | Do not run `.venv/build_analysis_notebooks.py`; it builds the archived design |
| **Rice/Total in charts** | Double-counted rice panel | Check the `valid_season` filter in the crop yield cell |
| **Huge yields (e.g. 19,008 t/ha)** | Coconut/cotton in tables | Check the `non_tonne_crops` filter |
| **Findings don't match outputs** | Numbers in markdown differ from tables | Re-run both notebooks, then update the findings cells |

---

## Interpretation Best Practices

### Yield = Production / Area (Not Mean of Yields)

**Wrong:**
```python
# Gives a 10-hectare district the same weight as a 100,000-hectare district
crop_df.groupby(["crop_name", "season"])["yield"].mean()
```

**Right:**
```python
grouped = crop_df.groupby(["crop_name", "season"])[["production", "area"]].sum()
grouped["yield_t_ha"] = grouped["production"] / grouped["area"]
```

### When to Trust a Number?

**Trust more when:**
- Districts reporting stay stable across years
- Usable NDVI share is high (dry-season months)
- A state has >= 3 districts in the group

**Trust less when:**
- District counts jump between years (e.g. 2009)
- Monsoon NDVI (13-27% usable)
- Calendar-year climate is compared with crop-year yields

---

## Next Steps

After completing temporal and spatial analysis (04/05), proceed to:

**Next Phase: Feature Engineering**
- Match climate to crop seasons (Kharif: Jun-Sep rainfall; Rabi: Oct-Mar rainfall) for crop years 2016-2022
- Seasonal rainfall totals, departures from average, dry spells
- Lagged yields (previous 1-3 years) using the 1997+ crop history
- District mean-yield baseline for model comparison

**Open Data Issues (outside 04/05):**
- District mapping in notebook 01 drops ~37% of crop rows and ~42% of rainfall rows (Odisha, Telangana, Uttarakhand, J&K)
- Some reviewed mappings are wrong (e.g. Namchi → North Sikkim, Kakinada → Karimnagar)

**Reference Documents:**
- [CLAUDE.md](../CLAUDE.md) - Project architecture guide
- [DATA_STANDARDIZATION_STRATEGY.md](./DATA_STANDARDIZATION_STRATEGY.md) - District name audit guide
- [DATA_PROFILING_GUIDE.md](./DATA_PROFILING_GUIDE.md) - Data profiling guide
- [notebooks/eda/archive/README.md](../notebooks/eda/archive/README.md) - Previous detailed 04/05 notebooks

---

## Expected Runtime

- **Total Time:** under 1 minute for both notebooks
- 04_temporal_analysis.ipynb: ~11 seconds
- 05_spatial_analysis.ipynb: ~9 seconds

**Hardware:** MacBook Pro, 16GB RAM, M1 Pro chip

---

## References

- **Pandas GroupBy:** https://pandas.pydata.org/docs/user_guide/groupby.html
- **MODIS NDVI (MOD13Q1):** https://lpdaac.usgs.gov/products/mod13q1v061/
- **Matplotlib imshow (heatmaps):** https://matplotlib.org/stable/api/_as_gen/matplotlib.pyplot.imshow.html

---

**Document Version:** 1.0  
**Last Updated:** 2026-10-31  
**Maintained By:** Data Science Team
