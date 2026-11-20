# Placeholders to Fill - Quick Reference

## 1. Author Information (Header)

**Location:** Lines 39-42 in `project_report.tex`

```latex
[PLACEHOLDER: Author1 Name]  → Replace with first author's full name
[PLACEHOLDER: Author2 Name]  → Replace with second author's full name  
[PLACEHOLDER: email1]        → Replace with first author's email
[PLACEHOLDER: email2]        → Replace with second author's email
```

**Example:**
```latex
Ramesh Kumar$^{1}$, Priya Sharma$^{1}$ \\
$^{1}$M.Tech, DSBA 2026 \\
\texttt{\{ramesh.kumar, priya.sharma\}@example.edu}
```

---

## 2. Abstract Performance Metrics

**Location:** Line 52 in abstract

```latex
[PLACEHOLDER: R²]   → Replace with model R-squared (e.g., 0.82, 0.79)
[PLACEHOLDER: X%]   → Replace with improvement percentage (e.g., 24%, 31%)
```

**Example:**
```latex
Temporal validation on 2016-2023 data demonstrates 0.82 prediction accuracy, 
with 24% improvement over baseline models...
```

---

## 3. Table 3: System Performance Benchmarks

**Location:** Lines 378-391 (Table~\ref{tab:perf})

Fill in ALL `[TBD]` values:

| Metric | Example Value |
|--------|---------------|
| ETL Pipeline Runtime | 18 min, 23 min |
| MongoDB Query Latency (P50) | 45 ms, 67 ms |
| MongoDB Query Latency (P95) | 128 ms, 143 ms |
| API Response Time | 1850 ms, 980 ms |
| Frontend Map Load | 2400 ms, 2750 ms |
| Concurrent User Capacity | 150 users, 120 users |
| GCP Cloud Run Cold Start | 3200 ms, 4100 ms |

---

## 4. Table 4: ML Model Performance

**Location:** Lines 416-426 (Table~\ref{tab:models})

Fill in ALL `[TBD]` values for 3 models:

### Linear Regression (Baseline)
- R²: e.g., 0.65
- RMSE: e.g., 1.42 t/ha
- MAE: e.g., 0.98 t/ha
- Training Time: e.g., 3 min

### XGBoost (Tuned)
- R²: e.g., 0.78
- RMSE: e.g., 0.89 t/ha
- MAE: e.g., 0.62 t/ha
- Training Time: e.g., 18 min

### LightGBM (Spatial CV)
- R²: e.g., 0.82
- RMSE: e.g., 0.81 t/ha
- MAE: e.g., 0.56 t/ha
- Training Time: e.g., 12 min

### Improvement Row (calculate from above)
- R² improvement: ((0.82 - 0.65) / 0.65) × 100 = 26%
- RMSE improvement: ((1.42 - 0.81) / 1.42) × 100 = 43%
- MAE improvement: ((0.98 - 0.56) / 0.98) × 100 = 43%

---

## 5. Section 3.4: XGBoost Hyperparameters

**Location:** Lines 349-356

Fill in optimized hyperparameter values:

```latex
max_depth=[TBD]        → e.g., 6, 8, 10
learning_rate=[TBD]    → e.g., 0.05, 0.1, 0.15
n_estimators=[TBD]     → e.g., 500, 800, 1000
```

**Example:**
```latex
Key hyperparameters: max_depth=8, learning_rate=0.1, n_estimators=800.
```

---

## Quick Search Command

Find all placeholders in one command:

```bash
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026/report
grep -n "\[TBD\]\|\[PLACEHOLDER" project_report.tex
```

This will show line numbers and content of every placeholder that needs filling.

---

## Validation

After filling, search again to ensure none remain:

```bash
grep -c "\[TBD\]\|\[PLACEHOLDER" project_report.tex
# Should output: 0
```

---

## Notes

- **Be consistent with units:** Use `t/ha` (tons per hectare) for yield metrics
- **Keep precision reasonable:** 2 decimal places for R² (0.82), metrics (1.42 t/ha)
- **Time units:** Use `min` for minutes, `ms` for milliseconds, `s` for seconds
- **Percentages:** Round to whole numbers (24%, not 24.3%)

---

## After Filling

1. Save the file
2. Run compilation: `pdflatex project_report.tex` (twice)
3. Verify no placeholders in PDF: Open PDF and search for "[TBD]" or "[PLACEHOLDER"
4. Check that all values make sense (R² between 0-1, improvements positive, times reasonable)
