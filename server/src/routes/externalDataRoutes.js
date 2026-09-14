import express from 'express';
import {
  refreshExternalData,
  getExternalSyncStatus,
  getRecentEarthquakes,
  getVillageWeatherHistory,
  getVillageSatelliteHistory,
} from '../controllers/externalDataController.js';

const router = express.Router();

router.post('/refresh', refreshExternalData);
router.get('/status', getExternalSyncStatus);
router.get('/earthquakes', getRecentEarthquakes);
router.get('/weather/:villageId', getVillageWeatherHistory);
router.get('/satellite/:villageId', getVillageSatelliteHistory);

export default router;
