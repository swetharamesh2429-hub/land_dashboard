import express from 'express';
import {
  getAlerts,
  getAlertById,
  confirmAlert,
  dismissAlert,
  requestFieldVerification,
  submitCitizenAlertFeedback,
} from '../controllers/alertController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { enforceJurisdiction } from '../middleware/jurisdictionMiddleware.js';

const router = express.Router();

router.get('/', getAlerts);
router.get('/:id', getAlertById);

// Protected Officer Actions
router.post('/:id/confirm', protect, authorizeRoles('OFFICER', 'SUPER_ADMIN'), enforceJurisdiction, confirmAlert);
router.post('/:id/dismiss', protect, authorizeRoles('OFFICER', 'SUPER_ADMIN'), enforceJurisdiction, dismissAlert);
router.post('/:id/request-field-verification', protect, authorizeRoles('OFFICER', 'SUPER_ADMIN'), requestFieldVerification);

// Citizen Feedback
router.post('/:id/citizen-feedback', submitCitizenAlertFeedback);

export default router;
