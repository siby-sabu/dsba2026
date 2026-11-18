"""
MongoDB Migration Script
Loads Parquet files from data/processed/ and migrates to MongoDB.

Key Features:
- Filters crop data to 2016+ for consistency with precipitation/vegetation data
- Transforms flat tables to nested documents
- Batch inserts for performance
- Creates indexes after load
"""

import sys
import argparse
from pathlib import Path
import pandas as pd
import numpy as np
from pymongo import MongoClient, GEOSPHERE
from pymongo.errors import BulkWriteError
from datetime import datetime
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MongoMigration:
    def __init__(self, mongo_uri="mongodb://localhost:27017", db_name="agri_analytics"):
        """Initialize MongoDB connection"""
        self.client = MongoClient(mongo_uri)
        self.db = self.client[db_name]
        logger.info(f"Connected to MongoDB: {mongo_uri}/{db_name}")

        # Define collections
        self.collections = {
            'districts': self.db['districts'],
            'seasonal_crop_data': self.db['seasonal_crop_data'],
            'monthly_climate': self.db['monthly_climate'],
            'aggregated_insights': self.db['aggregated_insights']
        }

    def clean_collections(self):
        """Drop existing collections for fresh migration"""
        logger.info("Cleaning existing collections...")
        for name, collection in self.collections.items():
            collection.drop()
            logger.info(f"  Dropped: {name}")

    def load_parquet_files(self, data_dir="data/processed"):
        """Load all Parquet files"""
        data_path = Path(data_dir)

        logger.info("Loading Parquet files...")

        # Load crop data and FILTER to 2016+
        crop_file = data_path / "fact_seasonal_crop.parquet"
        if crop_file.exists():
            df_crop = pd.read_parquet(crop_file)
            logger.info(f"  Loaded fact_seasonal_crop.parquet: {len(df_crop):,} records")

            # CRITICAL: Filter to 2016+ only
            original_count = len(df_crop)
            df_crop = df_crop[df_crop['crop_year'] >= 2016]
            logger.info(f"  ✓ Filtered to 2016+: {len(df_crop):,} records (removed {original_count - len(df_crop):,})")
        else:
            raise FileNotFoundError(f"Missing: {crop_file}")

        # Load climate data
        climate_file = data_path / "fact_monthly_climate.parquet"
        if climate_file.exists():
            df_climate = pd.read_parquet(climate_file)
            logger.info(f"  Loaded fact_monthly_climate.parquet: {len(df_climate):,} records")
        else:
            df_climate = None
            logger.warning(f"  Skipping: {climate_file} not found")

        # Load districts
        districts_file = data_path / "dim_districts.parquet"
        if districts_file.exists():
            df_districts = pd.read_parquet(districts_file)
            logger.info(f"  Loaded dim_districts.parquet: {len(df_districts):,} records")
        else:
            raise FileNotFoundError(f"Missing: {districts_file}")

        return df_crop, df_climate, df_districts

    def migrate_districts(self, df_districts):
        """Migrate districts collection"""
        logger.info("\nMigrating districts collection...")

        documents = []
        for _, row in df_districts.iterrows():
            doc = {
                'district_id': f"{row['state']}_{row['district']}",
                'state': row['state'],
                'district': row['district'],
                'centroid_lat': float(row['centroid_lat']) if pd.notna(row['centroid_lat']) else None,
                'centroid_lon': float(row['centroid_lon']) if pd.notna(row['centroid_lon']) else None,
                'location': {
                    'type': 'Point',
                    'coordinates': [
                        float(row['centroid_lon']) if pd.notna(row['centroid_lon']) else 0.0,
                        float(row['centroid_lat']) if pd.notna(row['centroid_lat']) else 0.0
                    ]
                }
            }
            documents.append(doc)

        # Batch insert
        if documents:
            result = self.collections['districts'].insert_many(documents)
            logger.info(f"  ✓ Inserted {len(result.inserted_ids):,} districts")

        # Create indexes
        self.collections['districts'].create_index('district_id', unique=True)
        self.collections['districts'].create_index([('state', 1), ('district', 1)])
        self.collections['districts'].create_index([('location', GEOSPHERE)])
        logger.info("  ✓ Created indexes")

    def migrate_seasonal_crop_data(self, df_crop, batch_size=5000):
        """Migrate seasonal crop data collection"""
        logger.info("\nMigrating seasonal_crop_data collection...")

        # Columns for nested structures
        climate_cols = ['seasonal_precip_total', 'seasonal_precip_avg', 'seasonal_precip_max', 'rainy_days']
        veg_cols = ['seasonal_ndvi_mean', 'early_season_ndvi', 'mid_season_ndvi', 'late_season_ndvi']

        documents = []
        for idx, row in df_crop.iterrows():
            # Base document
            doc = {
                'district_id': f"{row['state']}_{row['district']}",
                'state': row['state'],
                'district': row['district'],
                'crop_year': int(row['crop_year']),
                'crop_name': row['crop_name'],
                'crop_type': row.get('crop_type', 'Unknown'),
                'season': row['season'],
                'area': float(row['area']) if pd.notna(row['area']) else None,
                'production': float(row['production']) if pd.notna(row['production']) else None,
                'yield': float(row['yield']) if pd.notna(row['yield']) else None,
            }

            # Climate nested object
            climate = {}
            for col in climate_cols:
                if col in row and pd.notna(row[col]):
                    climate[col] = float(row[col])
            if climate:
                doc['climate'] = climate

            # Vegetation nested object
            vegetation = {}
            for col in veg_cols:
                if col in row and pd.notna(row[col]):
                    vegetation[col] = float(row[col])
            if vegetation:
                doc['vegetation'] = vegetation

            # Geographic location (GeoJSON)
            if pd.notna(row.get('centroid_lat')) and pd.notna(row.get('centroid_lon')):
                doc['location'] = {
                    'type': 'Point',
                    'coordinates': [float(row['centroid_lon']), float(row['centroid_lat'])]
                }

            documents.append(doc)

            # Batch insert
            if len(documents) >= batch_size:
                try:
                    result = self.collections['seasonal_crop_data'].insert_many(documents, ordered=False)
                    logger.info(f"  ✓ Inserted batch: {len(result.inserted_ids):,} documents")
                except BulkWriteError as e:
                    logger.warning(f"  Partial insert: {e.details['nInserted']} documents")
                documents = []

        # Insert remaining
        if documents:
            try:
                result = self.collections['seasonal_crop_data'].insert_many(documents, ordered=False)
                logger.info(f"  ✓ Inserted final batch: {len(result.inserted_ids):,} documents")
            except BulkWriteError as e:
                logger.warning(f"  Partial insert: {e.details['nInserted']} documents")

        # Create indexes
        logger.info("  Creating indexes...")
        self.collections['seasonal_crop_data'].create_index([
            ('district_id', 1), ('crop_year', 1), ('crop_name', 1), ('season', 1)
        ], unique=True)
        self.collections['seasonal_crop_data'].create_index('state')
        self.collections['seasonal_crop_data'].create_index('crop_year')
        self.collections['seasonal_crop_data'].create_index('crop_name')
        self.collections['seasonal_crop_data'].create_index([('location', GEOSPHERE)])
        logger.info("  ✓ Created indexes")

    def migrate_monthly_climate(self, df_climate, batch_size=5000):
        """Migrate monthly climate collection"""
        if df_climate is None:
            logger.warning("\nSkipping monthly_climate migration (no data)")
            return

        logger.info("\nMigrating monthly_climate collection...")

        documents = []
        for _, row in df_climate.iterrows():
            doc = {
                'district_id': f"{row['state']}_{row['district']}",
                'state': row['state'],
                'district': row['district'],
                'year': int(row['year']),
                'month': int(row['month']),
                'date': pd.Timestamp(year=int(row['year']), month=int(row['month']), day=1),
            }

            # Add available metrics
            if 'precipitation_mm' in row and pd.notna(row['precipitation_mm']):
                doc['precipitation_mm'] = float(row['precipitation_mm'])
            if 'ndvi_mean' in row and pd.notna(row['ndvi_mean']):
                doc['ndvi_mean'] = float(row['ndvi_mean'])

            documents.append(doc)

            # Batch insert
            if len(documents) >= batch_size:
                try:
                    result = self.collections['monthly_climate'].insert_many(documents, ordered=False)
                    logger.info(f"  ✓ Inserted batch: {len(result.inserted_ids):,} documents")
                except BulkWriteError as e:
                    logger.warning(f"  Partial insert: {e.details['nInserted']} documents")
                documents = []

        # Insert remaining
        if documents:
            try:
                result = self.collections['monthly_climate'].insert_many(documents, ordered=False)
                logger.info(f"  ✓ Inserted final batch: {len(result.inserted_ids):,} documents")
            except BulkWriteError as e:
                logger.warning(f"  Partial insert: {e.details['nInserted']} documents")

        # Create indexes
        self.collections['monthly_climate'].create_index([
            ('district_id', 1), ('year', 1), ('month', 1)
        ], unique=True)
        logger.info("  ✓ Created indexes")

    def validate_migration(self):
        """Validate migration results"""
        logger.info("\n" + "="*60)
        logger.info("MIGRATION VALIDATION")
        logger.info("="*60)

        for name, collection in self.collections.items():
            count = collection.count_documents({})
            logger.info(f"{name:30s}: {count:,} documents")

        # Sample document from each collection
        logger.info("\nSample Documents:")
        for name, collection in self.collections.items():
            if name != 'aggregated_insights':  # Skip empty insights for now
                sample = collection.find_one()
                if sample:
                    logger.info(f"\n{name}:")
                    for key in list(sample.keys())[:5]:  # Show first 5 fields
                        logger.info(f"  {key}: {sample[key]}")

    def close(self):
        """Close MongoDB connection"""
        self.client.close()
        logger.info("\nMongoDB connection closed")


def main():
    parser = argparse.ArgumentParser(description='Migrate Parquet files to MongoDB')
    parser.add_argument('--uri', default='mongodb://localhost:27017',
                       help='MongoDB connection URI')
    parser.add_argument('--db', default='agri_analytics',
                       help='Database name')
    parser.add_argument('--data-dir', default='data/processed',
                       help='Path to processed data directory')
    parser.add_argument('--local', action='store_true',
                       help='Use local MongoDB (same as default)')
    parser.add_argument('--clean', action='store_true',
                       help='Clean existing collections before migration')

    args = parser.parse_args()

    try:
        # Initialize migration
        migration = MongoMigration(mongo_uri=args.uri, db_name=args.db)

        # Clean if requested
        if args.clean:
            migration.clean_collections()

        # Load data
        df_crop, df_climate, df_districts = migration.load_parquet_files(args.data_dir)

        # Migrate each collection
        migration.migrate_districts(df_districts)
        migration.migrate_seasonal_crop_data(df_crop)
        migration.migrate_monthly_climate(df_climate)

        # Validate
        migration.validate_migration()

        # Close
        migration.close()

        logger.info("\n✓ Migration completed successfully!")

    except Exception as e:
        logger.error(f"\n✗ Migration failed: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
