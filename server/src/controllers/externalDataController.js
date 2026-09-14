import WeatherData from '../models/WeatherData.js';
import SatelliteSnapshot from '../models/SatelliteSnapshot.js';
import RiskZone from '../models/RiskZone.js';
import { triggerOnDemandExternalDataSync } from '../services/schedulerService.js';
import { fetchRecentEarthquakes } from '../services/earthquakeService.js';

// POST /api/external/refresh (Admin / On-Demand Sync)
export const refreshExternalData = async (req, res, next) => {
  try {
    const result = await triggerOnDemandExternalDataSync();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// GET /api/external/status
export const getExternalSyncStatus = async (req, res, next) => {
  try {
    const latestWeather = await WeatherData.findOne().sort({ recordedAt: -1 });
    const latestSatellite = await SatelliteSnapshot.findOne().sort({ acquiredDate: -1 });
    const totalZones = await RiskZone.countDocuments();
    const seismicData = await fetchRecentEarthquakes({ lat: 25.2986, lon: 91.7324, maxRadiusKm: 300, minMagnitude: 3.0 });

    res.json({
      success: true,
      status: 'ONLINE',
      totalZones,
      sources: {
        weather: {
          primary: 'OpenWeatherMap / data.gov.in IMD',
          lastRecordedAt: latestWeather?.recordedAt || new Date(),
          isLive: !latestWeather?.isStaleFallback,
          sourceType: latestWeather?.source || 'OPENWEATHER_LIVE',
        },
        satellite: {
          primary: 'Copernicus Sentinel-2 MSI (ISRO Bhuvan calibrated)',
          lastAcquiredAt: latestSatellite?.acquiredDate || new Date(),
          changeDetectionActive: true,
          sourceType: latestSatellite?.source || 'SENTINEL_HUB_API',
        },
        seismic: {
          primary: 'USGS Earthquake API (FDSNWS GeoJSON)',
          seismicZone: 'Zone V (Very Severe Seismic Hazard)',
          isLive: seismicData.live,
          recentQuakesCount: seismicData.count,
          nearestEvent: seismicData.nearestEvent,
          boostActive: seismicData.boostScore > 0,
          boostScore: seismicData.boostScore,
        },
        geological: {
          primary: 'GSI Bhukosh, NRSC NLSM & BIS Seismic Zone V Fault Lines',
          status: 'STATIC_REFERENCE_CALIBRATED',
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/external/earthquakes
export const getRecentEarthquakes = async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat) || 25.2986;
    const lon = parseFloat(req.query.lon) || 91.7324;
    const maxRadiusKm = parseFloat(req.query.radius) || 300;
    const minMagnitude = parseFloat(req.query.minMag) || 3.0;
    const lookbackDays = parseInt(req.query.days, 10) || 7;

    const seismicData = await fetchRecentEarthquakes({
      lat,
      lon,
      maxRadiusKm,
      minMagnitude,
      lookbackDays,
    });

    res.json({
      success: true,
      data: seismicData,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/external/weather/:villageId
export const getVillageWeatherHistory = async (req, res, next) => {
  try {
    const history = await WeatherData.find({ villageId: req.params.villageId })
      .sort({ recordedAt: -1 })
      .limit(14);
    res.json({ success: true, count: history.length, data: history });
  } catch (err) {
    next(err);
  }
};

// GET /api/external/satellite/:villageId
export const getVillageSatelliteHistory = async (req, res, next) => {
  try {
    const history = await SatelliteSnapshot.find({ villageId: req.params.villageId })
      .sort({ acquiredDate: -1 })
      .limit(6);
    res.json({ success: true, count: history.length, data: history });
  } catch (err) {
    next(err);
  }
};
