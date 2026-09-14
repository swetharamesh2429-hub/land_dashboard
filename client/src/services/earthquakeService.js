import axios from 'axios';

/**
 * Fetch recent earthquake events from USGS GeoJSON API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} radiusKm - Search radius in km (default 500)
 * @param {number} lookbackDays - Days of history to retrieve (default 30)
 * @returns {Promise<Array>} Array of GeoJSON earthquake features
 */
export async function getEarthquakeData(lat, lon, radiusKm = 500, lookbackDays = 30) {
  try {
    const url = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
    const startTime = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const response = await axios.get(url, {
      params: {
        format: 'geojson',
        starttime: startTime,
        minmagnitude: 3,
        latitude: lat,
        longitude: lon,
        maxradiuskm: radiusKm,
      },
      timeout: 8000,
    });
    return response.data?.features || [];
  } catch (error) {
    console.error('USGS Earthquake API error:', error.message);
    return [];
  }
}

export default getEarthquakeData;