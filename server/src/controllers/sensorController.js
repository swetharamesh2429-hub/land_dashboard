import Sensor from '../models/Sensor.js';
import SensorReading from '../models/SensorReading.js';
import RiskZone from '../models/RiskZone.js';
import { emitEvent } from '../services/socketService.js';
import { predictHazardRisk } from '../services/predictionEngine.js';

// GET /api/sensors?district=
export const getSensors = async (req, res, next) => {
  try {
    const { district, status, type } = req.query;
    const filter = {};

    if (district && district !== 'ALL') {
      filter.districtId = district;
    }
    if (status && status !== 'ALL') {
      filter.status = status;
    }
    if (type && type !== 'ALL') {
      filter.type = type;
    }

    const sensors = await Sensor.find(filter).sort({ lastUpdated: -1 });

    const summary = {
      total: sensors.length,
      online: sensors.filter(s => s.status === 'ONLINE').length,
      offline: sensors.filter(s => s.status === 'OFFLINE').length,
      faulty: sensors.filter(s => s.status === 'FAULTY_ANOMALY').length,
      avgFreshnessSec: 18,
    };

    res.json({
      success: true,
      summary,
      count: sensors.length,
      data: sensors,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/sensors/:id/history
export const getSensorHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;

    const sensor = await Sensor.findById(id);
    if (!sensor) {
      return res.status(404).json({ success: false, message: 'Sensor not found' });
    }

    const readings = await SensorReading.find({ sensorId: id })
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json({
      success: true,
      sensor,
      count: readings.length,
      data: readings.reverse(),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/sensors/telemetry (Simulated IoT Ingestion)
export const ingestTelemetry = async (req, res, next) => {
  try {
    const { sensorCode, value, batteryLevel } = req.body;

    const sensor = await Sensor.findOne({ sensorCode });
    if (!sensor) {
      return res.status(404).json({ success: false, message: 'Sensor not registered' });
    }

    // Statistical / Physical Range Anomaly Check
    let isAnomaly = false;
    let anomalyReason = '';
    let anomalyType = 'NONE';

    if (sensor.type === 'RAIN_GAUGE' && (value < 0 || value > 350)) {
      isAnomaly = true;
      anomalyType = 'OUT_OF_RANGE';
      anomalyReason = `Rainfall reading ${value} mm exceeds physical limits (0-350 mm/hr)`;
    } else if (sensor.type === 'SOIL_MOISTURE' && (value < 0 || value > 100)) {
      isAnomaly = true;
      anomalyType = 'OUT_OF_RANGE';
      anomalyReason = `Soil moisture ${value}% out of bounds (0-100%)`;
    }

    sensor.lastReadingValue = value;
    sensor.lastUpdated = new Date();
    if (batteryLevel) sensor.batteryLevelPct = batteryLevel;

    if (isAnomaly) {
      sensor.status = 'FAULTY_ANOMALY';
      sensor.anomalyDetails = {
        isAnomaly: true,
        anomalyType,
        reason: anomalyReason,
        fallbackSensorId: 'SENS-FALLBACK-01',
      };
    } else {
      if (sensor.status === 'FAULTY_ANOMALY') sensor.status = 'ONLINE';
      sensor.anomalyDetails.isAnomaly = false;
    }

    await sensor.save();

    // Store historical reading
    await SensorReading.create({
      sensorId: sensor._id,
      sensorCode: sensor.sensorCode,
      districtId: sensor.districtId,
      readingValue: value,
      unit: sensor.unit,
      isAnomaly,
      anomalyFlag: anomalyType,
    });

    // Notify Officer dashboard in real time
    emitEvent('SENSOR_STATUS_CHANGED', {
      sensorId: sensor._id,
      sensorCode: sensor.sensorCode,
      status: sensor.status,
      lastReadingValue: sensor.lastReadingValue,
      lastUpdated: sensor.lastUpdated,
      anomalyDetails: sensor.anomalyDetails,
    }, sensor.districtId);

    // If attached to a risk zone, optionally trigger risk update
    if (sensor.riskZoneId && !isAnomaly) {
      const zone = await RiskZone.findById(sensor.riskZoneId);
      if (zone) {
        if (sensor.type === 'RAIN_GAUGE') zone.currentTelemetry.rainfall24h = value;
        if (sensor.type === 'SOIL_MOISTURE') zone.currentTelemetry.soilMoisture = value;

        // Recompute hazard prediction
        const prediction = await predictHazardRisk({
          rainfall24h: zone.currentTelemetry.rainfall24h,
          rainfall72h: zone.currentTelemetry.rainfall72h,
          soilMoisture: zone.currentTelemetry.soilMoisture,
          slopeAngle: zone.susceptibility.slopeAngle,
          ndviCurrent: zone.susceptibility.ndviCurrent,
          ndviChange5yr: zone.susceptibility.ndviChange5yr,
          distanceToMiningSiteKm: zone.susceptibility.distanceToMiningSiteKm,
          landUseChangeFlag: zone.susceptibility.landUseChangeFlag,
          historicalLandslideDensity: zone.susceptibility.historicalLandslideDensity,
          susceptibilityScore: zone.susceptibility.score,
        });

        zone.combinedRisk = {
          tier: prediction.landslideRisk,
          score: prediction.landslideScore,
          confidence: prediction.landslideConfidence,
          landslideScore: prediction.landslideScore,
          flashFloodScore: prediction.flashFloodScore,
          flashFloodWindow: prediction.flashFloodWindow,
          floodExtentSqKm: prediction.floodExtentSqKm,
          susceptibilityContribution: prediction.susceptibilityContribution,
          triggerContribution: prediction.triggerContribution,
          contributingFactors: prediction.contributingFactors,
          lastEvaluated: new Date(),
        };

        await zone.save();
        emitEvent('RISK_ZONE_UPDATED', zone, zone.districtId);
      }
    }

    res.json({
      success: true,
      message: 'Telemetry ingested successfully',
      isAnomaly,
      sensor,
    });
  } catch (err) {
    next(err);
  }
};
