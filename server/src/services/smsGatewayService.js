import { Vonage } from '@vonage/server-sdk';
import { Channels } from '@vonage/messages';

/**
 * Vonage SMS Gateway Service for RAKSHA-NER Multi-Hazard Early Warning System
 * 
 * Provides automated SMS dispatch for high-risk disaster early warnings
 * to registered residents, offline citizens, and local village leaders.
 */

// Startup / Init check helper for environment variables
export const logVonageEnvStatus = () => {
  const apiKey = process.env.VONAGE_API_KEY;
  const apiSecret = process.env.VONAGE_API_SECRET;
  const phone = process.env.VONAGE_PHONE_NUMBER;
  const demoRecipient = process.env.DEMO_RECIPIENT_PHONE;

  const isConfigured = Boolean(apiKey && apiSecret && !apiKey.includes('your_') && !apiSecret.includes('your_'));

  console.log('\n-------------------------------------------------------------');
  console.log('📡 [VONAGE SMS CONFIGURATION STATUS]');
  console.log(`   VONAGE_API_KEY present:      ${Boolean(apiKey)} (${apiKey ? `length: ${apiKey.length}` : 'MISSING'})`);
  console.log(`   VONAGE_API_SECRET present:   ${Boolean(apiSecret)} (${apiSecret ? `length: ${apiSecret.length}` : 'MISSING'})`);
  console.log(`   VONAGE_PHONE_NUMBER present: ${Boolean(phone)} (${phone || 'NONE'})`);
  console.log(`   DEMO_RECIPIENT_PHONE:        ${demoRecipient ? `SET (${demoRecipient})` : 'NOT SET (defaults to +919876543230)'}`);
  console.log(`   Live Vonage SDK Enabled:     ${isConfigured ? '✅ YES (Live API Mode)' : '⚠️ NO (Simulated Mock Mode)'}`);
  console.log('-------------------------------------------------------------\n');
};

// Initialize Vonage SDK client instance helper
const getVonageClient = () => {
  const apiKey = process.env.VONAGE_API_KEY;
  const apiSecret = process.env.VONAGE_API_SECRET;

  if (apiKey && apiSecret && !apiKey.includes('your_') && !apiSecret.includes('your_')) {
    return new Vonage({
      apiKey,
      apiSecret,
    });
  }
  return null;
};

/**
 * Sends a single SMS alert to a specific recipient via Vonage Messages API
 * @param {string} toPhoneNumber - Recipient phone number (e.g. +919876543210 or 919876543210)
 * @param {string} messageText - Emergency alert SMS body
 * @param {string} [fromSender='Vonage APIs'] - Sender identifier
 * @returns {Promise<Object>} { success: boolean, messageUUID?: string, error?: string }
 */
export async function sendSMSAlert(toPhoneNumber, messageText, fromSender = 'Vonage APIs') {
  const vonage = getVonageClient();

  if (vonage) {
    // Normalize international E.164 phone formatting
    let formattedPhone = String(toPhoneNumber).replace(/\D/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = `91${formattedPhone}`; // Default India country code
    }

    const fromField = process.env.VONAGE_PHONE_NUMBER || fromSender;

    console.log('\n📱 ==================== [VONAGE SMS OUTBOUND CALL] ====================');
    console.log(`📱 [VONAGE SEND INITIATED]`);
    console.log(`   - Raw "to" input:      "${toPhoneNumber}"`);
    console.log(`   - Formatted "to":      "${formattedPhone}"`);
    console.log(`   - "from" sender:       "${fromField}"`);
    console.log(`   - Message characters:  ${messageText?.length || 0}`);
    console.log(`   - Message preview:     "${messageText?.slice(0, 80)}..."`);
    console.log('📱 [CALLING vonage.messages.send() WITH PARAMS]:', JSON.stringify({
      messageType: 'text',
      channel: Channels.SMS,
      to: formattedPhone,
      from: fromField,
      text: messageText,
    }, null, 2));

    try {
      const response = await vonage.messages.send({
        messageType: 'text',
        channel: Channels.SMS,
        text: messageText,
        to: formattedPhone,
        from: fromField,
      });

      console.log('✅ [VONAGE SMS SUCCESS RESPONSE RECEIVED]:', JSON.stringify(response, null, 2));
      const messageUUID = response?.messageUUID || response?.message_uuid || 'vonage-msg-dispatched';
      console.log(`📱 [VONAGE SMS COMPLETED] Message UUID: ${messageUUID}`);
      console.log('📱 =====================================================================\n');
      return { success: true, messageUUID, rawResponse: response };
    } catch (error) {
      console.error('\n❌ ==================== [VONAGE SMS CALL FAILED] ====================');
      console.error('❌ Error Message:   ', error?.message || error);
      console.error('❌ Error Name:      ', error?.name);
      console.error('❌ Error Code:      ', error?.code);
      console.error('❌ Error Status:    ', error?.status || error?.response?.status);
      console.error('❌ Full Error Obj:  ', error);
      if (error?.response?.data) {
        console.error('❌ Response Data:   ', JSON.stringify(error.response.data, null, 2));
      }
      if (error?.response?.headers) {
        console.error('❌ Response Headers:', JSON.stringify(error.response.headers, null, 2));
      }
      console.error('❌ ==================================================================\n');
      return { success: false, error: error?.message || String(error), rawError: error };
    }
  }

  // Graceful simulated fallback when Vonage credentials are not configured in .env
  console.log(`📱 [SMS BROADCAST GATEWAY (Simulated Mode - Vonage client not active)]`);
  console.log(`   - Simulated "to": "${toPhoneNumber}"`);
  console.log(`   - Simulated text: "${messageText}"`);
  return { success: true, messageUUID: `sim-vonage-${Date.now()}`, mode: 'SIMULATED' };
}

/**
 * Multi-resident SMS Broadcast dispatcher for village risk zones
 * @param {Object} alert - Alert model instance
 * @param {Object} riskZone - Target RiskZone model instance
 * @param {Object} [options]
 * @returns {Promise<Object>} Broadcast execution summary
 */
export async function sendSMS(alert, riskZone, options = {}) {
  const village = riskZone?.name || alert?.villageName || 'Locality';
  const district = riskZone?.districtName || alert?.districtName || 'District';
  const residentsCount = riskZone?.populationEstimate ? Math.round(riskZone.populationEstimate * 0.4) : 1420;
  const hazard = alert?.hazardType ? alert.hazardType.replace('_', ' ') : 'LANDSLIDE';

  const messageText = `🚨 RAKSHA-NER ALERT: ${alert.tier || 'DANGER'} level ${hazard} predicted in ${village} with ${alert.confidencePct || 85}% confidence. Follow SDMA evacuation guidelines immediately.`;

  const vonage = getVonageClient();

  console.log(`\n📢 [SMS BROADCAST DISPATCH START] Village: ${village}, Tier: ${alert?.tier}, Live Vonage Available: ${Boolean(vonage)}`);

  if (vonage) {
    const targetPhone = options.recipientPhone || process.env.DEMO_RECIPIENT_PHONE || '+919876543230';
    console.log(`📱 [VONAGE SMS BROADCAST] Dispatching live alert to registered contact ${targetPhone} (${village}, ${district})...`);
    
    const result = await sendSMSAlert(targetPhone, messageText);
    return {
      success: result.success,
      channel: 'SMS',
      mode: 'VONAGE_LIVE',
      messageUUID: result.messageUUID,
      error: result.error,
      recipientCount: residentsCount,
      village,
      timestamp: new Date(),
    };
  }

  // Simulated gateway output
  console.log(`📱 [SMS BROADCAST GATEWAY (Simulated)] Sent to ${residentsCount.toLocaleString()} registered residents in ${village}, ${district}:`);
  console.log(`   "${messageText}"`);

  return {
    success: true,
    channel: 'SMS',
    mode: 'SIMULATED',
    recipientCount: residentsCount,
    village,
    timestamp: new Date(),
  };
}

export default {
  logVonageEnvStatus,
  sendSMSAlert,
  sendSMS,
};
