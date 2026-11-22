"""
Insights Router
Endpoints for pre-computed insights
"""

from fastapi import APIRouter, HTTPException
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import MongoDB
import joblib
import pandas as pd
from pydantic import BaseModel
import numpy as np

router = APIRouter()

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

@router.get("/insights/district/{district_id}")
async def get_district_insights(district_id: str):
    try:
        collection = MongoDB.get_collection("aggregated_insights")
        insight = collection.find_one({
            'insight_type': 'district_summary',
            'district_id': district_id
        }, {'_id': 0})
        if not insight:
            raise HTTPException(status_code=404, detail=f"Insights not found for district: {district_id}")
        return insight
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/insights/recommend")
async def recommend_crop(payload: RecommendationRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Machine learning recommendation model is currently unavailable.")
    try:
        input_df = pd.DataFrame([{
            'district': payload.district,
            'season': payload.season,
            'avg_ppt': payload.avg_ppt
        }])
        input_df['district'] = input_df['district'].astype('category')
        input_df['season'] = input_df['season'].astype('category')
        
        probabilities = model.predict_proba(input_df)[0]
        classes = model.classes_
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
