import RiskZone from '../models/RiskZone.js';
import Alert from '../models/Alert.js';
import Sensor from '../models/Sensor.js';
import SOS from '../models/SOS.js';
import AuditLog from '../models/AuditLog.js';
import { predictHazardRisk } from '../services/predictionEngine.js';
import { emitEvent } from '../services/socketService.js';
import { seedDatabase } from '../seed/seedData.js';

// POST /api/demo/simulate-rainfall-spike
export const simulateRainfallSpike = async (req, res, next) => {
  try {
    const { villageName = 'Sohra', rainfall24h = 138, soilMoisture = 84 } = req.body;

    const zone = await RiskZone.findOne({ name: { $regex: villageName, $options: 'i' } });
    if (!zone) {
      return res.status(404).json({ success: false, message: `Village '${villageName}' not found` });
    }

    zone.currentTelemetry.rainfall24h = rainfall24h;
    zone.currentTelemetry.rainfall72h = rainfall24h * 1.5;
    zone.currentTelemetry.soilMoisture = soilMoisture;
    zone.currentTelemetry.lastReadingTime = new Date();

    // AI Prediction Engine Call
    const prediction = await predictHazardRisk({
      villageId: zone._id.toString(),
      rainfall24h,
      rainfall72h: zone.currentTelemetry.rainfall72h,
      soilMoisture,
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

    // If tier is DANGER, create a Pending Verification Alert
    let alert = null;
    if (prediction.landslideRisk === 'DANGER') {
      const alertCode = `ALT-DNG-${Date.now().toString().slice(-4)}`;
      alert = await Alert.create({
        alertCode,
        districtId: zone.districtId,
        districtName: zone.districtName,
        villageName: zone.name,
        riskZoneId: zone._id,
        hazardType: 'LANDSLIDE',
        tier: 'DANGER',
        confidencePct: prediction.landslideConfidence,
        riskScore: prediction.landslideScore,
        timeWindow: 'Next 2–6 hours',
        contributingSources: [
          `Rainfall surge (${rainfall24h} mm in 24h)`,
          `Soil saturation high (${soilMoisture}%)`,
          `Base susceptibility high (${zone.susceptibility.score}/100: rat-hole mining proximity & vegetation loss)`,
        ],
        status: 'PENDING_OFFICER_REVIEW', // CRITICAL: Awaits Officer confirmation
      });

      await AuditLog.create({
        userName: 'AI Multi-Hazard Model',
        userRole: 'AI_PREDICTION_SERVICE',
        districtId: zone.districtId,
        action: 'ALERT_GENERATED',
        details: `Simulated rainfall spike (${rainfall24h}mm) in ${zone.name}. AI raised DANGER alert ${alert.alertCode} (${alert.confidencePct}% conf). Placed in Officer Verification Queue.`,
        metadata: { alertId: alert._id, zoneId: zone._id },
      });

      // Emit real-time event to Officer Dashboards
      emitEvent('ALERT_ESCALATED_TO_DANGER', {
        alert,
        zone,
        message: `High risk detected in ${zone.name}. Awaiting Officer verification.`,
      }, zone.districtId);
    }

    emitEvent('RISK_ZONE_UPDATED', zone, zone.districtId);

    res.json({
      success: true,
      message: `Rainfall spike (${rainfall24h} mm) simulated for ${zone.name}. AI risk escalated to ${prediction.landslideRisk} (${prediction.landslideConfidence}% confidence).`,
      zone,
      alert,
      prediction,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/demo/inject-sensor-anomaly
export const injectSensorAnomaly = async (req, res, next) => {
  try {
    const sensor = await Sensor.findOne({ type: 'RAIN_GAUGE', status: 'ONLINE' }) || await Sensor.findOne();
    if (!sensor) return res.status(404).json({ success: false, message: 'No sensor found' });

    sensor.status = 'FAULTY_ANOMALY';
    sensor.lastReadingValue = 485; // Unphysical spike
    sensor.lastUpdated = new Date();
    sensor.anomalyDetails = {
      isAnomaly: true,
      anomalyType: 'OUT_OF_RANGE_SPIKE',
      reason: 'Physical transducer spike reading (485 mm/hr) exceeding 350 mm max threshold.',
      fallbackSensorId: 'SENS-EKH-03 (Cherra Station)',
    };
    await sensor.save();

    await AuditLog.create({
      userName: 'IoT Anomaly Filter',
      userRole: 'SYSTEM',
      districtId: sensor.districtId,
      action: 'SENSOR_ANOMALY_TRIGGERED',
      details: `Sensor ${sensor.sensorCode} (${sensor.villageName}) flagged as FAULTY. Fallback active.`,
      metadata: { sensorId: sensor._id },
    });

    emitEvent('SENSOR_STATUS_CHANGED', sensor, sensor.districtId);

    res.json({
      success: true,
      message: `Anomaly injected into Sensor ${sensor.sensorCode}. Marked FAULTY with fallback active.`,
      sensor,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/demo/reset
export const resetDemoData = async (req, res, next) => {
  try {
    const seedModule = await import(`../seed/seedData.js?t=${Date.now()}`);
    if (seedModule && seedModule.seedDatabase) {
      await seedModule.seedDatabase();
    } else {
      await seedDatabase();
    }
    emitEvent('DEMO_RESET', { message: 'Database reset to initial demo state' });
    res.json({ success: true, message: 'Platform demo data successfully restored to default state.' });
  } catch (err) {
    next(err);
  }
};
