# MongoDB Backup - Split Files

## Why Split Files?

The original `seasonal_crop_data.bson` file (59MB) exceeded Git's recommended 50MB limit. It has been split into two balanced parts for version control.

## Split File Details

### Original File
- **seasonal_crop_data.bson** (59MB, 113,720 documents) - ❌ Gitignored

### Split Files
- **seasonal_crop_data_part1.bson** (30MB, 56,860 documents) - ✅ Tracked in Git
- **seasonal_crop_data_part2.bson** (30MB, 56,860 documents) - ✅ Tracked in Git

Each part includes its corresponding `.metadata.json` file.

## How to Restore the Complete Database

### Option 1: Merge Files First (Recommended)

Use the provided merge script to combine both parts before restoring:

```bash
# Merge the split files
python3 mongodb_backup/merge_seasonal_crop_data.py

# Restore to MongoDB
mongorestore --db agri_analytics mongodb_backup/agri_analytics/
```

### Option 2: Restore Parts Separately

You can restore both parts directly to MongoDB (they will merge automatically):

```bash
# Restore part 1
mongorestore --db agri_analytics --collection seasonal_crop_data \
  mongodb_backup/agri_analytics/seasonal_crop_data_part1.bson

# Restore part 2 (append to the same collection)
mongorestore --db agri_analytics --collection seasonal_crop_data \
  mongodb_backup/agri_analytics/seasonal_crop_data_part2.bson
```

## File Distribution Strategy

Documents were split using an alternating pattern (even/odd indices) to ensure:
- Balanced distribution across states
- Balanced distribution across years
- Balanced distribution across crops
- Equal file sizes

This ensures both parts represent the complete dataset when used together.

## Verification

After restoring, verify the document count:

```bash
mongo agri_analytics --eval "db.seasonal_crop_data.count()"
# Expected: 113720 documents
```

## Data Structure

Each document contains:
- `district_id`: Unique district identifier (state_district format)
- `state`: State name
- `district`: District name
- `crop_year`: Year (2016-2023)
- `crop_name`: Name of the crop
- `crop_type`: Crop category (e.g., Cereals, Spices)
- `season`: Season (Kharif, Rabi, Zaid)
- `area`: Cultivated area
- `production`: Production quantity
- `yield`: Crop yield
- `climate`: Seasonal climate data (precipitation, rainy days)
- `vegetation`: Seasonal vegetation indices (NDVI)
- `location`: GeoJSON Point with coordinates

## Indexes

The collection has the following indexes (defined in metadata.json):
1. `_id` - Primary key
2. `(district_id, crop_year, crop_name, season)` - Unique compound index
3. `state` - Single field index
4. `crop_year` - Single field index
5. `crop_name` - Single field index
6. `location` - 2dsphere geospatial index
