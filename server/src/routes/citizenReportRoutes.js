import express from 'express';
import { createCitizenReport, getCitizenReports, verifyCitizenReport } from '../controllers/citizenReportController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Citizens submit reports (supports guest/offline submissions)
router.post('/', createCitizenReport);
router.get('/', getCitizenReports);

// Officer review & verification
router.patch('/:id/verify', protect, authorizeRoles('OFFICER', 'SUPER_ADMIN'), verifyCitizenReport);

export default router;
