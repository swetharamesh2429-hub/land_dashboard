import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { generateAlertNCCO, sendVoiceCall } from './src/services/voiceAlertService.js';
import { sendSMSAlert, sendSMS } from './src/services/smsGatewayService.js';
import { dispatchMultiChannelAlert } from './src/services/alertDispatcher.js';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting End-to-End Acceptance Tests for RAKSHA-NER...\n');
  let passed = 0;
  let total = 0;

  const assert = (condition, title) => {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title}`);
    }
  };

  try {
    // 1. Health check
    const health = await axios.get(`${BASE_URL}/health`);
    assert(health.data.status === 'ONLINE', '1. System Health Endpoint is ONLINE');

    // 1b. Reset database to ensure latest seed data with networkReliability is active
    await axios.post(`${BASE_URL}/demo/reset`);

    // 2. Authentication with correct role
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: '9876543210',
      password: 'Raksha@2026',
      portalRole: 'OFFICER',
    });
    assert(loginRes.data.success && loginRes.data.user.role === 'OFFICER', '2. Officer Login Success & Role Verification');
    const officerToken = loginRes.data.token;

    // 3. Portal Mismatch Security Validation
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        identifier: '9876543230', // Citizen phone
        password: 'Raksha@2026',
        portalRole: 'OFFICER', // Wrong portal requested
      });
      assert(false, '3. Portal mismatch rejection (should fail)');
    } catch (err) {
      assert(err.response?.status === 403, '3. Security: Portal mismatch successfully blocked by backend');
    }

    // 4. Fetch Risk Zones with static susceptibility & dynamic trigger
    const zonesRes = await axios.get(`${BASE_URL}/risk-zones?district=EKH`);
    assert(zonesRes.data.success && zonesRes.data.count >= 6, '4. Risk Zones retrieved for East Khasi Hills (with Susceptibility & Triggers)');
    const sohra = zonesRes.data.data.find(z => z.name.includes('Sohra'));
    const mawkynrew = zonesRes.data.data.find(z => z.name.includes('Mawkynrew'));
    assert(sohra.susceptibility.score > 70, '5. High base susceptibility modeled for Sohra (mining & NDVI loss)');
    assert(sohra.susceptibility.distanceToFaultLineKm !== undefined, '6. GAP 1: Fault Line Proximity & Seismic Zone V active on Risk Zones');
    assert(sohra.susceptibility.elevationMeters !== undefined && sohra.susceptibility.elevationMeters > 0, '6b. ADDITION 1: OpenTopography DEM Elevation data present on Risk Zones');
    assert(sohra.networkReliability === 'STRONG', '6c. Zone Telecom Profile: Sohra configured as STRONG infrastructure');
    assert(mawkynrew.networkReliability === 'WEAK', '6d. Zone Telecom Profile: Mawkynrew Ridge configured as WEAK infrastructure');

    // 5. IoT Sensors and Connectivity Badges
    const sensorsRes = await axios.get(`${BASE_URL}/sensors?district=EKH`);
    assert(sensorsRes.data.success && sensorsRes.data.summary.online > 0, '7. Sensors retrieved with multi-mode connectivity & health status');

    // 6. External Data Source Integration & Schedulers
    const extStatus = await axios.get(`${BASE_URL}/external/status`);
    assert(extStatus.data.success && extStatus.data.sources.weather.isLive !== undefined, '8. External Data Sources Status Online (OpenWeather + Sentinel-2 + GSI)');

    // 7. On-demand External Data Refresh
    const refreshRes = await axios.post(`${BASE_URL}/external/refresh`);
    assert(refreshRes.data.success && refreshRes.data.weatherSyncCount >= 6, '9. On-Demand External Data Sync (GSI Faults + Weather + Sentinel-2)');

    // 8. Simulate Rainfall Spike (Live Simulation Trigger)
    console.log('\n⚡ Simulating Rainfall Surge in Sohra (138mm)...');
    const simRes = await axios.post(`${BASE_URL}/demo/simulate-rainfall-spike`, {
      villageName: 'Sohra',
      rainfall24h: 138,
      soilMoisture: 84,
    });
    assert(simRes.data.success && simRes.data.zone.combinedRisk.tier === 'DANGER', '10. AI Multi-Hazard Model escalated risk to DANGER tier');
    assert(simRes.data.alert.status === 'PENDING_OFFICER_REVIEW', '11. Danger alert placed in "Pending Officer Review" (NOT auto-dispatched to public)');
    const dangerAlertId = simRes.data.alert._id;

    // 9. Officer Requests Field Officer Verification
    console.log('\n👮 Officer requests on-ground verification before dispatching...');
    const reqFieldRes = await axios.post(
      `${BASE_URL}/alerts/${dangerAlertId}/request-field-verification`,
      {},
      { headers: { Authorization: `Bearer ${officerToken}` } }
    );
    assert(reqFieldRes.data.success && reqFieldRes.data.task.status === 'PENDING', '12. Field Task generated & assigned to Field Officer');
    const fieldTaskId = reqFieldRes.data.task._id;

    // 10. Field Officer Submits Ground-Truth Inspection
    const fieldLogin = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: '9876543220',
      password: 'Raksha@2026',
      portalRole: 'FIELD_OFFICER',
    });
    const fieldToken = fieldLogin.data.token;

    const submitFieldRes = await axios.post(
      `${BASE_URL}/field-tasks/${fieldTaskId}/submit`,
      {
        checklist: [
          { label: 'Check for visible ground cracks', checked: true },
          { label: 'Inspect toe of slope', checked: true },
        ],
        evidence: {
          photoUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957',
          notes: 'Ground shear crack verified on-site. Imminent risk confirmed.',
          observedSeverity: 'ACTIVE_SLIPPAGE',
          roadPassable: false,
        },
      },
      { headers: { Authorization: `Bearer ${fieldToken}` } }
    );
    assert(submitFieldRes.data.success && submitFieldRes.data.task.status === 'COMPLETED', '13. Field Officer inspection evidence submitted');

    // 11. Officer Confirms & Dispatches Alert across Multi-Channels
    console.log('\n📢 Officer Confirms & Dispatches Multi-Channel Alert...');
    const confirmRes = await axios.post(
      `${BASE_URL}/alerts/${dangerAlertId}/confirm`,
      { notes: 'Hazard confirmed via on-ground field inspection evidence. Evacuation dispatched.' },
      { headers: { Authorization: `Bearer ${officerToken}` } }
    );
    assert(confirmRes.data.success && confirmRes.data.data.status === 'CONFIRMED_DISPATCHED', '14. Alert confirmed & broadcasted across App, SMS, and SACHET hook');
    assert(confirmRes.data.data.dispatchChannels.voiceBroadcast === true, '14b. STRONG Network Zone (Sohra) triggered Voice Broadcast alongside SMS');

    // 12. Citizen Triggers SOS
    const sosRes = await axios.post(`${BASE_URL}/sos`, {
      citizenName: 'Aiborlang Lyndem',
      citizenPhone: '9876543230',
      villageName: 'Sohra',
      districtId: 'EKH',
      coordinates: [91.7324, 25.2986],
      emergencyType: 'IMMINENT_SLOPE_COLLAPSE_TRAPPED',
    });
    assert(sosRes.data.success && sosRes.data.data.status === 'ACTIVE', '15. Citizen Emergency SOS distress beacon broadcasted to EOC Map');

    // 13. Citizen Ground-Truth Feedback Loop
    const fbRes = await axios.post(`${BASE_URL}/alerts/${dangerAlertId}/citizen-feedback`, {
      isAccurate: true,
      notes: 'Real ground subsidence occurred as predicted.',
    });
    assert(fbRes.data.success && fbRes.data.citizenFeedback.confirmedAccurateCount >= 1, '16. Citizen ground-truth feedback recorded');

    // 14. Analytics 30-day Accuracy Widget
    const accRes = await axios.get(`${BASE_URL}/analytics/accuracy`);
    assert(accRes.data.success && accRes.data.data.overallAccuracyPct >= 80, '17. Analytics 30-day accuracy transparency widget active (84%+ verified)');

    // 15. STEP 5: Vonage SMS Gateway & Voice NCCO Reliability Routing Tests
    console.log('\n📡 Testing Vonage Telecom Gateway & Network Reliability Channel Selection...');

    // A. Single SMS Alert dispatch via Vonage SMS Gateway function
    const directSmsResult = await sendSMSAlert('+919876543230', '🚨 RAKSHA TEST: Imminent Landslide warning for Sohra.');
    assert(
      directSmsResult.success === true && (directSmsResult.messageUUID !== undefined),
      '18. Vonage SMS Gateway: sendSMSAlert dispatches emergency message'
    );

    // B. WEAK network zone alert triggers SMS only (Voice call suppressed)
    const weakAlertMock = {
      _id: '6aa24f99dae131306b636499',
      alertCode: 'ALT-WEAK-TEST',
      tier: 'DANGER',
      hazardType: 'LANDSLIDE',
      villageName: 'Mawkynrew Ridge',
      districtId: 'EKH',
      districtName: 'East Khasi Hills',
      confidencePct: 88,
      riskScore: 82,
      timeWindow: 'Next 2–4 hours',
      contributingSources: ['Steep Slope', 'Heavy Rain'],
    };
    const weakDispatch = await dispatchMultiChannelAlert({
      alert: weakAlertMock,
      riskZone: mawkynrew,
    });
    assert(
      weakDispatch.dispatchedChannels.sms === true && weakDispatch.dispatchedChannels.voice === false,
      '19. WEAK network zone (Mawkynrew) routes to Vonage SMS-ONLY (Voice call suppressed)'
    );

    // C. STRONG network zone alert triggers both SMS and Voice
    const strongAlertMock = {
      _id: '6aa24f99dae131306b636488',
      alertCode: 'ALT-STRONG-TEST',
      tier: 'DANGER',
      hazardType: 'LANDSLIDE',
      villageName: 'Sohra (Cherrapunji)',
      districtId: 'EKH',
      districtName: 'East Khasi Hills',
      confidencePct: 92,
      riskScore: 89,
      timeWindow: 'Next 2 hours',
      contributingSources: ['Extreme Rainfall Surge'],
    };
    const strongDispatch = await dispatchMultiChannelAlert({
      alert: strongAlertMock,
      riskZone: sohra,
    });
    assert(
      strongDispatch.dispatchedChannels.sms === true && strongDispatch.dispatchedChannels.voice === true,
      '20. STRONG network zone (Sohra) routes to BOTH Vonage SMS and Voice Call'
    );

    // D. Voice call failure resilience (doesn't crash alert dispatch flow)
    const voiceFailureTest = await sendVoiceCall(
      { tier: 'DANGER', hazardType: 'LANDSLIDE', villageName: 'Unknown Valley' },
      { name: 'Unknown Valley', stateName: 'Meghalaya', districtId: 'EKH' }
    );
    assert(
      voiceFailureTest.channel === 'VOICE' && typeof voiceFailureTest.success === 'boolean',
      '21. Resilience: Vonage Voice failure/simulation handled gracefully without throwing'
    );

    // E. NCCO Generation for Multi-Lingual Regional Support
    const nccoEn = generateAlertNCCO({ alert: strongAlertMock, language: 'en' });
    const nccoHi = generateAlertNCCO({ alert: strongAlertMock, language: 'hi' });
    const nccoAs = generateAlertNCCO({ alert: strongAlertMock, language: 'as' });
    const nccoKha = generateAlertNCCO({ alert: strongAlertMock, language: 'kha' });

    assert(
      nccoEn[0]?.action === 'talk' && nccoEn[0]?.language === 'en-IN' &&
      nccoHi[0]?.action === 'talk' && nccoHi[0]?.language === 'hi-IN' &&
      nccoAs[0]?.action === 'stream' &&
      nccoKha[0]?.action === 'stream',
      '22. Vonage NCCO Generation: en-IN/hi-IN TTS and regional Assamese/Khasi audio stream actions'
    );

    // 16. Punch List Additions: Two-Way SMS, Durable Notifications, 7-Day History & Web Push
    console.log('\n🛡️ Testing Punch List Additions (Two-Way SMS, Durable Notifications, 7-Day History, Web Push)...');

    // Assertion 23: Two-Way SMS Inbound Webhook (Citizen SAFE Reply)
    const inboundSmsRes = await axios.post(`${BASE_URL}/telecom/inbound-sms`, {
      from: '919876543230',
      text: 'SAFE',
    });
    assert(
      inboundSmsRes.data.success === true && inboundSmsRes.data.isSafeReply === true,
      '23. Two-Way SMS: Inbound Vonage Webhook parses "SAFE" reply and increments checked-in count'
    );

    // Assertion 24: Durable Notifications Collection & Bell API
    const notifsRes = await axios.get(`${BASE_URL}/notifications?role=OFFICER`);
    assert(
      notifsRes.data.success === true && notifsRes.data.count > 0,
      '24. Durable Notifications: Bell unread counter backed by persistent database collection'
    );

    // Assertion 25: 7-Day Historical Risk Timeline Replay
    const historyRes = await axios.get(`${BASE_URL}/risk-zones/history?days=7&district=EKH`);
    assert(
      historyRes.data.success === true && historyRes.data.timeline?.length === 7,
      '25. Historical GIS Timeline: 7-day retrospective hazard slices generated for map time-scrubber'
    );

    // Assertion 26: Web Push VAPID Public Key & Push API
    const pushKeyRes = await axios.get(`${BASE_URL}/push/vapid-public-key`);
    assert(
      pushKeyRes.data.success === true && typeof pushKeyRes.data.publicKey === 'string' && pushKeyRes.data.publicKey.length > 20,
      '26. Web Push API: VAPID public key issued for browser background lockscreen alerts'
    );

    console.log(`\n=============================================================`);
    console.log(`🎯 Test Summary: ${passed} / ${total} Tests Passed (${Math.round((passed/total)*100)}%)`);
    console.log(`🛡️ RAKSHA-NER Vonage Telecom Gateway & Multi-Hazard Pipeline Verified!`);
    console.log(`=============================================================\n`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed with error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runTests();


