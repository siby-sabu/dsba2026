"""
States Router
Endpoints for state-level data
"""

from fastapi import APIRouter, HTTPException
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import MongoDB
from models.district import StateListResponse

router = APIRouter()


@router.get("/states", response_model=StateListResponse)
async def get_states():
    """
    Get list of all states
    """
    try:
        collection = MongoDB.get_collection("districts")

        # Get unique states
        states = collection.distinct("state")
        states = sorted(states)

        return StateListResponse(states=states, total=len(states))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
