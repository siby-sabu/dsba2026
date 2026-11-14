"""
Insights Router
Endpoints for pre-computed insights
"""

from fastapi import APIRouter, HTTPException
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import MongoDB

router = APIRouter()


@router.get("/insights/district/{district_id}")
async def get_district_insights(district_id: str):
    """
    Get pre-computed insights for a district

    Returns:
    - Rainfall statistics (avg, drought-prone classification)
    - Vegetation health (NDVI, health level)
    - Top 3 crops by area
    - Water stress category
    """
    try:
        collection = MongoDB.get_collection("aggregated_insights")

        insight = collection.find_one({
            'insight_type': 'district_summary',
            'district_id': district_id
        }, {'_id': 0})  # Exclude MongoDB _id

        if not insight:
            raise HTTPException(status_code=404, detail=f"Insights not found for district: {district_id}")

        return insight

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/insights/state/{state}")
async def get_state_insights(state: str):
    """
    Get pre-computed insights for a state

    Returns:
    - Number of districts and crops
    - Dominant crops
    - Average annual rainfall
    - High-performing and underperforming districts
    """
    try:
        collection = MongoDB.get_collection("aggregated_insights")

        insight = collection.find_one({
            'insight_type': 'state_summary',
            'state': state
        }, {'_id': 0})

        if not insight:
            raise HTTPException(status_code=404, detail=f"Insights not found for state: {state}")

        return insight

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/insights/crop/{crop_name}")
async def get_crop_insights(crop_name: str):
    """
    Get pre-computed insights for a crop

    Returns:
    - National statistics (total area, avg yield, top states)
    - Yield trends over time
    - Optimal growing conditions (precipitation, NDVI ranges)
    - Preferred seasons
    """
    try:
        collection = MongoDB.get_collection("aggregated_insights")

        insight = collection.find_one({
            'insight_type': 'crop_analysis',
            'crop_name': crop_name
        }, {'_id': 0})

        if not insight:
            raise HTTPException(status_code=404, detail=f"Insights not found for crop: {crop_name}")

        return insight

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
