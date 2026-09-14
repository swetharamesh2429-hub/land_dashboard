import { syncAllRiskZonesWeather } from './weatherService.js';
import { syncAllSatelliteSnapshots } from './satelliteService.js';
import { runGsiSusceptibilityIngestion } from '../scripts/importGsiSusceptibility.js';
import { evaluateAllRiskZones } from './predictionEngine.js';
import { clearEarthquakeCache } from './earthquakeService.js';

/**
 * Background Scheduler & External Data Synchronization Service
 * Manages periodic weather polling, weekly satellite updates, and on-demand admin refreshes.
 */

let weatherInterval = null;
let satelliteInterval = null;

export const startBackgroundSchedulers = () => {
  console.log('⏱️ Initializing Background Data Ingestion Schedulers...');

  // 1. Initial startup sync
  setTimeout(async () => {
    try {
      await runGsiSusceptibilityIngestion();
      await syncAllRiskZonesWeather();
      await syncAllSatelliteSnapshots();
      await evaluateAllRiskZones();
      console.log('✅ Initial Multi-Source Ingestion & AI Model Evaluation Complete.');
    } catch (err) {
      console.warn('Initial scheduler sync note:', err.message);
    }
  }, 3000);

  // 2. Weather & Rainfall Telemetry Polling (Every 20 minutes)
  weatherInterval = setInterval(async () => {
    try {
      console.log('🔄 Periodic Scheduler: Polling Weather & Sensor Telemetry...');
      await syncAllRiskZonesWeather();
      await evaluateAllRiskZones();
    } catch (err) {
      console.error('Weather scheduler error:', err);
    }
  }, 20 * 60 * 1000);

  // 3. Sentinel-2 Satellite Multi-Spectral Snapshot (Every 7 Days or Staged)
  satelliteInterval = setInterval(async () => {
    try {
      console.log('🛰️ Periodic Scheduler: Syncing Sentinel-2 Multi-Spectral Imagery...');
      await syncAllSatelliteSnapshots();
      await evaluateAllRiskZones();
    } catch (err) {
      console.error('Satellite scheduler error:', err);
    }
  }, 7 * 24 * 60 * 60 * 1000);
};

export const stopBackgroundSchedulers = () => {
  if (weatherInterval) clearInterval(weatherInterval);
  if (satelliteInterval) clearInterval(satelliteInterval);
};

// Admin On-Demand Refresh Trigger
export const triggerOnDemandExternalDataSync = async () => {
  console.log('⚡ Admin triggered on-demand external data sync...');
  clearEarthquakeCache();
  await runGsiSusceptibilityIngestion();
  const weatherRes = await syncAllRiskZonesWeather();
  const satRes = await syncAllSatelliteSnapshots();
  const evalRes = await evaluateAllRiskZones();

  return {
    success: true,
    message: 'External data sources (OpenWeather, Sentinel-2, USGS Earthquakes, GSI Fault Lines) synchronized successfully.',
    weatherSyncCount: weatherRes.count,
    satelliteSyncCount: satRes.count,
    timestamp: new Date().toISOString(),
  };
};
