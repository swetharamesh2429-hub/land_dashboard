import express from 'express';
import { triggerSOS, getActiveSOS, resolveSOS } from '../controllers/sosController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Citizen trigger (no auth required so distressed users without login can trigger SOS)
router.post('/', triggerSOS);
router.get('/', getActiveSOS);
router.patch('/:id/resolve', protect, authorizeRoles('OFFICER', 'FIELD_OFFICER', 'SUPER_ADMIN'), resolveSOS);

export default router;
