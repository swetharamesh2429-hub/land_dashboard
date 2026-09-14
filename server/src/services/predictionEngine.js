import axios from 'axios';
import RiskZone from '../models/RiskZone.js';
import Alert from '../models/Alert.js';
import { emitEvent } from './socketService.js';
import { dispatchMultiChannelAlert } from './alertDispatcher.js';
import { fetchRecentEarthquakes, computeSeismicRiskBoost } from './earthquakeService.js';

/**
 * Native Node.js Fallback Prediction Engine
 * Replicates the Python FastAPI mathematical formulation with Fault Line Proximity,
 * Live USGS Seismic Zone V Telemetry, Sentinel-2 CNN surface displacement flags,
 * and LSTM 24h rainfall momentum.
 */
export const computeNativeHazardPrediction = ({
  rainfall24h = 30,
  rainfall72h = 50,
  soilMoisture = 40,
  slopeAngle = 35,
  ndviCurrent = 0.52,
  ndviChange5yr = -0.12,
  distanceToMiningSiteKm = 2.1,
  distanceToFaultLineKm = 4.2,
  satelliteChangeDetectedFlag = false,
  forecastNext24hMm = 35,
  landUseChangeFlag = true,
  historicalLandslideDensity = 3,
  historicalLandslideCount = null,
  drainageDensityKmPerSqKm = 2.8,
  soilType = 'Clay Loam (Moderate Infiltration)',
  curveNumber = 78,
  lulcClass = 'Dense Subtropical Forest / Valley Vegetation',
  historicalFloodCount = 2,
  waterLevelMeters = 1.4,
  susceptibilityScore = null,
  seismicBoost = 0,
  seismicFactor = null,
}) => {
  // 1. Static Susceptibility (0 - 100) — GAP 1 Balanced Formula
  let susScore = 0;
  if (susceptibilityScore !== null && susceptibilityScore !== undefined) {
    susScore = susceptibilityScore;
  } else {
    // a. Slope Gradient (30% weight)
    const slopeScore = slopeAngle >= 42 ? 30 : slopeAngle >= 35 ? 24 : slopeAngle >= 25 ? 15 : 6;

    // b. Mining Proximity (20% weight)
    const miningScore = distanceToMiningSiteKm < 1.0 ? 20 : distanceToMiningSiteKm < 2.5 ? 15 : distanceToMiningSiteKm < 5.0 ? 8 : 2;

    // c. Seismic Fault Line Proximity (20% weight — Part B GAP 1)
    const faultScore = distanceToFaultLineKm < 2.0 ? 20 : distanceToFaultLineKm < 5.0 ? 15 : distanceToFaultLineKm < 10.0 ? 8 : 2;

    // d. Sentinel-2 NDVI 5-Year Forest Loss (15% weight)
    const vegScore = ndviChange5yr <= -0.20 ? 15 : ndviChange5yr <= -0.10 ? 10 : ndviChange5yr < 0 ? 5 : 1;

    // e. Historical Density & Land Use (15% weight)
    const histScore = Math.min(15, historicalLandslideDensity * 3 + (landUseChangeFlag ? 4 : 0));

    // f. CNN Satellite Scarp Detection Flag Boost (Part C GAP 2)
    const cnnBoost = satelliteChangeDetectedFlag ? 12 : 0;

    susScore = Math.min(100, slopeScore + miningScore + faultScore + vegScore + histScore + cnnBoost);
  }

  // 2. Dynamic Trigger (0 - 100) — Incorporating LSTM 24h Forecast Momentum & Live Seismic Boost (Zone V)
  const r24Score = Math.min(40, (rainfall24h / 140) * 40);
  const r72Score = Math.min(25, (rainfall72h / 280) * 25);
  const soilScore = Math.min(25, (soilMoisture / 100) * 25);
  const lstmForecastScore = Math.min(10, (forecastNext24hMm / 100) * 10);
  const liveSeismicScore = Math.min(20, seismicBoost || 0);
  const triggerScore = Math.min(100, r24Score + r72Score + soilScore + lstmForecastScore + liveSeismicScore);

  // 3. Combined Risk Formula with Causal Multiplier
  const susFactor = susScore / 100;
  const combinedScore = Math.min(100, (susScore * 0.40) + (triggerScore * 0.60) + (susFactor * triggerScore * 0.15));

  // Determine Tier
  let tier = 'SAFE';
  let confidence = 85;
  if (combinedScore >= 75) {
    tier = 'DANGER';
    confidence = Math.min(96, Math.round(75 + (combinedScore - 75) * 0.8));
  } else if (combinedScore >= 50) {
    tier = 'WARNING';
    confidence = Math.round(65 + (combinedScore - 50) * 0.5);
  } else if (combinedScore >= 30) {
    tier = 'WATCH';
    confidence = Math.round(55 + (combinedScore - 30) * 0.4);
  } else {
    tier = 'SAFE';
    confidence = Math.round(90 - combinedScore * 0.3);
  }

  // Contributing Factors for Explainability (Updated with Fault Line & Satellite & Live USGS Seismic)
  const factors = [];
  if (seismicFactor) {
    factors.push(seismicFactor);
  }
  if (rainfall24h > 65) {
    factors.push({ name: '24h Heavy Precipitation', weight: 32, description: `${Math.round(rainfall24h)} mm recorded in 24h` });
  }
  if (soilMoisture > 65) {
    factors.push({ name: 'Soil Saturation Rate', weight: 24, description: `${Math.round(soilMoisture)}% pore water volume` });
  }
  if (distanceToMiningSiteKm < 3.5) {
    factors.push({ name: 'Rat-Hole Mining Proximity', weight: 16, description: `${distanceToMiningSiteKm} km to subsurface coal void` });
  }
  if (distanceToFaultLineKm < 5.0) {
    factors.push({ name: 'Active Tectonic Fault Line', weight: 16, description: `${distanceToFaultLineKm} km to Dauki/Kopili Fault (Zone V)` });
  }
  if (satelliteChangeDetectedFlag) {
    factors.push({ name: 'Sentinel-2 Visual Scarp Delta', weight: 12, description: 'Satellite CNN flagged abrupt surface displacement' });
  }
  if (ndviChange5yr < -0.05) {
    factors.push({ name: '5-Yr Jhum NDVI Deforestation', weight: 10, description: `${Math.round(ndviChange5yr * 100)}% vegetative root loss` });
  }
  if (slopeAngle > 30) {
    factors.push({ name: 'Steep Escarpment Slope', weight: 10, description: `${slopeAngle}° incline gradient` });
  }
  const histCount = historicalLandslideCount !== null ? historicalLandslideCount : historicalLandslideDensity;
  if (histCount > 0) {
    factors.push({
      name: 'Historical Landslide Records (GSI)',
      weight: 12,
      description: `${histCount} historical landslide occurrences cataloged by GSI`,
    });
  }

  // 4. Flash Flood Assessment (Incorporating Drainage Density, River Stage & Soil/LULC Curve Number)
  const hourlyRate = rainfall24h / 12;
  const drainageBoost = Math.max(0, (drainageDensityKmPerSqKm - 2.0) * 5.0);
  const riverBoost = waterLevelMeters > 2.0 ? (waterLevelMeters - 1.5) * 8.0 : 0;
  const floodHistBoost = Math.min(10, (historicalFloodCount || 0) * 2.5);

  let rawFloodScore = (rainfall24h * 0.45) + (soilMoisture * 0.25) + drainageBoost + riverBoost + floodHistBoost;
  const flashFloodScore = Math.min(96, Math.max(10, Math.round(rawFloodScore)));

  let flashFloodRisk = 'LOW';
  let flashFloodWindow = 'None';
  if (flashFloodScore >= 75 || hourlyRate > 18 || rainfall24h > 120) {
    flashFloodRisk = 'DANGER';
    flashFloodWindow = 'Next 2–4 hours';
  } else if (flashFloodScore >= 50 || hourlyRate > 9 || rainfall24h > 65) {
    flashFloodRisk = 'WARNING';
    flashFloodWindow = 'Next 2–4 hours';
  } else if (flashFloodScore >= 30 || rainfall24h > 40) {
    flashFloodRisk = 'WATCH';
    flashFloodWindow = 'Next 4–8 hours';
  }

  // 5. Flood Extent (SCS-CN Runoff Equation with variable Curve Number by Soil & LULC)
  let effectiveCN = curveNumber || 78.0;
  if (soilType && soilType.toLowerCase().includes('clay')) effectiveCN = Math.max(effectiveCN, 82.0);
  if (soilType && soilType.toLowerCase().includes('shale')) effectiveCN = Math.max(effectiveCN, 84.0);
  if (soilType && soilType.toLowerCase().includes('sand')) effectiveCN = Math.min(effectiveCN, 70.0);

  const s = (25400.0 / effectiveCN) - 254.0;
  const ia = 0.2 * s;
  let qRunoff = 0;
  if (rainfall24h > ia) {
    qRunoff = Math.pow(rainfall24h - ia, 2) / (rainfall24h - ia + s);
  }
  // Flood extent in km² incorporating drainage network concentration
  const floodExtentSqKm = Number(Math.max(0.1, (qRunoff / 100) * (3.0 + (drainageDensityKmPerSqKm || 2.5) * 0.35)).toFixed(2));
  const inundationRadiusMeters = Math.round(Math.sqrt((floodExtentSqKm * 1000000) / Math.PI));

  // Add flood contributing factor if flood risk is elevated
  if (flashFloodScore >= 45) {
    factors.push({
      name: 'Hydrology Catchment Runoff (SCS-CN)',
      weight: 22,
      description: `${qRunoff.toFixed(1)} mm runoff depth (CN=${effectiveCN}, Dd=${drainageDensityKmPerSqKm} km/km²)`,
    });
  }

  return {
    landslideRisk: tier,
    landslideScore: Number(combinedScore.toFixed(1)),
    landslideConfidence: confidence,
    susceptibilityScore: Number(susScore.toFixed(1)),
    susceptibilityContribution: Number(((susScore * 0.40 / Math.max(1, combinedScore)) * 100).toFixed(1)),
    triggerContribution: Number(((triggerScore * 0.60 / Math.max(1, combinedScore)) * 100).toFixed(1)),
    flashFloodRisk,
    flashFloodScore,
    flashFloodWindow,
    floodExtentSqKm,
    runoffMm: Number(qRunoff.toFixed(1)),
    inundationRadiusMeters,
    drainageDensity: drainageDensityKmPerSqKm,
    effectiveCN,
    contributingFactors: factors,
    sourceEngine: 'Embedded Node.js ML Engine (Rebalanced GSI + LSTM + SCS-CN)',
  };
};

/**
 * Master Prediction Dispatcher:
 * Attempts FastAPI microservice first, then falls back instantly to native engine.
 */
export const predictHazardRisk = async (payload) => {
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
  try {
    const response = await axios.post(`${mlServiceUrl}/api/predict/hazard-risk`, payload, {
      timeout: 1500,
    });
    if (response.data && response.data.success) {
      const pred = response.data.prediction;
      if (payload.seismicBoost && payload.seismicFactor && pred) {
        if (!pred.contributingFactors?.some(f => f.name.includes('Seismic'))) {
          pred.contributingFactors = [payload.seismicFactor, ...(pred.contributingFactors || [])];
          pred.landslideScore = Math.min(100, Number((pred.landslideScore + payload.seismicBoost * 0.4).toFixed(1)));
        }
      }
      return {
        ...pred,
        sourceEngine: 'Python FastAPI Microservice (FastAPI + SciPy)',
      };
    }
  } catch (err) {
    // Microservice offline or timeout - seamlessly use robust native math engine
  }
  return computeNativeHazardPrediction(payload);
};

/**
 * Evaluates all risk zones and generates or updates alerts
 */
export const evaluateAllRiskZones = async () => {
  const zones = await RiskZone.find({});
  const updatedZones = [];

  for (const zone of zones) {
    const [lon, lat] = zone.location?.coordinates || [91.7324, 25.2986];
    
    // Query live USGS seismic activity within 300km (Zone V empirical signal)
    let seismicBoost = 0;
    let seismicFactor = null;
    try {
      const seismicData = await fetchRecentEarthquakes({ lat, lon, maxRadiusKm: 300, minMagnitude: 3.0 });
      seismicBoost = seismicData.boostScore || 0;
      seismicFactor = seismicData.factor || null;
    } catch (e) {
      // Graceful failure - keep baseline risk evaluation
    }

    const prediction = await predictHazardRisk({
      rainfall24h: zone.currentTelemetry?.rainfall24h || 25,
      rainfall72h: zone.currentTelemetry?.rainfall72h || 40,
      soilMoisture: zone.currentTelemetry?.soilMoisture || 50,
      slopeAngle: zone.susceptibility?.slopeAngle || 38,
      ndviCurrent: zone.susceptibility?.ndviCurrent || 0.52,
      ndviChange5yr: zone.susceptibility?.ndviChange5yr || -0.12,
      distanceToMiningSiteKm: zone.susceptibility?.distanceToMiningSiteKm || 2.1,
      distanceToFaultLineKm: zone.susceptibility?.distanceToFaultLineKm || 4.2,
      satelliteChangeDetectedFlag: zone.susceptibility?.satelliteChangeDetectedFlag || false,
      forecastNext24hMm: zone.currentTelemetry?.forecastNext24hMm || 30,
      historicalLandslideDensity: zone.susceptibility?.historicalLandslideDensity || 3,
      historicalLandslideCount: zone.susceptibility?.historicalLandslideCount || 6,
      drainageDensityKmPerSqKm: zone.susceptibility?.drainageDensityKmPerSqKm || 2.8,
      soilType: zone.susceptibility?.soilType || 'Clay Loam (Moderate Infiltration)',
      curveNumber: zone.susceptibility?.curveNumber || 78,
      lulcClass: zone.susceptibility?.lulcClass || 'Dense Subtropical Forest / Valley Vegetation',
      historicalFloodCount: zone.susceptibility?.historicalFloodCount || 2,
      waterLevelMeters: zone.currentTelemetry?.waterLevelMeters || 1.4,
      seismicBoost,
      seismicFactor,
    });

    zone.combinedRisk = {
      tier: prediction.landslideRisk,
      score: prediction.landslideScore,
      confidence: prediction.landslideConfidence,
      landslideScore: prediction.landslideScore,
      flashFloodScore: prediction.flashFloodScore,
      flashFloodWindow: prediction.flashFloodWindow,
      floodExtentSqKm: prediction.floodExtentSqKm,
      runoffMm: prediction.runoffMm,
      drainageDensity: prediction.drainageDensity,
      susceptibilityContribution: prediction.susceptibilityContribution,
      triggerContribution: prediction.triggerContribution,
      contributingFactors: prediction.contributingFactors,
      lastEvaluated: new Date(),
    };

    zone.susceptibility.score = prediction.susceptibilityScore;
    await zone.save();
    updatedZones.push(zone);

    emitEvent('RISK_ZONE_UPDATED', zone, zone.districtId);
  }

  return updatedZones;
};
