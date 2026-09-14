import express from 'express';
import { getVapidPublicKey, saveSubscription, sendEmergencyWebPush } from '../services/webPushService.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/vapid-public-key', (req, res) => {
  res.json({
    success: true,
    publicKey: getVapidPublicKey(),
  });
});

router.post('/subscribe', optionalAuth, async (req, res, next) => {
  try {
    const { subscription, villageName } = req.body;
    const userId = req.user?._id || null;
    const role = req.user?.role || req.body.role || 'CITIZEN';

    const result = await saveSubscription({
      userId,
      role,
      villageName,
      subscription,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/test', async (req, res, next) => {
  try {
    const { title, message, villageName } = req.body;
    const result = await sendEmergencyWebPush({
      title: title || '🚨 RAKSHA-NER Alert Test',
      message: message || 'Web Push test notification delivered successfully.',
      villageName,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
