import express from 'express';
import {
  getRiskZones,
  getRiskZoneById,
  getRoadSegments,
  getJurisdictions,
  getRiskZoneHistory,
} from '../controllers/riskZoneController.js';

const router = express.Router();

router.get('/jurisdictions', getJurisdictions);
router.get('/road-segments', getRoadSegments);
router.get('/history', getRiskZoneHistory);
router.get('/', getRiskZones);
router.get('/:id', getRiskZoneById);

export default router;
