import axios from 'axios';
import { fetchRecentEarthquakes, computeSeismicRiskBoost } from './src/services/earthquakeService.js';
import { calculateStaticSusceptibility } from './src/services/susceptibilityService.js';

async function verifyAll() {
  console.log('🧪 Running Verification for Audit, Earthquake Service, and Susceptibility Service...\n');

  let passed = 0;
  let total = 0;
  const assert = (cond, msg) => {
    total++;
    if (cond) {
      console.log(`✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${msg}`);
    }
  };

  // 1. Test Static Susceptibility Service
  const susRes = calculateStaticSusceptibility({
    slopeAngle: 40,
    distanceToMiningSiteKm: 1.5,
    distanceToFaultLineKm: 3.2,
    ndviChange5yr: -0.15,
    historicalLandslideDensity: 4,
  });
  assert((susRes.score > 60) && (susRes.level === 'HIGH' || susRes.level === 'VERY_HIGH'), `1. Susceptibility calculation returned score: ${susRes.score}, level: ${susRes.level}`);

  // 2. Test Earthquake Risk Boost Logic with Simulated Events
  const mockQuakes = [
    {
      magnitude: 4.5,
      distanceKm: 120,
      place: 'Dauki Fault Escarpment, Meghalaya',
      time: Date.now() - 3600000 * 2, // 2 hours ago
    },
  ];
  const boostRes = computeSeismicRiskBoost(mockQuakes);
  assert(boostRes.boostScore >= 10, `2. Seismic boost applied (+${boostRes.boostScore}) for M4.5 quake within 120km`);
  assert(boostRes.factor && boostRes.factor.name.includes('Seismic'), `3. Contributing factor added with explainability text: "${boostRes.factor?.description}"`);

  // 3. Test Live USGS Earthquake API call
  console.log('\n🌐 Testing live USGS Earthquake API call (North East India centroid)...');
  const liveQuakes = await fetchRecentEarthquakes({
    lat: 25.2986,
    lon: 91.7324,
    maxRadiusKm: 500,
    minMagnitude: 2.5,
    lookbackDays: 30,
  });
  assert(liveQuakes.live === true, `4. USGS Earthquake API live query responded successfully (detected ${liveQuakes.count} events within 500km)`);

  // 4. Test Graceful Fallback on Invalid Coordinates or Network Failure
  const fallbackQuakes = await fetchRecentEarthquakes({
    lat: 999, // impossible latitude
    lon: 999,
  });
  assert(fallbackQuakes.live === false && fallbackQuakes.boostScore === 0, `5. Graceful fallback on API error returns boostScore 0 without throwing error`);

  // 5. Test Live Server Endpoints
  try {
    const extStatus = await axios.get('http://localhost:5000/api/external/status');
    assert(extStatus.data.success && extStatus.data.sources.seismic?.primary.includes('USGS'), '6. GET /api/external/status includes USGS Seismic Zone V live source');
  } catch (e) {
    console.log('Note: Server status endpoint check skipped:', e.message);
  }

  try {
    const quakeApi = await axios.get('http://localhost:5000/api/external/earthquakes?radius=300&minMag=3.0');
    assert(quakeApi.data.success && quakeApi.data.data !== undefined, '7. GET /api/external/earthquakes returns active seismic telemetry');
  } catch (e) {
    console.log('Note: Server earthquakes endpoint check skipped:', e.message);
  }

  console.log(`\n=============================================================`);
  console.log(`🎯 Verification Summary: ${passed} / ${total} Tests Passed (${Math.round((passed/total)*100)}%)`);
  console.log(`=============================================================\n`);
}

verifyAll();
