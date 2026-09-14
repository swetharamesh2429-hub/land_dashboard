"""
RAKSHA-NER Prediction Engine (Python FastAPI)
Combines static geological/anthropogenic Susceptibility (Fault Lines, Mining, Slope, NDVI)
with dynamic Meteorological Triggers (24h/72h Rain, Soil Saturation, LSTM Forecast Momentum).
Also calculates Flash Flood 2-6hr probabilistic windows and SCS-CN Flood Extent.
"""

def compute_susceptibility_score(
    ndvi_current: float = 0.55,
    ndvi_change_5yr: float = -0.12, # negative means deforestation/jhum loss
    distance_to_mining_km: float = 2.5, # rat-hole coal mines in Meghalaya
    distance_to_fault_line_km: float = 4.2, # Dauki / Kopili fault line proximity (Zone V)
    satellite_change_detected: bool = False,
    land_use_change_flag: bool = True,
    slope_angle: float = 38.0,
    historical_landslide_density: int = 4
) -> dict:
    """
    Calculates the static base susceptibility with rebalanced weights (0-100).
    """
    # 1. Slope angle (0-30 pts)
    slope_score = 0.0
    if slope_angle >= 42.0:
        slope_score = 30.0
    elif slope_angle >= 35.0:
        slope_score = 24.0
    elif slope_angle >= 25.0:
        slope_score = 15.0
    else:
        slope_score = 6.0

    # 2. Mining disturbance (0-20 pts)
    mining_score = 0.0
    if distance_to_mining_km < 1.0:
        mining_score = 20.0
    elif distance_to_mining_km < 2.5:
        mining_score = 15.0
    elif distance_to_mining_km < 5.0:
        mining_score = 8.0
    else:
        mining_score = 2.0

    # 3. Seismic Fault Line Proximity (0-20 pts — Part B GAP 1)
    fault_score = 0.0
    if distance_to_fault_line_km < 2.0:
        fault_score = 20.0
    elif distance_to_fault_line_km < 5.0:
        fault_score = 15.0
    elif distance_to_fault_line_km < 10.0:
        fault_score = 8.0
    else:
        fault_score = 2.0

    # 4. Vegetation loss NDVI (0-15 pts)
    veg_score = 0.0
    if ndvi_change_5yr <= -0.20:
        veg_score = 15.0
    elif ndvi_change_5yr <= -0.10:
        veg_score = 10.0
    elif ndvi_change_5yr < 0:
        veg_score = 5.0
    else:
        veg_score = 1.0

    # 5. Land use change & Historical density (0-15 pts)
    luc_score = 6.0 if land_use_change_flag else 2.0
    hist_score = min(9.0, historical_landslide_density * 2.5)
    history_and_luc = luc_score + hist_score

    # 6. CNN Satellite Surface Displacement Boost
    cnn_boost = 12.0 if satellite_change_detected else 0.0

    total_susceptibility = min(100.0, slope_score + mining_score + fault_score + veg_score + history_and_luc + cnn_boost)
    
    breakdown = {
        "slopeAngleContribution": round(slope_score, 1),
        "miningProximityContribution": round(mining_score, 1),
        "faultLineProximityContribution": round(fault_score, 1),
        "vegetationLossContribution": round(veg_score, 1),
        "landUseAndHistoryContribution": round(history_and_luc, 1),
        "cnnSatelliteBoost": round(cnn_boost, 1),
        "totalSusceptibilityScore": round(total_susceptibility, 1)
    }
    return breakdown


def compute_trigger_score(
    rainfall_24h_mm: float,
    rainfall_72h_mm: float,
    soil_moisture_pct: float,
    forecast_24h_mm: float = 30.0
) -> dict:
    """
    Calculates dynamic meteorological trigger score with LSTM forecast momentum (0-100).
    """
    r24_score = min(40.0, (rainfall_24h_mm / 140.0) * 40.0)
    r72_score = min(25.0, (rainfall_72h_mm / 280.0) * 25.0)
    soil_score = min(25.0, (soil_moisture_pct / 100.0) * 25.0)
    lstm_score = min(10.0, (forecast_24h_mm / 100.0) * 10.0)

    total_trigger = min(100.0, r24_score + r72_score + soil_score + lstm_score)
    return {
        "rainfall24hScore": round(r24_score, 1),
        "rainfall72hScore": round(r72_score, 1),
        "soilMoistureScore": round(soil_score, 1),
        "lstmForecastScore": round(lstm_score, 1),
        "totalTriggerScore": round(total_trigger, 1)
    }


def compute_combined_hazard_risk(
    rainfall_24h_mm: float,
    rainfall_72h_mm: float,
    soil_moisture_pct: float,
    slope_angle: float = 35.0,
    ndvi_current: float = 0.5,
    ndvi_change_5yr: float = -0.1,
    distance_to_mining_km: float = 2.0,
    distance_to_fault_line_km: float = 4.2,
    satellite_change_detected: bool = False,
    forecast_24h_mm: float = 30.0,
    land_use_change_flag: bool = True,
    historical_landslide_density: int = 3,
    existing_susceptibility_score: float = None
) -> dict:
    # 1. Base Susceptibility
    if existing_susceptibility_score is not None and existing_susceptibility_score > 0:
        sus_score = existing_susceptibility_score
        sus_breakdown = {"totalSusceptibilityScore": sus_score}
    else:
        sus_breakdown = compute_susceptibility_score(
            ndvi_current=ndvi_current,
            ndvi_change_5yr=ndvi_change_5yr,
            distance_to_mining_km=distance_to_mining_km,
            distance_to_fault_line_km=distance_to_fault_line_km,
            satellite_change_detected=satellite_change_detected,
            land_use_change_flag=land_use_change_flag,
            slope_angle=slope_angle,
            historical_landslide_density=historical_landslide_density
        )
        sus_score = sus_breakdown["totalSusceptibilityScore"]

    # 2. Dynamic Trigger
    trig_breakdown = compute_trigger_score(rainfall_24h_mm, rainfall_72h_mm, soil_moisture_pct, forecast_24h_mm)
    trig_score = trig_breakdown["totalTriggerScore"]

    # 3. Combined Risk Formula with Causal Multiplier
    sus_factor = sus_score / 100.0
    combined_score = min(100.0, (sus_score * 0.40) + (trig_score * 0.60) + (sus_factor * trig_score * 0.15))

    # Determine Tier
    if combined_score >= 75.0:
        tier = "DANGER"
        confidence = min(96.0, 75.0 + (combined_score - 75.0) * 0.8)
    elif combined_score >= 50.0:
        tier = "WARNING"
        confidence = 65.0 + (combined_score - 50.0) * 0.5
    elif combined_score >= 30.0:
        tier = "WATCH"
        confidence = 55.0 + (combined_score - 30.0) * 0.4
    else:
        tier = "SAFE"
        confidence = 90.0 - combined_score * 0.3

    # Contributing factors for Explainability Panel
    factors = []
    if rainfall_24h_mm > 65:
        factors.append({"name": "24h Heavy Precipitation", "weight": 32, "description": f"{rainfall_24h_mm} mm in 24h"})
    if soil_moisture_pct > 65:
        factors.append({"name": "Soil Saturation Rate", "weight": 24, "description": f"{soil_moisture_pct}% moisture"})
    if distance_to_mining_km < 3.0:
        factors.append({"name": "Rat-Hole Mining Proximity", "weight": 16, "description": f"{distance_to_mining_km} km to active mining site"})
    if distance_to_fault_line_km < 5.0:
        factors.append({"name": "Active Tectonic Fault Line", "weight": 16, "description": f"{distance_to_fault_line_km} km to Dauki/Kopili Fault (Zone V)"})
    if satellite_change_detected:
        factors.append({"name": "Sentinel-2 Visual Scarp Delta", "weight": 12, "description": "Satellite CNN flagged abrupt surface displacement"})
    if ndvi_change_5yr < -0.05:
        factors.append({"name": "5-Yr Jhum NDVI Deforestation", "weight": 10, "description": f"{round(ndvi_change_5yr*100, 1)}% NDVI loss"})
    if slope_angle > 30:
        factors.append({"name": "Steep Escarpment Slope", "weight": 10, "description": f"{slope_angle}° incline"})

    # 4. Flash Flood Assessment (Incorporating Drainage Density, River Stage & Soil/LULC Curve Number)
    drainage_density = kwargs.get("drainage_density", 2.8)
    water_level_m = kwargs.get("water_level_m", 1.4)
    hist_flood_count = kwargs.get("historical_flood_count", 2)
    soil_type = kwargs.get("soil_type", "Clay Loam")
    curve_number = kwargs.get("curve_number", 78.0)

    rain_rate_hourly = rainfall_24h_mm / 12.0
    drainage_boost = max(0.0, (drainage_density - 2.0) * 5.0)
    river_boost = max(0.0, (water_level_m - 1.5) * 8.0) if water_level_m > 2.0 else 0.0
    flood_hist_boost = min(10.0, hist_flood_count * 2.5)

    raw_flood_score = (rainfall_24h_mm * 0.45) + (soil_moisture_pct * 0.25) + drainage_boost + river_boost + flood_hist_boost
    flash_flood_score = min(96.0, max(10.0, round(raw_flood_score)))

    if flash_flood_score >= 75.0 or rain_rate_hourly > 18.0 or rainfall_24h_mm > 120.0:
        flash_flood_risk = "DANGER"
        flash_flood_window = "Next 2–4 hours"
    elif flash_flood_score >= 50.0 or rain_rate_hourly > 9.0 or rainfall_24h_mm > 65.0:
        flash_flood_risk = "WARNING"
        flash_flood_window = "Next 2–4 hours"
    elif flash_flood_score >= 30.0 or rainfall_24h_mm > 40.0:
        flash_flood_risk = "WATCH"
        flash_flood_window = "Next 4–8 hours"
    else:
        flash_flood_risk = "LOW"
        flash_flood_window = "None"

    # 5. Flood Extent (SCS-CN approximation with variable Curve Number)
    cn = float(curve_number or 78.0)
    if "clay" in str(soil_type).lower():
        cn = max(cn, 82.0)
    if "shale" in str(soil_type).lower():
        cn = max(cn, 84.0)

    p = rainfall_24h_mm
    s = (25400.0 / cn) - 254.0
    ia = 0.2 * s
    if p > ia:
        q_runoff_mm = ((p - ia) ** 2) / (p - ia + s)
    else:
        q_runoff_mm = 0.0

    flood_extent_sqkm = round(max(0.1, (q_runoff_mm / 100.0) * (3.0 + drainage_density * 0.35)), 2)
    inundation_radius_m = round((flood_extent_sqkm * 1000000.0 / 3.14159265) ** 0.5)

    if flash_flood_score >= 45.0:
        factors.append({
            "name": "Hydrology Catchment Runoff (SCS-CN)",
            "weight": 22,
            "description": f"{round(q_runoff_mm, 1)} mm runoff depth (CN={cn}, Dd={drainage_density} km/km²)"
        })

    return {
        "landslideRisk": tier,
        "landslideScore": round(combined_score, 1),
        "landslideConfidence": round(confidence, 1),
        "susceptibilityScore": round(sus_score, 1),
        "susceptibilityContribution": round((sus_score * 0.40 / max(1.0, combined_score)) * 100, 1),
        "triggerContribution": round((trig_score * 0.60 / max(1.0, combined_score)) * 100, 1),
        "flashFloodRisk": flash_flood_risk,
        "flashFloodScore": round(flash_flood_score, 1),
        "flashFloodWindow": flash_flood_window,
        "floodExtentSqKm": flood_extent_sqkm,
        "runoffMm": round(q_runoff_mm, 1),
        "inundationRadiusMeters": inundation_radius_m,
        "drainageDensity": drainage_density,
        "contributingFactors": factors,
        "susceptibilityBreakdown": sus_breakdown,
        "triggerBreakdown": trig_breakdown
    }
