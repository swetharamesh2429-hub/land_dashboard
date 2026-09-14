from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from app.prediction_rules import compute_combined_hazard_risk, compute_susceptibility_score, compute_trigger_score
from app.anomaly_detection import detect_sensor_anomaly

app = FastAPI(
    title="RAKSHA-NER Multi-Hazard Prediction Microservice",
    description="AI & Rule-Based Early Warning Inference Engine for Landslides, Flash Floods, and Flood Extent in North East India.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HazardRiskRequest(BaseModel):
    villageId: Optional[str] = None
    rainfall24h: float = Field(..., description="24-hour cumulative rainfall in mm")
    rainfall72h: float = Field(default=0.0, description="72-hour antecedent rainfall in mm")
    soilMoisture: float = Field(..., description="Soil moisture percentage (0-100)")
    slopeAngle: float = Field(default=35.0, description="Slope inclination angle in degrees")
    ndviCurrent: float = Field(default=0.55, description="Current Sentinel-2 NDVI")
    ndviChange5yr: float = Field(default=-0.10, description="5-year NDVI change rate")
    distanceToMiningSiteKm: float = Field(default=2.5, description="Distance to nearest active coal/limestone mine in km")
    landUseChangeFlag: bool = Field(default=True, description="Whether forest-to-construction or jhum occurred")
    historicalLandslideDensity: int = Field(default=3, description="Past landslide events in catchment")
    susceptibilityScore: Optional[float] = Field(default=None, description="Precalculated static susceptibility score")

class SensorAnomalyRequest(BaseModel):
    sensorId: str
    sensorType: str
    currentValue: float
    recentHistory: Optional[List[float]] = []

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "RAKSHA-NER Prediction & Anomaly Microservice",
        "version": "1.0.0",
        "region": "North East India (NER)"
    }

@app.post("/api/predict/hazard-risk")
def predict_hazard_risk(req: HazardRiskRequest):
    try:
        result = compute_combined_hazard_risk(
            rainfall_24h_mm=req.rainfall24h,
            rainfall_72h_mm=req.rainfall72h if req.rainfall72h > 0 else req.rainfall24h * 1.6,
            soil_moisture_pct=req.soilMoisture,
            slope_angle=req.slopeAngle,
            ndvi_current=req.ndviCurrent,
            ndvi_change_5yr=req.ndviChange5yr,
            distance_to_mining_km=req.distanceToMiningSiteKm,
            land_use_change_flag=req.landUseChangeFlag,
            historical_landslide_density=req.historicalLandslideDensity,
            existing_susceptibility_score=req.susceptibilityScore
        )
        return {
            "success": True,
            "villageId": req.villageId,
            "prediction": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/detect/sensor-anomaly")
def detect_anomaly(req: SensorAnomalyRequest):
    try:
        anomaly_res = detect_sensor_anomaly(
            sensor_type=req.sensorType,
            current_value=req.currentValue,
            recent_history=req.recentHistory
        )
        return {
            "success": True,
            "sensorId": req.sensorId,
            "anomaly": anomaly_res
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
