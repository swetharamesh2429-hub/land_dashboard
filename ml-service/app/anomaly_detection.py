"""
Statistical and Range-Based Sensor Anomaly Detection
Detects flatlines, sudden unphysical spikes, out-of-physical-range values, and Z-score deviations.
"""
import numpy as np

def detect_sensor_anomaly(sensor_type: str, current_value: float, recent_history: list = None) -> dict:
    """
    Evaluates whether an incoming reading is anomalous.
    Returns { isAnomaly: bool, reason: str, recommendedAction: str }
    """
    recent_history = recent_history or []
    
    # 1. Physical limits validation
    limits = {
        "RAIN_GAUGE": (0.0, 400.0), # mm/hr
        "SOIL_MOISTURE": (0.0, 100.0), # %
        "TILTMETER": (-45.0, 45.0), # degrees displacement
        "VIBRATION": (0.0, 20.0), # mm/s PPV
        "WATER_LEVEL": (0.0, 25.0) # meters
    }
    
    sensor_key = sensor_type.upper().replace(" ", "_")
    if sensor_key in limits:
        min_v, max_v = limits[sensor_key]
        if current_value < min_v or current_value > max_v:
            return {
                "isAnomaly": True,
                "reason": f"Out of physical operational bounds ({min_v} to {max_v})",
                "anomalyType": "OUT_OF_RANGE",
                "recommendedAction": "Use nearest spatial neighbor sensor fallback"
            }

    # 2. Flatline detection (if last 8 readings are identical non-zero values)
    if len(recent_history) >= 8:
        if all(abs(x - current_value) < 1e-4 for x in recent_history[-8:]) and current_value > 0.05:
            return {
                "isAnomaly": True,
                "reason": "Sensor transducer flatline detected across 8 consecutive intervals",
                "anomalyType": "FLATLINE",
                "recommendedAction": "Flag sensor for maintenance; switch to interpolative grid"
            }

    # 3. Z-score spike detection
    if len(recent_history) >= 10:
        arr = np.array(recent_history)
        mean = np.mean(arr)
        std = np.std(arr)
        if std > 1e-4:
            z_score = abs(current_value - mean) / std
            if z_score > 3.8:
                return {
                    "isAnomaly": True,
                    "reason": f"Statistical spike anomaly (Z-Score: {round(z_score, 2)})",
                    "anomalyType": "STATISTICAL_SPIKE",
                    "recommendedAction": "Cross-verify with adjacent sensor before alerting"
                }

    return {
        "isAnomaly": False,
        "reason": "Reading within valid normal bounds",
        "anomalyType": "NONE",
        "recommendedAction": "Ingest reading normally"
    }
