import express from 'express';
import { getSensors, getSensorHistory, ingestTelemetry } from '../controllers/sensorController.js';

const router = express.Router();

router.get('/', getSensors);
router.get('/:id/history', getSensorHistory);
router.post('/telemetry', ingestTelemetry);

export default router;
