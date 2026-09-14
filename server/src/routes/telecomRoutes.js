import express from 'express';
import Alert from '../models/Alert.js';
import User from '../models/User.js';
import { createNotification } from '../services/notificationService.js';
import { getIO } from '../services/socketService.js';

const router = express.Router();

/**
 * Vonage Inbound SMS Webhook
 * Supports both POST (JSON / form) and GET query parameters as sent by Vonage webhook runner.
 */
const handleInboundSms = async (req, res, next) => {
  try {
    const data = req.method === 'POST' ? req.body : req.query;
    console.log('📥 [VONAGE INBOUND SMS RECEIVED]:', data);

    const fromPhone = data.from || data.msisdn || data.sender || '';
    const text = (data.text || data.keyword || data.message || '').trim();
    const cleanPhone = fromPhone.replace(/[^0-9]/g, '');

    // Look up citizen profile if registered
    let citizen = null;
    if (cleanPhone) {
      citizen = await User.findOne({
        phone: { $regex: cleanPhone.slice(-10) },
      });
    }

    const isSafeReply = /safe|ok|fine|survived|evacuated|secure/i.test(text);

    // Find the latest active or confirmed DANGER / WARNING alert
    const targetAlert = await Alert.findOne({
      status: { $in: ['CONFIRMED_DISPATCHED', 'AUTO_DETECTED', 'PENDING_OFFICER_REVIEW'] },
    }).sort({ createdAt: -1 });

    let updatedAlert = null;
    if (targetAlert) {
      if (!targetAlert.citizenCheckIns) {
        targetAlert.citizenCheckIns = { safeCount: 0, totalNotified: 50, responses: [] };
      }

      // Check if this phone already responded
      const alreadyResponded = targetAlert.citizenCheckIns.responses.some(
        (r) => r.phone && cleanPhone && r.phone.includes(cleanPhone.slice(-10))
      );

      if (!alreadyResponded) {
        if (isSafeReply) {
          targetAlert.citizenCheckIns.safeCount = (targetAlert.citizenCheckIns.safeCount || 0) + 1;
        }
        targetAlert.citizenCheckIns.responses.push({
          phone: fromPhone,
          senderName: citizen?.name || 'Local Citizen',
          text,
          respondedAt: new Date(),
        });
        targetAlert.markModified('citizenCheckIns');
        updatedAlert = await targetAlert.save();
      } else {
        updatedAlert = targetAlert;
      }
    }

    // Persist durable notification for EOC Officers
    const senderDisplayName = citizen?.name ? `${citizen.name} (${fromPhone})` : fromPhone;
    await createNotification({
      role: 'OFFICER',
      type: 'SYSTEM',
      relatedEntityId: targetAlert?._id?.toString() || null,
      title: isSafeReply ? `✅ Citizen Check-In: SAFE` : `📩 Citizen SMS Reply`,
      message: `${senderDisplayName} in ${targetAlert?.villageName || 'monitored zone'} replied: "${text}"`,
      villageName: targetAlert?.villageName || null,
    });

    // Real-time broadcast via Socket.IO
    try {
      const io = getIO();
      if (io) {
        io.emit('CITIZEN_CHECKIN_RECEIVED', {
          alertId: targetAlert?._id,
          safeCount: targetAlert?.citizenCheckIns?.safeCount || 1,
          totalNotified: targetAlert?.citizenCheckIns?.totalNotified || 50,
          phone: fromPhone,
          text,
          isSafe: isSafeReply,
          citizenName: citizen?.name || 'Local Citizen',
          villageName: targetAlert?.villageName || 'Sohra',
          timestamp: new Date(),
        });
      }
    } catch (sockErr) {
      console.warn('Socket broadcast skipped in test environment');
    }

    res.status(200).json({
      success: true,
      message: 'Inbound SMS processed successfully',
      isSafeReply,
      safeCount: updatedAlert?.citizenCheckIns?.safeCount || 0,
    });
  } catch (err) {
    console.error('❌ Error processing Vonage inbound SMS:', err);
    res.status(200).json({ success: false, error: err.message }); // Return 200 to prevent webhook retry storms
  }
};

router.post('/inbound-sms', handleInboundSms);
router.get('/inbound-sms', handleInboundSms);

export default router;
