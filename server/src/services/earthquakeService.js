import axios from 'axios';

/**
 * USGS Earthquake FDSNWS Event Web Service Integration
 * 
 * Free public API (no API key required):
 * https://earthquake.usgs.gov/fdsnws/event/1/query
 * 
 * Purpose:
 * North East India is classified as Bureau of Indian Standards (BIS) "Seismic Zone V"
 * (Very Severe Seismic Hazard). This service provides a live empirical seismic data signal
 * by querying real-time tectonic disturbances (magnitude 3.0+) within a ~300km radius
 * of risk zones (e.g. Dauki Fault, Kopili Fault, Naga Thrust).
 * 
 * If a recent seismic event is detected, a calibrated dynamic boost is applied to the
 * landslide risk score, reflecting the increased probability of slope shear failure
 * triggered by seismic shaking.
 */

// In-memory cache with 15-minute TTL to minimize external API hits
const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Haversine formula to calculate distance between two coordinates in km
 */
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
};

/**
 * Calculates dynamic risk boost and explainability metadata from recent earthquakes
 * @param {Array} events - Array of parsed earthquake events
 * @returns {Object} { boostScore, nearestEvent, factor }
 */
export const computeSeismicRiskBoost = (events = []) => {
  if (!events || events.length === 0) {
    return {
      boostScore: 0,
      nearestEvent: null,
      factor: null,
    };
  }

  // Find the most impactful event (highest magnitude, prioritized by distance)
  // Sort by impact index: magnitude / sqrt(distanceKm + 10)
  const scoredEvents = events.map((ev) => {
    const dist = Math.max(1, ev.distanceKm || 50);
    const impact = (ev.magnitude * 10) / Math.sqrt(dist);
    return { ...ev, impact };
  });

  scoredEvents.sort((a, b) => b.impact - a.impact);
  const primeEvent = scoredEvents[0];

  // Base boost based on Richter magnitude (M3.0+)
  let baseBoost = 0;
  if (primeEvent.magnitude >= 6.0) {
    baseBoost = 22;
  } else if (primeEvent.magnitude >= 5.0) {
    baseBoost = 16;
  } else if (primeEvent.magnitude >= 4.0) {
    baseBoost = 10;
  } else if (primeEvent.magnitude >= 3.0) {
    baseBoost = 5;
  }

  // Distance proximity multiplier
  let distanceMultiplier = 1.0;
  if (primeEvent.distanceKm < 50) {
    distanceMultiplier = 1.5;
  } else if (primeEvent.distanceKm < 150) {
    distanceMultiplier = 1.25;
  } else if (primeEvent.distanceKm <= 300) {
    distanceMultiplier = 1.0;
  } else {
    distanceMultiplier = 0.5;
  }

  const finalBoost = Math.min(25, Math.round(baseBoost * distanceMultiplier));

  const hoursAgo = Math.max(0, Math.round((Date.now() - primeEvent.time) / (1000 * 60 * 60)));
  const timeStr = hoursAgo < 1 ? 'just now' : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.round(hoursAgo / 24)}d ago`;

  const factor = {
    name: 'Live Seismic Shock (USGS Zone V)',
    weight: finalBoost,
    description: `M${primeEvent.magnitude.toFixed(1)} quake ${primeEvent.distanceKm}km away (${primeEvent.place || 'Regional Fault Line'}) ${timeStr}`,
  };

  return {
    boostScore: finalBoost,
    nearestEvent: primeEvent,
    factor,
  };
};

/**
 * Fetch recent earthquake events from USGS FDSNWS GeoJSON API
 * 
 * @param {Object} options
 * @param {number} options.lat - Latitude (e.g. 25.2986 for Sohra)
 * @param {number} options.lon - Longitude (e.g. 91.7324 for Sohra)
 * @param {number} [options.maxRadiusKm=300] - Search radius in km
 * @param {number} [options.minMagnitude=3.0] - Minimum Richter magnitude
 * @param {number} [options.lookbackDays=7] - Number of past days to query
 * @returns {Promise<Object>} { live: boolean, count: number, events: Array, boostScore: number, factor: Object }
 */
export const fetchRecentEarthquakes = async ({
  lat = 25.2986,
  lon = 91.7324,
  maxRadiusKm = 300,
  minMagnitude = 3.0,
  lookbackDays = 7,
} = {}) => {
  const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}_${maxRadiusKm}_${minMagnitude}_${lookbackDays}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const startTime = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lon}&maxradiuskm=${maxRadiusKm}&minmagnitude=${minMagnitude}&starttime=${startTime}`;

  try {
    console.log(`🌐 [USGS EARTHQUAKE API] Querying live seismic telemetry within ${maxRadiusKm}km of [${lat}, ${lon}] (Zone V live signal)...`);
    const response = await axios.get(url, {
      timeout: 4500,
      headers: {
        Accept: 'application/json',
      },
    });

    const features = response.data?.features || [];
    const events = features.map((feat) => {
      const coords = feat.geometry?.coordinates || [0, 0, 0];
      const eventLon = coords[0];
      const eventLat = coords[1];
      const depthKm = coords[2];
      const distanceKm = calculateDistanceKm(lat, lon, eventLat, eventLon);

      return {
        id: feat.id,
        magnitude: feat.properties?.mag || 0,
        place: feat.properties?.place || 'North East India Region',
        time: feat.properties?.time || Date.now(),
        updated: feat.properties?.updated,
        url: feat.properties?.url,
        status: feat.properties?.status,
        tsunami: feat.properties?.tsunami || 0,
        significance: feat.properties?.sig || 0,
        title: feat.properties?.title,
        coordinates: [eventLon, eventLat],
        depthKm: Number(depthKm?.toFixed(1)) || 10,
        distanceKm,
      };
    });

    // Sort by most recent first
    events.sort((a, b) => b.time - a.time);

    const { boostScore, nearestEvent, factor } = computeSeismicRiskBoost(events);

    const result = {
      live: true,
      count: events.length,
      events,
      nearestEvent,
      boostScore,
      factor,
      queryCoordinates: [lon, lat],
      searchRadiusKm: maxRadiusKm,
      minMagnitude,
      lastPolled: new Date(),
    };

    cache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
  } catch (err) {
    // Graceful failure - never break the main prediction flow
    console.warn(`⚠️ [USGS EARTHQUAKE API] Request failed or timed out (${err.message}). Defaulting to standard Zone V baseline.`);
    const fallbackResult = {
      live: false,
      count: 0,
      events: [],
      nearestEvent: null,
      boostScore: 0,
      factor: null,
      error: err.message,
      lastPolled: new Date(),
    };
    return fallbackResult;
  }
};

/**
 * Clears the earthquake in-memory cache (for testing / admin refresh)
 */
export const clearEarthquakeCache = () => {
  cache.clear();
};

export default {
  fetchRecentEarthquakes,
  computeSeismicRiskBoost,
  clearEarthquakeCache,
};
