import express from 'express';
import {
  simulateRainfallSpike,
  injectSensorAnomaly,
  resetDemoData,
} from '../controllers/demoController.js';

const router = express.Router();

router.post('/simulate-rainfall-spike', simulateRainfallSpike);
router.post('/inject-sensor-anomaly', injectSensorAnomaly);
router.post('/reset', resetDemoData);

export default router;
