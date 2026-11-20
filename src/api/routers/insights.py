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


# --- Crop Recommendation Model Integration ---
import joblib
import pandas as pd
from pydantic import BaseModel
import numpy as np

# Define Request Schema
class RecommendationRequest(BaseModel):
    district: str
    season: str
    avg_ppt: float

# Load the LightGBM model safely
MODEL_PATH = Path(__file__).parent.parent.parent.parent / "models" / "crop_rec_v1.pkl"
model = None
if MODEL_PATH.exists():
    try:
        model = joblib.load(MODEL_PATH)
    except Exception as e:
        print(f"Error loading LightGBM model: {e}")
else:
    print(f"Warning: LightGBM model not found at {MODEL_PATH}")

@router.post("/insights/recommend")
async def recommend_crop(payload: RecommendationRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Machine learning recommendation model is currently unavailable.")
    
    try:
        # Format input exactly as expected during model training
        input_df = pd.DataFrame([{
            'district': payload.district,
            'season': payload.season,
            'avg_ppt': payload.avg_ppt
        }])
        
        # Convert categorical inputs explicitly
        input_df['district'] = input_df['district'].astype('category')
        input_df['season'] = input_df['season'].astype('category')
        
        # Perform prediction probabilities
        probabilities = model.predict_proba(input_df)[0]
        classes = model.classes_
        
        # Sort indices descending to get top 2 recommendations
        top_2_indices = np.argsort(probabilities)[::-1][:2]
        
        recommendations = []
        for idx in top_2_indices:
            recommendations.append({
                "crop": str(classes[idx]),
                "probability": round(float(probabilities[idx]) * 100, 2)
            })
            
        return {
            "status": "success",
            "inputs": {
                "district": payload.district,
                "season": payload.season,
                "avg_ppt": payload.avg_ppt
            },
            "recommendations": recommendations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction Error: {str(e)}")


# --- Crop Recommendation Model Integration ---
import joblib
import pandas as pd
from pydantic import BaseModel
import numpy as np

# Define Request Schema
class RecommendationRequest(BaseModel):
    district: str
    season: str
    avg_ppt: float

# Load the LightGBM model safely
MODEL_PATH = Path(__file__).parent.parent.parent.parent / "models" / "crop_rec_v1.pkl"
model = None
if MODEL_PATH.exists():
    try:
        model = joblib.load(MODEL_PATH)
    except Exception as e:
        print(f"Error loading LightGBM model: {e}")
else:
    print(f"Warning: LightGBM model not found at {MODEL_PATH}")

@router.post("/insights/recommend")
async def recommend_crop(payload: RecommendationRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Machine learning recommendation model is currently unavailable.")
    
    try:
        # Format input exactly as expected during model training
        input_df = pd.DataFrame([{
            'district': payload.district,
            'season': payload.season,
            'avg_ppt': payload.avg_ppt
        }])
        
        # Convert categorical inputs explicitly
        input_df['district'] = input_df['district'].astype('category')
        input_df['season'] = input_df['season'].astype('category')
        
        # Perform prediction probabilities
        probabilities = model.predict_proba(input_df)[0]
        classes = model.classes_
        
        # Sort indices descending to get top 2 recommendations
        top_2_indices = np.argsort(probabilities)[::-1][:2]
        
        recommendations = []
        for idx in top_2_indices:
            recommendations.append({
                "crop": str(classes[idx]),
                "probability": round(float(probabilities[idx]) * 100, 2)
            })
            
        return {
            "status": "success",
            "inputs": {
                "district": payload.district,
                "season": payload.season,
                "avg_ppt": payload.avg_ppt
            },
            "recommendations": recommendations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction Error: {str(e)}")
