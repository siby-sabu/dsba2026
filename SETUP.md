# Setup Instructions for dsba2026 Project

## 1. Create Virtual Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On macOS/Linux
# venv\Scripts\activate  # On Windows

# Upgrade pip
pip install --upgrade pip
```

## 2. Install Dependencies

```bash
pip install -r requirements.txt
```

This will install:
- **PySpark 3.5.0** - For big data processing
- **Pandas 2.0.3** - For data manipulation
- **Jupyter & JupyterLab** - For interactive notebooks
- **Scikit-learn, XGBoost, LightGBM** - For machine learning
- **FastAPI** - For building APIs
- **Great Expectations** - For data validation
- And 30+ other packages (see requirements.txt)

## 3. Verify Installation

```bash
# Check Python version (should be 3.8+)
python --version

# Test PySpark installation
python -c "from pyspark.sql import SparkSession; print('PySpark OK')"

# Test pandas installation
python -c "import pandas as pd; print(f'Pandas {pd.__version__} OK')"
```

## 4. VS Code Setup

### Install Recommended Extensions:
When you open the project in VS Code, it will prompt you to install recommended extensions:
- Python
- Pylance
- Jupyter
- Black Formatter
- Flake8
- Mypy Type Checker

Or install manually:
```bash
code --install-extension ms-python.python
code --install-extension ms-toolsai.jupyter
code --install-extension ms-python.black-formatter
```

### Select Python Interpreter:
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "Python: Select Interpreter"
3. Choose `./venv/bin/python`

## 5. Start Development

### Create Your First Notebook:
1. In VS Code, navigate to `notebooks/eda/`
2. Create a new file: `00_district_name_audit.ipynb`
3. Select the kernel: Choose your `venv` Python interpreter
4. Start coding!

### Recommended First Notebook:
According to CLAUDE.md, your first task should be the **district name audit** to identify naming inconsistencies across datasets.

```python
# notebooks/eda/00_district_name_audit.ipynb
import pandas as pd
from fuzzywuzzy import process

# Load datasets
crops = pd.read_csv('data/raw/crop_yield/Crop yield data from Abhi.csv')
geo = pd.read_csv('data/raw/geography/latitude longitude from Allu.csv')

# Check district name consistency
crops_districts = set(crops['district_name'].str.lower().str.strip())
geo_districts = set(geo['District'].str.lower().str.strip())

print(f"Crop dataset has {len(crops_districts)} unique districts")
print(f"Geography dataset has {len(geo_districts)} unique districts")
```

## 6. Useful Commands

```bash
# Run tests
pytest tests/

# Format code
black src/ notebooks/

# Lint code
flake8 src/

# Type checking
mypy src/

# Start Jupyter Lab (alternative to VS Code)
jupyter lab

# Start FastAPI server (when ready)
uvicorn src.api.main:app --reload
```

## 7. Project Structure

```
dsba2026/
├── data/raw/           # Your organized data files
├── notebooks/eda/      # Start here with exploratory analysis
├── src/                # Python modules (when ready)
├── tests/              # Tests (when ready)
└── requirements.txt    # Dependencies
```

## 8. Next Steps

Follow the CLAUDE.md guide for the recommended development sequence:
1. **Phase 1: EDA** - District name audit, data profiling, quality checks
2. **Phase 2: ETL** - Build dimension tables, fact tables
3. **Phase 3: Features** - Feature engineering
4. **Phase 4: Models** - Train ML models
5. **Phase 5: API** - Deploy with FastAPI

## Troubleshooting

### Common Issues:

**1. PySpark Installation Fails:**
- Ensure Java 8 or 11 is installed: `java -version`
- PySpark requires Java to run

**2. Excel File Reading Issues:**
- `openpyxl` and `xlrd` are included for reading .xls/.xlsx files
- If issues persist, convert to CSV first

**3. Memory Issues:**
- The datasets are large (~188 MB total)
- Start with pandas for EDA, switch to Spark if needed
- Close unused notebooks to free memory

**4. VS Code Jupyter Kernel Issues:**
- Restart VS Code
- Reselect the Python interpreter
- Check that ipykernel is installed: `pip install ipykernel`

## Help

For detailed architectural guidance, see `CLAUDE.md`.
