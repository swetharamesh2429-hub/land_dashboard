import express from 'express';
import {
  getAccuracyMetrics,
  getRainfallTrend,
  getFeatureImportance,
  getAuditLogs,
} from '../controllers/analyticsController.js';

const router = express.Router();

router.get('/accuracy', getAccuracyMetrics);
router.get('/rainfall-trend', getRainfallTrend);
router.get('/feature-importance', getFeatureImportance);
router.get('/audit-logs', getAuditLogs);

export default router;
