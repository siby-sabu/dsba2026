# Project Report - Agricultural Yield Prediction System

## Overview
This directory contains the complete M.Tech project report (6-8 pages, A4, 10pt font) documenting the Agricultural Yield Prediction and Crop Recommendation System for India.

## Files
- `project_report.tex` - Complete LaTeX source document
- `figures/` - Directory containing 7 PNG visualization files
- `project_report.pdf` - Compiled PDF output (after compilation)

## Prerequisites

### LaTeX Distribution
You need a LaTeX distribution installed. Choose based on your operating system:

**macOS:**
```bash
# Using MacTeX (recommended, ~4GB download)
brew install --cask mactex

# OR using BasicTeX (minimal, ~100MB)
brew install --cask basictex
sudo tlmgr update --self
sudo tlmgr install collection-fontsrecommended
sudo tlmgr install collection-latexextra
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install texlive-latex-base texlive-latex-extra texlive-fonts-recommended
```

**Windows:**
Download and install MiKTeX from: https://miktex.org/download

### Required LaTeX Packages
The report uses these packages (usually included in full distributions):
- `geometry` - Page margins (2.5cm)
- `graphicx` - Figure inclusion
- `tikz` - Architecture diagram
- `booktabs` - Professional tables
- `hyperref` - Clickable links
- `listings` - Code syntax highlighting
- `xcolor` - Color definitions
- `multicol` - Multi-column layouts
- `enumitem` - List customization

## Compilation Instructions

### Standard Compilation (2 passes for cross-references)
```bash
cd /Users/a0488240/Documents/Learning/MTech/project/dsba2026/report

# First pass
pdflatex project_report.tex

# Second pass (resolves cross-references)
pdflatex project_report.tex
```

### Expected Output
- `project_report.pdf` - Final PDF (target: 6-8 pages)
- `project_report.aux` - Auxiliary file (cross-references)
- `project_report.log` - Compilation log (check for errors)
- `project_report.out` - Hyperlink metadata

### Viewing the PDF
```bash
# macOS
open project_report.pdf

# Linux
xdg-open project_report.pdf

# Windows
start project_report.pdf
```

## Before Submitting: Fill Placeholders

The report contains placeholders marked with `[PLACEHOLDER: ...]` and `[TBD]` that you must fill with actual values:

### 1. Author Information (Lines 39-42)
Replace these in the LaTeX source:
```latex
[PLACEHOLDER: Author1 Name]  → Your full name
[PLACEHOLDER: Author2 Name]  → Second author name (if applicable)
[PLACEHOLDER: email1]        → Your email address
[PLACEHOLDER: email2]        → Second author email
```

### 2. Abstract Performance Metrics (Lines 52-53)
```latex
[PLACEHOLDER: R²]   → Model R-squared score (e.g., 0.82)
[PLACEHOLDER: X%]   → Percentage improvement (e.g., 24%)
```

### 3. Table 4: Model Performance (Lines 416-426)
Fill in ALL `[TBD]` values in the model comparison table:
- Linear Regression: R², RMSE, MAE, Training Time
- XGBoost: R², RMSE, MAE, Training Time
- LightGBM: R², RMSE, MAE, Training Time
- Improvement row: percentage improvements

### 4. Table 3: System Performance (Lines 378-391)
Fill in `[TBD]` values with measured benchmarks:
- ETL Pipeline Runtime
- MongoDB Query Latency (P50 and P95)
- API Response Time
- Frontend Map Load Time
- Concurrent User Capacity
- GCP Cloud Run Cold Start Time

### 5. Section 3.4: Model Hyperparameters (Lines 349-356)
Replace `[TBD]` with actual hyperparameter values:
- XGBoost: `max_depth`, `learning_rate`, `n_estimators`

## Verification Checklist

After filling placeholders and compiling, verify:

- [ ] PDF compiles without errors (`pdflatex` exit code 0)
- [ ] Page count is between 6-8 pages (check PDF page count)
- [ ] All 7 figures render correctly (no missing image errors)
- [ ] All 5 tables format properly with booktabs style
- [ ] TikZ architecture diagram (Figure 1) displays correctly
- [ ] No `[PLACEHOLDER: ...]` or `[TBD]` tags remain in PDF
- [ ] All hyperlinks work (test production URLs in Section 5.1)
- [ ] Code snippets (Listings 1-2) have syntax highlighting
- [ ] Cross-references resolve (all "Figure X", "Table Y" show numbers, not "??")
- [ ] Author names and emails appear in header
- [ ] Abstract contains actual performance numbers (not placeholders)

## Troubleshooting

### Missing Figures Error
```
LaTeX Warning: File `figures/05_agro_ecological_zones.png' not found
```
**Solution:** Ensure all 7 PNG files are in the `figures/` subdirectory:
```bash
ls -l figures/
# Should show:
# 01_precip_ndvi_correlation_map.png
# 02_state_performance_heatmap.png
# 03_optimal_rainfall.png
# 04_ndvi_yield_correlation.png
# 05_agro_ecological_zones.png
# 07_seasonal_comparison.png
# 08_crop_precipitation_analysis.png
```

### TikZ Compilation Error
```
! Package tikz Error: I do not know the key '/tikz/shapes'
```
**Solution:** Install TikZ libraries:
```bash
sudo tlmgr install pgf tikz-cd
```

### Undefined References Warning
```
LaTeX Warning: Reference `fig:zones' on page X undefined
```
**Solution:** Run `pdflatex` **twice** (first pass creates references, second pass resolves them)

### PDF Page Count Check
```bash
# macOS/Linux
pdfinfo project_report.pdf | grep Pages

# Should output: "Pages:           7" (or 6-8)
```

## Report Structure

The 7-page report follows this structure:
1. **Heading/Abstract** (0.3 pages) - Title, authors, 100-word abstract
2. **Problem** (1.2 pages) - Definition, motivation, design goals, features, scalability
3. **Approach and Methods** (2.5 pages) - Design, architecture, platforms (Spark/MongoDB), ML methods
4. **Evaluation** (2.5 pages) - Experiments, scalability metrics, model performance, 7 figures with analysis
5. **Summary** (0.5 pages) - Goal achievement, limitations, future extensions

## Grading Criteria Emphasis

The report explicitly addresses five grading criteria throughout:
- **Novelty:** Heterogeneous data fusion, spatial cross-validation, denormalized schema
- **Technical Effort:** 5-layer stack, 808 LOC ETL, manual data quality, production CI/CD
- **Technical Correctness:** Temporal validation, geospatial indexing, Spark memory management
- **Scalability:** Parquet compression, partitioning, denormalization, autoscaling
- **Impact:** Food security context, quantified improvements, production URLs, cost efficiency

## Contact

For questions about filling placeholders or compilation issues, refer to the plan file:
```
/Users/a0488240/.claude/plans/here-are-my-answers-linear-giraffe.md
```

## License
This report is submitted as partial fulfillment of M.Tech DSBA 2026 requirements.
