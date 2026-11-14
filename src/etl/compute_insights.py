"""
Compute Insights Script
Pre-computes aggregated analytics for fast API responses.

Creates insights for:
1. District summaries (rainfall, vegetation, top crops, performance)
2. Crop analyses (national stats, trends, optimal conditions)
3. State summaries (district comparisons, dominant crops)
"""

import sys
import argparse
from pathlib import Path
import pandas as pd
import numpy as np
from pymongo import MongoClient
from datetime import datetime
import logging
from collections import defaultdict

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class InsightsComputation:
    def __init__(self, mongo_uri="mongodb://localhost:27017", db_name="agri_analytics"):
        """Initialize MongoDB connection"""
        self.client = MongoClient(mongo_uri)
        self.db = self.client[db_name]
        logger.info(f"Connected to MongoDB: {mongo_uri}/{db_name}")

        # Collections
        self.districts_coll = self.db['districts']
        self.crop_data_coll = self.db['seasonal_crop_data']
        self.climate_coll = self.db['monthly_climate']
        self.insights_coll = self.db['aggregated_insights']

    def clear_insights(self):
        """Clear existing insights"""
        count = self.insights_coll.count_documents({})
        if count > 0:
            self.insights_coll.delete_many({})
            logger.info(f"Cleared {count} existing insights")

    def compute_district_summaries(self):
        """Compute district-level summary insights"""
        logger.info("\nComputing district summaries...")

        districts = list(self.districts_coll.find())
        insights = []

        for idx, district in enumerate(districts):
            district_id = district['district_id']

            # Get all crop data for this district
            crop_docs = list(self.crop_data_coll.find({'district_id': district_id}))

            if not crop_docs:
                continue

            # Rainfall statistics
            precip_values = [
                doc.get('climate', {}).get('seasonal_precip_total', 0)
                for doc in crop_docs
                if doc.get('climate', {}).get('seasonal_precip_total')
            ]

            avg_annual_precipitation = np.mean(precip_values) if precip_values else 0

            # Classify drought-prone (below 25th percentile of all districts)
            drought_threshold = 400  # mm (approximate 25th percentile)
            drought_prone = bool(avg_annual_precipitation < drought_threshold)

            # Vegetation statistics
            ndvi_values = [
                doc.get('vegetation', {}).get('seasonal_ndvi_mean', 0)
                for doc in crop_docs
                if doc.get('vegetation', {}).get('seasonal_ndvi_mean')
            ]

            avg_ndvi = np.mean(ndvi_values) if ndvi_values else 0

            # Classify vegetation health
            if avg_ndvi < 0.3:
                veg_health = "low"
            elif avg_ndvi < 0.5:
                veg_health = "moderate"
            else:
                veg_health = "good"

            # Top crops by area
            crop_areas = defaultdict(float)
            for doc in crop_docs:
                crop_name = doc.get('crop_name')
                area = doc.get('area', 0)
                if crop_name and area:
                    crop_areas[crop_name] += area

            total_area = sum(crop_areas.values())
            top_crops = []

            for crop, area in sorted(crop_areas.items(), key=lambda x: x[1], reverse=True)[:5]:
                # Get average yield for this crop
                crop_yields = [
                    doc.get('yield', 0)
                    for doc in crop_docs
                    if doc.get('crop_name') == crop and doc.get('yield')
                ]
                avg_yield = np.mean(crop_yields) if crop_yields else 0
                area_share = area / total_area if total_area > 0 else 0

                top_crops.append({
                    'crop': crop,
                    'avg_yield': round(float(avg_yield), 3),
                    'area_share': round(float(area_share), 3)
                })

            # Water stress classification
            if drought_prone:
                water_stress = "drought"
            elif avg_annual_precipitation > 1200:  # High rainfall
                water_stress = "irrigated"
            elif avg_ndvi < 0.3:  # Low vegetation despite normal rainfall
                water_stress = "pest_disease"
            else:
                water_stress = "normal"

            # Create insight document
            insight = {
                'insight_type': 'district_summary',
                'district_id': district_id,
                'state': district['state'],
                'district': district['district'],
                'rainfall_stats': {
                    'avg_annual_precipitation': round(float(avg_annual_precipitation), 2),
                    'drought_prone': drought_prone,
                    'heavy_rainfall_months': []  # Can be computed from monthly data if needed
                },
                'vegetation_stats': {
                    'avg_ndvi': round(float(avg_ndvi), 3),
                    'vegetation_health': veg_health
                },
                'top_crops': top_crops[:3],  # Top 3 crops
                'water_stress_category': water_stress,
                'location': district.get('location'),
                'metadata': {
                    'total_records': len(crop_docs),
                    'data_years': sorted(list(set(doc.get('crop_year') for doc in crop_docs if doc.get('crop_year'))))
                }
            }

            insights.append(insight)

            if (idx + 1) % 50 == 0:
                logger.info(f"  Processed {idx + 1}/{len(districts)} districts")

        # Batch insert
        if insights:
            result = self.insights_coll.insert_many(insights)
            logger.info(f"  ✓ Inserted {len(result.inserted_ids)} district summaries")

        return len(insights)

    def compute_crop_analyses(self):
        """Compute crop-level analysis insights"""
        logger.info("\nComputing crop analyses...")

        # Get all unique crops
        crops = self.crop_data_coll.distinct('crop_name')
        logger.info(f"  Found {len(crops)} unique crops")

        insights = []

        for idx, crop_name in enumerate(crops):
            # Get all data for this crop
            crop_docs = list(self.crop_data_coll.find({'crop_name': crop_name}))

            if not crop_docs:
                continue

            # National statistics
            total_area = sum(doc.get('area', 0) for doc in crop_docs)
            yields = [doc.get('yield', 0) for doc in crop_docs if doc.get('yield')]
            avg_yield = np.mean(yields) if yields else 0

            # Top producing states
            state_production = defaultdict(float)
            for doc in crop_docs:
                state = doc.get('state')
                production = doc.get('production', 0)
                if state and production:
                    state_production[state] += production

            top_states = [
                state for state, _ in sorted(state_production.items(), key=lambda x: x[1], reverse=True)[:3]
            ]

            # Yield trends (by year)
            year_yields = defaultdict(list)
            for doc in crop_docs:
                year = doc.get('crop_year')
                yield_val = doc.get('yield')
                if year and yield_val:
                    year_yields[year].append(yield_val)

            # Calculate trend (simple linear regression)
            if len(year_yields) >= 2:
                years = sorted(year_yields.keys())
                avg_yields_by_year = [np.mean(year_yields[year]) for year in years]

                # Simple trend: (last_year_avg - first_year_avg) / num_years
                trend_slope = (avg_yields_by_year[-1] - avg_yields_by_year[0]) / len(years)
                start_yield = avg_yields_by_year[0]
                end_yield = avg_yields_by_year[-1]
            else:
                trend_slope = 0
                start_yield = avg_yield
                end_yield = avg_yield

            # Optimal conditions (median of top 25% yielding records)
            sorted_docs = sorted(crop_docs, key=lambda x: x.get('yield', 0), reverse=True)
            top_25_pct = sorted_docs[:max(1, len(sorted_docs) // 4)]

            precip_values = [
                doc.get('climate', {}).get('seasonal_precip_total', 0)
                for doc in top_25_pct
                if doc.get('climate', {}).get('seasonal_precip_total')
            ]

            ndvi_values = [
                doc.get('vegetation', {}).get('seasonal_ndvi_mean', 0)
                for doc in top_25_pct
                if doc.get('vegetation', {}).get('seasonal_ndvi_mean')
            ]

            optimal_precip_min = np.percentile(precip_values, 25) if precip_values else 0
            optimal_precip_max = np.percentile(precip_values, 75) if precip_values else 0
            optimal_ndvi_min = np.percentile(ndvi_values, 25) if ndvi_values else 0
            optimal_ndvi_max = np.percentile(ndvi_values, 75) if ndvi_values else 0

            # Preferred seasons
            season_counts = defaultdict(int)
            for doc in crop_docs:
                season = doc.get('season')
                if season:
                    season_counts[season] += 1

            preferred_seasons = [
                season for season, _ in sorted(season_counts.items(), key=lambda x: x[1], reverse=True)
            ]

            # Create insight document
            insight = {
                'insight_type': 'crop_analysis',
                'crop_name': crop_name,
                'national_stats': {
                    'total_area': round(float(total_area), 2),
                    'avg_yield': round(float(avg_yield), 3),
                    'top_producing_states': top_states
                },
                'yield_trends': {
                    'trend_slope': round(float(trend_slope), 4),
                    'start_yield': round(float(start_yield), 3),
                    'end_yield': round(float(end_yield), 3)
                },
                'optimal_conditions': {
                    'precipitation_range': [
                        round(float(optimal_precip_min), 1),
                        round(float(optimal_precip_max), 1)
                    ],
                    'ndvi_range': [
                        round(float(optimal_ndvi_min), 3),
                        round(float(optimal_ndvi_max), 3)
                    ],
                    'preferred_seasons': preferred_seasons
                },
                'metadata': {
                    'total_records': len(crop_docs),
                    'num_districts': len(set(doc.get('district_id') for doc in crop_docs))
                }
            }

            insights.append(insight)

            if (idx + 1) % 20 == 0:
                logger.info(f"  Processed {idx + 1}/{len(crops)} crops")

        # Batch insert
        if insights:
            result = self.insights_coll.insert_many(insights)
            logger.info(f"  ✓ Inserted {len(result.inserted_ids)} crop analyses")

        return len(insights)

    def compute_state_summaries(self):
        """Compute state-level summary insights"""
        logger.info("\nComputing state summaries...")

        states = self.districts_coll.distinct('state')
        logger.info(f"  Found {len(states)} states")

        insights = []

        for state in states:
            # Get districts in this state
            state_districts = list(self.districts_coll.find({'state': state}))
            num_districts = len(state_districts)

            # Get all crop data for this state
            state_crop_docs = list(self.crop_data_coll.find({'state': state}))

            if not state_crop_docs:
                continue

            # Unique crops
            crops = set(doc.get('crop_name') for doc in state_crop_docs if doc.get('crop_name'))
            total_crops = len(crops)

            # Dominant crops (by area)
            crop_areas = defaultdict(float)
            for doc in state_crop_docs:
                crop = doc.get('crop_name')
                area = doc.get('area', 0)
                if crop and area:
                    crop_areas[crop] += area

            dominant_crops = [
                crop for crop, _ in sorted(crop_areas.items(), key=lambda x: x[1], reverse=True)[:3]
            ]

            # Average annual rainfall
            precip_values = [
                doc.get('climate', {}).get('seasonal_precip_total', 0)
                for doc in state_crop_docs
                if doc.get('climate', {}).get('seasonal_precip_total')
            ]
            avg_rainfall = np.mean(precip_values) if precip_values else 0

            # District performance (by average yield)
            district_yields = defaultdict(list)
            for doc in state_crop_docs:
                dist_id = doc.get('district_id')
                yield_val = doc.get('yield')
                if dist_id and yield_val:
                    district_yields[dist_id].append(yield_val)

            district_avg_yields = {
                dist_id: np.mean(yields)
                for dist_id, yields in district_yields.items()
            }

            sorted_districts = sorted(district_avg_yields.items(), key=lambda x: x[1], reverse=True)

            high_performing = [
                dist_id.split('_')[1] for dist_id, _ in sorted_districts[:2]
            ]

            underperforming = [
                dist_id.split('_')[1] for dist_id, _ in sorted_districts[-2:]
            ]

            # Create insight document
            insight = {
                'insight_type': 'state_summary',
                'state': state,
                'num_districts': num_districts,
                'total_crops': total_crops,
                'dominant_crops': dominant_crops,
                'avg_annual_rainfall': round(float(avg_rainfall), 2),
                'high_performing_districts': high_performing,
                'underperforming_districts': underperforming,
                'metadata': {
                    'total_records': len(state_crop_docs),
                    'data_years': sorted(list(set(doc.get('crop_year') for doc in state_crop_docs if doc.get('crop_year'))))
                }
            }

            insights.append(insight)

        # Batch insert
        if insights:
            result = self.insights_coll.insert_many(insights)
            logger.info(f"  ✓ Inserted {len(result.inserted_ids)} state summaries")

        return len(insights)

    def create_indexes(self):
        """Create indexes on insights collection"""
        logger.info("\nCreating indexes...")

        self.insights_coll.create_index([('insight_type', 1), ('district_id', 1)])
        self.insights_coll.create_index([('insight_type', 1), ('state', 1)])
        self.insights_coll.create_index([('insight_type', 1), ('crop_name', 1)])
        self.insights_coll.create_index([('location', '2dsphere')])

        logger.info("  ✓ Created indexes")

    def validate_insights(self):
        """Validate computed insights"""
        logger.info("\n" + "="*60)
        logger.info("INSIGHTS VALIDATION")
        logger.info("="*60)

        # Count by type
        for insight_type in ['district_summary', 'crop_analysis', 'state_summary']:
            count = self.insights_coll.count_documents({'insight_type': insight_type})
            logger.info(f"{insight_type:30s}: {count} documents")

        total = self.insights_coll.count_documents({})
        logger.info(f"{'TOTAL':30s}: {total} documents")

        # Sample from each type
        logger.info("\nSample Insights:")
        for insight_type in ['district_summary', 'crop_analysis', 'state_summary']:
            sample = self.insights_coll.find_one({'insight_type': insight_type})
            if sample:
                logger.info(f"\n{insight_type}:")
                if insight_type == 'district_summary':
                    logger.info(f"  District: {sample['district_id']}")
                    logger.info(f"  Avg Precipitation: {sample['rainfall_stats']['avg_annual_precipitation']} mm")
                    logger.info(f"  Water Stress: {sample['water_stress_category']}")
                    logger.info(f"  Top Crops: {[c['crop'] for c in sample['top_crops']]}")
                elif insight_type == 'crop_analysis':
                    logger.info(f"  Crop: {sample['crop_name']}")
                    logger.info(f"  Avg Yield: {sample['national_stats']['avg_yield']} t/ha")
                    logger.info(f"  Top States: {sample['national_stats']['top_producing_states']}")
                elif insight_type == 'state_summary':
                    logger.info(f"  State: {sample['state']}")
                    logger.info(f"  Districts: {sample['num_districts']}")
                    logger.info(f"  Dominant Crops: {sample['dominant_crops']}")

    def close(self):
        """Close MongoDB connection"""
        self.client.close()
        logger.info("\nMongoDB connection closed")


def main():
    parser = argparse.ArgumentParser(description='Compute aggregated insights')
    parser.add_argument('--uri', default='mongodb://localhost:27017',
                       help='MongoDB connection URI')
    parser.add_argument('--db', default='agri_analytics',
                       help='Database name')
    parser.add_argument('--clear', action='store_true',
                       help='Clear existing insights before computing')

    args = parser.parse_args()

    try:
        # Initialize
        computation = InsightsComputation(mongo_uri=args.uri, db_name=args.db)

        # Clear if requested
        if args.clear:
            computation.clear_insights()

        # Compute insights
        district_count = computation.compute_district_summaries()
        crop_count = computation.compute_crop_analyses()
        state_count = computation.compute_state_summaries()

        # Create indexes
        computation.create_indexes()

        # Validate
        computation.validate_insights()

        # Close
        computation.close()

        logger.info("\n✓ Insights computation completed successfully!")
        logger.info(f"  District summaries: {district_count}")
        logger.info(f"  Crop analyses: {crop_count}")
        logger.info(f"  State summaries: {state_count}")
        logger.info(f"  Total: {district_count + crop_count + state_count}")

    except Exception as e:
        logger.error(f"\n✗ Insights computation failed: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
