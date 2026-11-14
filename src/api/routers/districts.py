"""
Districts Router
Endpoints for district data
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import MongoDB
from models.district import DistrictResponse, DistrictListResponse

router = APIRouter()


@router.get("/districts", response_model=DistrictListResponse)
async def get_districts(
    state: Optional[str] = Query(None, description="Filter by state name"),
    limit: int = Query(100, ge=1, le=1000),
    skip: int = Query(0, ge=0)
):
    """
    Get list of districts with optional filtering

    - **state**: Optional state name filter
    - **limit**: Maximum number of results (default: 100, max: 1000)
    - **skip**: Number of results to skip for pagination
    """
    try:
        collection = MongoDB.get_collection("districts")

        # Build query
        query = {}
        if state:
            query["state"] = state

        # Get total count
        total = collection.count_documents(query)

        # Get districts
        cursor = collection.find(query).skip(skip).limit(limit)
        districts = []

        for doc in cursor:
            district = DistrictResponse(
                district_id=doc["district_id"],
                state=doc["state"],
                district=doc["district"],
                centroid_lat=doc.get("centroid_lat"),
                centroid_lon=doc.get("centroid_lon"),
            )
            districts.append(district)

        return DistrictListResponse(districts=districts, total=total)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/districts/{district_id}", response_model=DistrictResponse)
async def get_district(district_id: str):
    """
    Get a specific district by ID

    - **district_id**: Composite ID in format "State_District"
    """
    try:
        collection = MongoDB.get_collection("districts")
        doc = collection.find_one({"district_id": district_id})

        if not doc:
            raise HTTPException(status_code=404, detail=f"District not found: {district_id}")

        return DistrictResponse(
            district_id=doc["district_id"],
            state=doc["state"],
            district=doc["district"],
            centroid_lat=doc.get("centroid_lat"),
            centroid_lon=doc.get("centroid_lon"),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
