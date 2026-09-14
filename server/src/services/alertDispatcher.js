import mongoose from 'mongoose';
import { emitEvent } from './socketService.js';
import AuditLog from '../models/AuditLog.js';
import RiskZone from '../models/RiskZone.js';
import { generateOASISCapXml } from './capXmlGenerator.js';
import { sendSMS } from './smsGatewayService.js';
import { sendVoiceCall } from './voiceAlertService.js';
import { createNotification } from './notificationService.js';
import { sendEmergencyWebPush } from './webPushService.js';

export { sendSMS };

/**
 * Multi-Channel Disaster Notification Dispatcher
 * Dispatches real-time WebSocket events (in-app banner/modal), selects telecom channels
 * (SMS-only vs SMS+Voice via Vonage Communications API) based on zone-level network reliability configuration,
 * and compiles standard OASIS CAP v1.2 XML payloads for NDMA SACHET / cell broadcast gateways.
 * 
 * @param {Object} params
 * @param {Object} params.alert - Alert object
 * @param {Object} [params.riskZone] - RiskZone object (optional, queried if missing)
 * @param {Object} [params.officerUser] - Officer user object
 * @param {Object} [params.channelPreferences] - Channel overrides
 * @returns {Promise<Object>} Dispatched alert payload
 */
export const dispatchMultiChannelAlert = async ({
  alert,
  riskZone = null,
  officerUser = null,
  channelPreferences = { sms: true, inApp: true, cellBroadcast: true },
}) => {
  // Resolve target RiskZone for network reliability telemetry configuration
  let targetZone = riskZone;
  if (!targetZone && alert.riskZoneId) {
    try {
      targetZone = await RiskZone.findById(alert.riskZoneId);
    } catch (e) {
      // Graceful fallback to null
    }
  }

  // Generate OASIS CAP v1.2 Compliant XML Message
  const capPayload = generateOASISCapXml({
    alertCode: alert.alertCode,
    villageName: alert.villageName,
    districtName: alert.districtName,
    districtId: alert.districtId,
    hazardType: alert.hazardType,
    tier: alert.tier,
    confidencePct: alert.confidencePct,
    coordinates: alert.location?.coordinates || [91.7324, 25.2986],
    officerName: officerUser ? `${officerUser.name} (${officerUser.officerDetails?.designation || 'EOC Lead'})` : 'State EOC Officer',
    notes: alert.officerVerificationNotes || 'Pre-screened and confirmed on-ground by field officer.',
  });

  const reliability = targetZone?.networkReliability || 'UNKNOWN';
  const dispatchedChannels = {
    inApp: true,
    sms: true,
    voice: false,
    sachetCap: alert.tier === 'DANGER',
    networkReliability: reliability,
  };

  const payload = {
    alertId: alert._id,
    alertCode: alert.alertCode,
    tier: alert.tier,
    hazardType: alert.hazardType,
    villageName: alert.villageName,
    districtId: alert.districtId,
    districtName: alert.districtName,
    confidencePct: alert.confidencePct,
    riskScore: alert.riskScore,
    timeWindow: alert.timeWindow,
    contributingSources: alert.contributingSources,
    status: alert.status,
    dispatchedAt: new Date(),
    officerConfirmedBy: officerUser ? `${officerUser.name} (${officerUser.officerDetails?.designation || 'EOC Incharge'})` : 'Auto-Dispatched Tier',
    capXml: capPayload.xml,
    capStandard: capPayload.standard,
    dispatchedChannels,
  };

  // 1. Live In-App Real-Time WebSocket Push
  if (alert.tier === 'DANGER') {
    emitEvent('ALERT_CONFIRMED_DISPATCHED', payload, alert.districtId);
    emitEvent('EMERGENCY_DANGER_BROADCAST', payload, alert.districtId);
  } else {
    emitEvent('ALERT_CREATED', payload, alert.districtId);
  }

  // 2. Zone-Based Network Reliability Telecom Channel Selection (Vonage Communications)
  if (alert.tier === 'DANGER') {
    if (reliability === 'WEAK') {
      // Only SMS — voice calls are unreliable/costly on weak network zones
      console.log(`📡 [NETWORK RELIABILITY CONFIG] Zone "${targetZone?.name || alert.villageName}" is configured as WEAK telecom infrastructure. Routing to SMS-only channel (Voice suppressed).`);
      await sendSMS(alert, targetZone);
      dispatchedChannels.voice = false;
    } else {
      // STRONG or UNKNOWN — send both channels for maximum reach
      console.log(`📡 [NETWORK RELIABILITY CONFIG] Zone "${targetZone?.name || alert.villageName}" is configured as ${reliability} telecom infrastructure. Routing to dual-channel SMS + Automated Voice Call.`);
      await sendSMS(alert, targetZone);
      await sendVoiceCall(alert, targetZone);
      dispatchedChannels.voice = true;
    }
  } else {
    // Non-DANGER tier alerts (WARNING / WATCH)
    await sendSMS(alert, targetZone);
  }

  // 3. OASIS CAP v1.2 XML Generation (Standard Broadcast Gateway)
  if (alert.tier === 'DANGER') {
    console.log(`📜 [OASIS CAP v1.2 XML GENERATED] Standard: ${capPayload.standard} | Identifier: ${capPayload.identifier}`);
    console.log(`📡 [NDMA SACHET / CELL BROADCAST HOOK] Ready for gateway transmission (Live transmission requires official government credentials).`);
  }

  // 4. Durable Notification Persistence (Item 3)
  try {
    await createNotification({
      role: alert.tier === 'DANGER' ? 'ALL' : 'OFFICER',
      type: alert.tier === 'DANGER' ? 'ALERT_CONFIRMED' : 'ALERT_DANGER',
      relatedEntityId: alert._id?.toString() || null,
      title: `🚨 ${alert.tier} Warning: ${alert.villageName}`,
      message: `${alert.hazardType || 'Landslide'} warning (${alert.confidencePct}% confidence). ${alert.timeWindow || 'Next 2–6 hours'}.`,
      villageName: alert.villageName,
    });
  } catch (notifErr) {
    console.error('Failed to create durable notification:', notifErr.message);
  }

  // 5. Browser Web Push Lockscreen Notification (Item 4)
  if (alert.tier === 'DANGER') {
    try {
      await sendEmergencyWebPush({
        title: `🚨 DANGER Alert: ${alert.villageName}`,
        message: `Imminent hazard detected. Evacuate to ${targetZone?.nearestShelter?.name || 'designated community shelter'} immediately.`,
        villageName: alert.villageName,
        role: 'CITIZEN',
        data: { alertId: alert._id, tier: 'DANGER', villageName: alert.villageName },
      });
    } catch (pushErr) {
      console.warn('Web push delivery note:', pushErr.message);
    }
  }

  // 6. Audit Log Entry
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const channelSummary = dispatchedChannels.voice ? 'WebSockets, Vonage SMS, Vonage Automated Voice Call, and OASIS CAP v1.2' : 'WebSockets, Vonage SMS-Only, and OASIS CAP v1.2';
      await AuditLog.create({
        userId: officerUser?._id,
        userName: officerUser?.name || 'System Dispatcher',
        userRole: officerUser?.role || 'SYSTEM',
        districtId: alert.districtId,
        action: alert.tier === 'DANGER' ? 'ALERT_CONFIRMED_DISPATCHED' : 'ALERT_GENERATED',
        details: `${alert.tier} alert (${alert.alertCode}) dispatched for ${alert.villageName} (${alert.confidencePct}% confidence). Channels: ${channelSummary}. Zone telecom profile: ${reliability}.`,
        metadata: payload,
      });
    }
  } catch (e) {
    console.error('Failed to write audit log:', e);
  }

  return payload;
};

export default {
  sendSMS,
  dispatchMultiChannelAlert,
};
