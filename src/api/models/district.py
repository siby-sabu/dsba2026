"""
District Pydantic Models
"""

from pydantic import BaseModel, Field
from typing import Optional, List


class DistrictBase(BaseModel):
    """Base district model"""
    district_id: str = Field(..., description="Composite ID: state_district")
    state: str
    district: str
    centroid_lat: Optional[float] = None
    centroid_lon: Optional[float] = None


class DistrictResponse(DistrictBase):
    """District response with metadata"""
    total_crops: Optional[int] = Field(None, description="Number of unique crops")
    data_years: Optional[List[int]] = Field(None, description="Available data years")

    class Config:
        json_schema_extra = {
            "example": {
                "district_id": "Andhra Pradesh_Anantapur",
                "state": "Andhra Pradesh",
                "district": "Anantapur",
                "centroid_lat": 14.312066,
                "centroid_lon": 77.460158,
                "total_crops": 62,
                "data_years": [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023]
            }
        }


class DistrictListResponse(BaseModel):
    """List of districts"""
    districts: List[DistrictResponse]
    total: int


class StateListResponse(BaseModel):
    """List of states"""
    states: List[str]
    total: int
