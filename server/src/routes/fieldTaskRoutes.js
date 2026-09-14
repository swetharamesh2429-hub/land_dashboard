import express from 'express';
import { getMyTasks, submitFieldTaskReport, updateRoadStatus } from '../controllers/fieldTaskController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/my', protect, getMyTasks);
router.post('/:id/submit', protect, authorizeRoles('FIELD_OFFICER', 'OFFICER', 'SUPER_ADMIN'), submitFieldTaskReport);
router.patch('/road-status', protect, authorizeRoles('FIELD_OFFICER', 'OFFICER', 'SUPER_ADMIN'), updateRoadStatus);

export default router;
