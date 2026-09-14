import express from 'express';
import HistoricalLandslide from '../models/HistoricalLandslide.js';

const router = express.Router();

/**
 * GET /api/historical-landslides
 * Retrieve GSI historical landslide event inventory with optional district filter
 */
router.get('/', async (req, res) => {
  try {
    const { district } = req.query;
    const filter = {};
    if (district && district !== 'ALL') {
      filter.districtId = district;
    }
    const events = await HistoricalLandslide.find(filter).sort({ date: -1 });
    res.json({ success: true, count: events.length, data: events });
  } catch (err) {
    console.error('Failed to fetch historical landslides:', err);
    res.status(500).json({ success: false, message: 'Server error fetching historical landslides' });
  }
});

export default router;
