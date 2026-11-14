"""
Geographic Router
Endpoints for map data and state boundaries
"""
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter()

# Load simplified state boundaries once at startup
BOUNDARIES_PATH = Path(__file__).parent.parent.parent.parent / "data/processed/india_states_simplified.geojson"

_state_boundaries_cache = None

def load_state_boundaries():
    """Load state boundaries from file (cached)"""
    global _state_boundaries_cache

    if _state_boundaries_cache is None:
        try:
            with open(BOUNDARIES_PATH, 'r') as f:
                _state_boundaries_cache = json.load(f)
        except FileNotFoundError:
            raise HTTPException(
                status_code=500,
                detail=f"State boundaries file not found: {BOUNDARIES_PATH}"
            )

    return _state_boundaries_cache


@router.get("/state-boundaries")
async def get_state_boundaries():
    """
    Get simplified state boundaries as GeoJSON

    Returns GeoJSON FeatureCollection with 33 Indian states.
    Boundaries are simplified from 784K to 10.5K points (98.7% reduction).
    """
    boundaries = load_state_boundaries()

    return JSONResponse(
        content=boundaries,
        headers={
            "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
            "Content-Type": "application/geo+json"
        }
    )


@router.get("/state-boundaries/{state_name}")
async def get_state_boundary(state_name: str):
    """
    Get boundary for a specific state

    Args:
        state_name: Name of the state (e.g., "Kerala", "Tamil Nadu")

    Returns:
        GeoJSON Feature for the requested state
    """
    boundaries = load_state_boundaries()

    # Find state (case-insensitive)
    state_name_lower = state_name.lower()

    for feature in boundaries['features']:
        if feature['properties']['name'].lower() == state_name_lower:
            return JSONResponse(
                content=feature,
                headers={"Content-Type": "application/geo+json"}
            )

    raise HTTPException(
        status_code=404,
        detail=f"State not found: {state_name}"
    )


@router.get("/states-list")
async def list_states():
    """
    Get list of all state names from boundaries

    Returns:
        List of state names with geometry
    """
    boundaries = load_state_boundaries()

    states = [
        feature['properties']['name']
        for feature in boundaries['features']
    ]

    return {
        "count": len(states),
        "states": sorted(states)
    }


@router.get("/map/data")
async def get_map_data():
    """
    Get map data for visualization
    Legacy endpoint - redirects to state-boundaries
    """
    return {"message": "Use /geographic/state-boundaries for state boundary data"}
