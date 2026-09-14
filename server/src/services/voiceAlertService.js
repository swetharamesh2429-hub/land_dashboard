import { Vonage } from '@vonage/server-sdk';
import axios from 'axios';

/**
 * Vonage Voice Integration Service for RAKSHA-NER Multi-Hazard Early Warning System
 * 
 * Provides automated outbound telephony voice calls using Vonage Voice API
 * with NCCO (Nexmo Call Control Object) Text-to-Speech (TTS) and pre-recorded audio streaming.
 * 
 * Target: Offline citizens, non-smartphone users, and urgent audible notifications.
 */

// Placeholder audio URLs for regional North East languages not natively supported by Vonage TTS engine
// TODO: These are placeholder audio URLs. Official pre-recorded Assamese (as) and Khasi (kha) 
// disaster warning audio clips must be recorded by SDMA/DDMA certified linguists and hosted on a secure public CDN/S3 bucket.
export const PLACEHOLDER_AUDIO_URLS = {
  as: 'https://storage.raksha.gov.in/audio/alerts/danger_warning_as.mp3',
  kha: 'https://storage.raksha.gov.in/audio/alerts/danger_warning_kha.mp3',
};

/**
 * Generates an NCCO (Nexmo Call Control Object) array for Vonage Voice Call
 * @param {Object} params
 * @param {Object} params.alert - Alert model instance
 * @param {string} [params.language='en'] - Language code ('en', 'hi', 'as', 'kha')
 * @returns {Array<Object>} NCCO action array
 */
export const generateAlertNCCO = ({ alert, language = 'en' }) => {
  const lang = (language || 'en').toLowerCase();
  const village = alert?.villageName || 'your locality';
  const hazard = alert?.hazardType ? alert.hazardType.replace('_', ' ') : 'Landslide';
  const tier = alert?.tier || 'DANGER';

  // 1. Assamese Language ('stream' NCCO action for pre-recorded audio)
  if (lang === 'as') {
    return [
      {
        action: 'stream',
        streamUrl: [PLACEHOLDER_AUDIO_URLS.as],
        // TODO: Replace placeholder URL with verified SDMA Assamese audio broadcast recording
      },
    ];
  }

  // 2. Khasi Language ('stream' NCCO action for pre-recorded audio)
  if (lang === 'kha') {
    return [
      {
        action: 'stream',
        streamUrl: [PLACEHOLDER_AUDIO_URLS.kha],
        // TODO: Replace placeholder URL with verified SDMA Khasi audio broadcast recording
      },
    ];
  }

  // 3. Hindi Language ('talk' NCCO action with Indian Hindi TTS)
  if (lang === 'hi') {
    const hindiSpeech = `सावधान! रक्षा आपदा प्रबंधन चेतावनी। ${village} में ${tier} स्तर का ${hazard === 'LANDSLIDE' ? 'भूस्खलन' : 'आपदा'} खतरा दर्ज किया गया है। कृपया तुरंत अपने निकटतम सुरक्षित राहत आश्रय की ओर प्रस्थान करें।`;
    return [
      {
        action: 'talk',
        text: hindiSpeech,
        language: 'hi-IN',
        style: 0,
      },
    ];
  }

  // 4. Default English Language ('talk' NCCO action with Indian English TTS)
  const englishSpeech = `Emergency Alert from RAKSHA Disaster Operations. A ${tier} level ${hazard} hazard has been detected in ${village} with high confidence. Immediate evacuation to designated community shelters is strongly advised. Follow district administration guidelines.`;
  return [
    {
      action: 'talk',
      text: englishSpeech,
      language: 'en-IN',
      style: 0,
    },
  ];
};

/**
 * Initializes Vonage SDK client helper
 */
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
 * Dispatches an outbound voice call alert to residents in a risk zone via Vonage Voice API
 * 
 * Supports both live Vonage Voice API calls (when credentials are provided)
 * and graceful simulated fallback (for local demo, test, and budget constraints).
 * 
 * @param {Object} alert - Alert object
 * @param {Object} riskZone - Target RiskZone object
 * @param {Object} [options]
 * @param {string} [options.recipientPhone] - Specific recipient phone number (optional)
 * @param {string} [options.language] - Preferred language ('en', 'hi', 'as', 'kha')
 * @returns {Promise<Object>} Call dispatch execution summary
 */
export const sendVoiceCall = async (alert, riskZone, options = {}) => {
  const apiKey = process.env.VONAGE_API_KEY;
  const apiSecret = process.env.VONAGE_API_SECRET;
  const fromNumber = process.env.VONAGE_PHONE_NUMBER || '14157386102';

  // Determine regional language preference based on state/district if not specified
  let language = options.language;
  if (!language) {
    if (riskZone?.stateName === 'Meghalaya' || riskZone?.districtId === 'EKH') {
      language = 'kha'; // Khasi for East Khasi Hills
    } else if (riskZone?.stateName === 'Assam' || riskZone?.districtId === 'DH') {
      language = 'as'; // Assamese for Dima Hasao
    } else {
      language = 'en';
    }
  }

  const ncco = generateAlertNCCO({ alert, language });
  let recipient = options.recipientPhone || '+919876543230';
  const villageName = riskZone?.name || alert?.villageName || 'Risk Zone';
  const districtName = riskZone?.districtName || alert?.districtName || 'District';

  // Normalize phone number digits
  const cleanPhone = String(recipient).replace(/\D/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  // Check if live Vonage credentials are configured
  if (apiKey && apiSecret && !apiKey.includes('your_') && !apiSecret.includes('your_')) {
    try {
      console.log(`📞 [VONAGE VOICE CALL] Initiating live outbound voice call to +${formattedPhone} for ${villageName} (Language: ${language.toUpperCase()})...`);
      
      const vonage = getVonageClient();
      let callResponse = null;

      if (vonage && vonage.voice && typeof vonage.voice.createOutboundCall === 'function') {
        callResponse = await vonage.voice.createOutboundCall({
          to: [{ type: 'phone', number: formattedPhone }],
          from: { type: 'phone', number: fromNumber },
          ncco,
        });
      } else {
        // Direct REST API fallback
        const response = await axios.post(
          'https://api.nexmo.com/v1/calls',
          {
            to: [{ type: 'phone', number: formattedPhone }],
            from: { type: 'phone', number: fromNumber },
            ncco,
          },
          {
            auth: {
              username: apiKey,
              password: apiSecret,
            },
            timeout: 10000,
          }
        );
        callResponse = response.data;
      }

      const callUuid = callResponse?.uuid || callResponse?.id || `vonage-call-${Date.now()}`;
      console.log(`✅ [VONAGE VOICE CALL] Outbound call placed successfully. Call UUID: ${callUuid}`);

      return {
        success: true,
        channel: 'VOICE',
        mode: 'VONAGE_LIVE',
        callUuid,
        recipient: formattedPhone,
        language,
        ncco,
        timestamp: new Date(),
      };
    } catch (err) {
      // Graceful degradation: Log error and do NOT crash the emergency alert dispatch flow
      console.error(`⚠️ [VONAGE VOICE CALL FAILED] Outbound voice call to +${formattedPhone} failed:`, err?.response?.data?.message || err?.message || err);
      return {
        success: false,
        channel: 'VOICE',
        mode: 'VONAGE_FAILED',
        error: err?.response?.data?.message || err?.message || String(err),
        recipient: formattedPhone,
        language,
        timestamp: new Date(),
      };
    }
  }

  // Graceful Simulated Gateway Mode (No Vonage credentials configured)
  console.log(`📞 [VOICE ALERT GATEWAY (Simulated)] Outbound automated voice alert triggered for registered residents in ${villageName}, ${districtName} (Language: ${language.toUpperCase()}):`);
  console.log(`   "📢 [VONAGE VOICE NCCO TTS/STREAM] '🚨 URGENT RAKSHA EVACUATION NOTICE for ${villageName}: ${alert?.tier || 'DANGER'} level ${alert?.hazardType || 'Landslide'} predicted. Move to relief shelter immediately.'"`);

  return {
    success: true,
    channel: 'VOICE',
    mode: 'SIMULATED',
    recipient: formattedPhone,
    language,
    ncco,
    timestamp: new Date(),
  };
};

export default {
  PLACEHOLDER_AUDIO_URLS,
  generateAlertNCCO,
  sendVoiceCall,
};
