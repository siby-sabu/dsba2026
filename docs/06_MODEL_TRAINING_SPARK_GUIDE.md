# Simple Crop Yield Forecast with Spark ML

**Notebook:** [`02_model_training_spark.ipynb`](../notebooks/modeling/02_model_training_spark.ipynb)  
**Input:** existing `data/features/crop_yield_ml_features.parquet`  
**Purpose:** a readable history-based forecast, compared honestly with simple rules.

## 1. What are we building?

For a crop recently grown in a district and season, estimate its yield in the next recorded crop year. One row means **state × district × crop × season × recorded crop year**.

The first question is: **does a learned model predict later recorded years better than reusing last year's yield?** The notebook compares two simple rules, Random Forest, and gradient boosting. The lowest validation log-RMSE wins. A simple rule can win too.

The supplied data ends in 2023, so the next-year forecast is **2024**. This is a historical demonstration, not a forecast for today's year. Partial 2023 coverage stays visible in each forecast's history fields.

Output is yield in **source-reported units per hectare**. Units are not independently verified. Do not label every crop's forecast as tonnes/hectare without checking its source.

## 2. Why history only?

Existing data is enough to train and evaluate this first version. More inputs are not automatically better inputs.

Earlier seasonal weather features have known problems: repeated rainfall after joining multiple satellite observations, inconsistent season dates, and early/mid/late NDVI copied from the same seasonal mean. Clipping also converted missing rainfall into an extreme value. This version excludes those columns and climate normals.

Current-year area and production are excluded from predictors because they are not reliably known before the season. Area is used only to reject invalid records.

This avoids those feature problems within this notebook. It does **not** repair upstream data, verify crop-year labels, validate publication dates, or correct suspicious target yields.

## 3. The complete flow

```text
Existing feature file
    → select location, recorded year, area, and yield
    → check keys and keep positive-yield records
    → build features from earlier recorded years
    → train through 2020; compare methods on 2021
    → refit the chosen method through 2021; evaluate on 2022
    → report every crop beside the last-year rule
    → fit the chosen method on all available years
    → forecast 2024 for combinations observed in 2021–2023
    → optionally export one versioned folder
```

The input must already exist. The upstream feature notebook currently lacks an explicit export step for this file; running it alone is not a documented rebuild of the supplied snapshot. Metadata records the input's SHA-256 so the exact snapshot can be identified.

## 4. Inputs and cleaning

| Required columns | Use |
|---|---|
| `state`, `district`, `crop_name`, `season`, `crop_year` | Identify one crop-year observation |
| `yield` | Target and past-yield history |
| `area` | Positive-area check; not a predictor |
| `centroid_lat`, `centroid_lon` | Approximate district location |

The notebook checks required columns and unique crop-year keys. It excludes missing/blank keys, missing years, non-finite or non-positive yields/areas, and summary season `Total`. Invalid coordinates cause an error; missing coordinates can be filled by training medians.

Only **positive recorded yields** are modeled. Zero yields need source review: they could be reporting codes, tiny rounded yields, or crop failures. `log1p(0)` is valid; excluding zero is a scope choice, not a mathematical requirement. This version cannot estimate crop-failure probability.

Large yields are displayed for review, not silently corrected. Source examples include Groundnut at 599 source units/ha and Rice at 44.815 source units/ha. Agreement with production/area does not establish that a source record is correct. A log transform does not fix unit errors.

## 5. Features in plain language

Three categories and seven numbers are used:

| Feature | Meaning | Available when? |
|---|---|---|
| `crop_name`, `season`, `state` | Crop and regional context | When choosing a supported crop/season |
| `centroid_lat`, `centroid_lon` | Approximate district location | Static geography |
| `yield_lag1` | Yield in exactly Y−1 | When that report is available |
| `yield_roll3` | Mean of available yields in Y−3 through Y−1 | When those reports are available |
| `history_count` | Number of usable yields in that window, 0–3 | From available history |
| `history_age` | Y minus the latest observed year in that window | From available history |
| `has_lag1` | Whether the Y−1 observation exists | From available history |

Example: yields are 2 in 2020, 6 in 2022, and 10 in 2023; 2021 is missing.

| Target year | Previous-year yield | Three-year mean | History count | History age |
|---|---:|---:|---:|---:|
| 2022 | missing | 2 | 1 | 2 |
| 2023 | 6 | 4 | 2 | 1 |
| 2024 forecast | 10 | 8 | 2 | 1 |

The current target never contributes to its own features. A missing year stays missing. `add_history_features()` is shared by training and forecasting. The tree pipeline fills missing numbers with training medians; counts and flags preserve their missing-history context.

## 6. Compare methods fairly

| Method | Rule or settings |
|---|---|
| `last_year` | Previous-year yield → recent mean → training crop mean |
| `recent_mean` | Recent mean → training crop mean |
| `random_forest` | 100 trees, depth 10, seed 42 |
| `gbt` | 80 iterations, depth 4, step size 0.1, seed 42 |

Tree models share one pipeline: category encoding → numeric median imputation → feature assembly → regressor. Each stage is fitted only on its training partition. Baseline crop averages also use only that partition. An unscorable row causes evaluation to fail rather than being silently omitted.

The target is `log1p(yield)`. `expm1` returns the source yield scale, bounded at zero.

| Stage | Years in this snapshot | Purpose |
|---|---|---|
| Training | 2016–2020 | Fit the four candidates |
| Validation | 2021 | Select the lowest log-RMSE across all four |
| Development holdout | 2022 | Compare chosen method and last-year rule, both refitted through 2021 |
| Forecast fit | All usable years through 2023 | Refit the already chosen method |

Do not tune the method using the 2022 result. That year was already inspected during earlier project work, so it is not a fresh independent benchmark. A later complete year is needed for a stronger independent check.

| Metric | Meaning |
|---|---|
| Log-RMSE | Error on `log1p(yield)`; lower is better; used for selection |
| MAE | Average absolute miss in source units |
| RMSE | Gives larger misses more weight, also in source units |
| R² | Fit relative to variation in evaluated outcomes; can be negative or undefined |

Log-RMSE is **not** a direct percentage error. Pooled log-RMSE gives more weight to crops with more rows. Raw errors pooled across different crop scales need care.

`crop_report` retains **every** test crop: count, mean yield, MAE, RMSE, R², log-RMSE, and last-year comparison. The printed top ten are just a display. An average of per-crop log-RMSE is also printed, giving each represented crop equal weight in that summary.

### Measured results — 2026-11-13

The full notebook was executed with the existing 93,262-row feature snapshot. It retained **81,774** positive-yield records: **55,433** training rows, **11,021** validation rows, and **10,522** test rows. Artifact exports were disabled.

**The recent three-year mean won.** The learned tree models did not beat this simple rule on validation. Keeping the simpler winner is a valid outcome of model selection; adding model complexity is not an improvement by itself.

| Method | 2021 validation log-RMSE |
|---|---:|
| `recent_mean` | 0.2704 |
| `random_forest` | 0.2723 |
| `gbt` | 0.2846 |
| `last_year` | 0.3616 |

| Method, refitted through 2021 | 2022 log-RMSE | Pooled source-scale MAE | Pooled source-scale RMSE | Pooled R² |
|---|---:|---:|---:|---:|
| `last_year` | 0.2913 | 26.2032 | 375.5985 | 0.8869 |
| `recent_mean` | 0.2459 | 24.7357 | 355.7570 | 0.8985 |

The chosen rule has **15.6% lower test log-RMSE**, and improves that metric for **41 of 56 crops**. This is a reduction in the metric, not a claim that every prediction is 15.6% more accurate. Pooled raw-scale errors still mix crop scales.

| Crop | Test rows | Recent-mean log-RMSE | Last-year log-RMSE | Recent-mean R² |
|---|---:|---:|---:|---:|
| Maize | 675 | 0.1898 | 0.1935 | 0.8141 |
| Rice | 641 | 0.2228 | 0.2206 | 0.0740 |
| Wheat | 348 | 0.1115 | 0.1062 | 0.8622 |
| Groundnut | 368 | 0.3079 | 0.3150 | -0.0026 |
| Onion | 339 | 0.2322 | 0.2118 | 0.7967 |

Rice, Wheat, and Onion do not improve on the last-year rule's log-RMSE in this run. Groundnut has poor R² despite its log-RMSE improving; the suspicious source target remains unresolved. Do not describe one aggregate score as proof of quality for every crop.

The run prepared **11,957 forecasts for 2024**. Previous-year data is present for **4,798** and missing for **7,159**. These are forecasts from the historical snapshot, not new observations or forecasts for 2026.

Because `recent_mean` wins and forecast combinations all have recent history, `pred_yield` equals `yield_roll3`. Consequently, `change_vs_recent_pct` is zero by construction. It is **not** evidence that future yields will remain unchanged. This first version is a history-based expectation, not a learned trend or weather-response model.

Validation checks passed for exact-year gaps, excluding current/future target values, one-step forecast construction, unsupported future years, missing lookups, invalid comparison sizes, nonnegative forecasts, unique forecast keys, and notebook format. The managed execution session required an explicit local Spark/Hadoop username; this runtime setup was kept outside the notebook's model logic. These checks do not validate crop units, source outliers, or publication dates.

## 7. What questions can inference answer?

| Question | Supported answer | Boundary |
|---|---|---|
| What yield might this district's crop have next recorded year? | One point forecast | Combination must occur in the preceding three years |
| Is it above or below recent local performance? | Percentage difference from available three-year mean | Prediction, not a measured future outcome |
| How do districts compare for the same crop and season? | Compare forecast rows | Keep crop and source unit consistent |
| Which local crops look above their own state averages? | Relative-performance shortlist | Not a profit or planting recommendation |
| Is the previous year's report present? | `history_status` and `yield_lag1` | Missing stays visible |
| How much recent history exists? | `history_count` and `history_age` | Not confidence probabilities |
| How well did the method work for this crop? | Its 2022 report against the last-year rule | Read sample counts and source issues too |
| Can an API serve these outputs? | Yes, using exported batch tables | HTTP routes are not built here |

The relative crop score is:

```text
predicted yield / historical state–crop–season mean yield
```

The reference is the **unweighted mean of reported district-year yields**, not total production divided by state crop area. A score of 1.2 means 20% above this reference, not 20% more profitable. Ranking uses full precision, with crop name breaking ties. `compare_crops()` accepts any positive `top_n`; data is not pre-truncated to five rows.

### Questions outside this version's scope

- Rainfall/NDVI what-if effects or causes of yield changes: these inputs are excluded; causal effects are not established.
- Profit or suitability of a newly introduced crop: price, costs, and suitability evidence are absent.
- Farm-specific yield: training rows are district aggregates.
- Crop-failure probability or prediction intervals: neither is estimated.
- Arbitrary future years: only the year immediately after observed history is supported; predictions are not recycled as observed yields.
- Total production: requires verified yield units and a separately supplied planted area.

Official publication dates are absent. Evaluation assumes earlier recorded-year reports are available. Verify that assumption before calling this an operational pre-planting forecast. The model also does not validate the upstream crop-year convention or demonstrate performance in unseen districts.

## 8. Run and ask a question

From the project root, using the existing Python 3.11 environment and Java 17:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
venv/bin/jupyter lab
```

Open the notebook with the project's Python 3.11 kernel and run all cells in order. The notebook sets `PYSPARK_PYTHON` to that kernel's Python. Spark uses two local cores, 4 GB driver memory, and four shuffle partitions.

After running:

```python
predict_yield("Andhra Pradesh", "Guntur", "Rice", "Rabi")
compare_crops("Andhra Pradesh", "Guntur", "Rabi", top_n=5)
crop_report.filter(F.col("crop_name") == "Rice").show()
```

Use exact source names. `predict_yield()` returns a dictionary with yield, year, history support, recent change, method, and the unit caveat. An unsupported combination returns `None`; a different year raises `ValueError`. Rainfall and NDVI arguments are not supported.

Spark stays active so the examples remain usable. Call `spark.stop()` when finished. Re-running the comparison cell repeats training.

## 9. Optional export and a later API

`EXPORT_ARTIFACTS = False` by default. This review run does not replace existing datasets, models, forecasts, or figures.

When enabled, one new `models/yield_history_v2/` folder contains:

| Path inside the folder | Contents |
|---|---|
| `pipeline/` | Selected Spark pipeline if a tree model wins |
| `crop_averages/` | Fallback crop averages if a simple rule wins instead |
| `forecast_features/` | Prepared next-year inputs |
| `yield_predictions/` | Forecasts with history context and unit caveat |
| `crop_comparisons/` | All supported relative crop comparisons |
| `per_crop_test_metrics/` | Every crop's 2022 evaluation |
| `metadata.json` | Method, features, source fingerprint, years, scores, and limits |

An existing folder raises `FileExistsError`; choose a new `artifact_dir` before another export. Export is not transactional, so interruption can leave an incomplete folder.

A later API can read batch tables without Spark:

```python
import pandas as pd

forecasts = pd.read_parquet("models/yield_history_v2/yield_predictions")
```

Live pipeline scoring needs Spark and the same feature rules. A baseline winner instead uses the saved rule and crop averages. Existing weather-based artifacts remain a separate version.

## 10. What makes this a useful first model?

It should beat a simple rule for the crops the team cares about, expose sparse history, and make data limits visible. Existing data supports testing those claims and explaining every input.

Next steps are source checks and a later independent evaluation. Corrected daily rainfall, quality-checked NDVI, irrigation, and temperature can be evaluated separately later. They are not required to understand or demonstrate this first version.
