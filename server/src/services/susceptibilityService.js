/**
 * Susceptibility Analysis Service
 * Calculates static predisposing geological and environmental susceptibility (0 - 100)
 * based on Geological Survey of India (GSI) Bhukosh methodologies, BIS Seismic Zone V fault proximity,
 * Copernicus Sentinel-2 vegetation deficit, and SRTM DEM slope gradients.
 */

/**
 * Computes static susceptibility score and categorical level for a given terrain profile
 * @param {Object} params
 * @param {number} params.slopeAngle - Slope inclination in degrees
 * @param {number} params.distanceToMiningSiteKm - Distance to nearest active/abandoned mine in km
 * @param {number} params.distanceToFaultLineKm - Distance to active tectonic fault in km
 * @param {number} params.ndviChange5yr - 5-year NDVI delta (-1.0 to 1.0)
 * @param {number} params.historicalLandslideDensity - Number of recorded past landslide events
 * @param {boolean} params.landUseChangeFlag - Whether forest-to-construction or jhum occurred
 * @param {boolean} params.satelliteChangeDetectedFlag - Sentinel-2 CNN surface displacement flag
 * @returns {Object} { score: number, level: string, breakdown: Object }
 */
export const calculateStaticSusceptibility = ({
  slopeAngle = 35,
  distanceToMiningSiteKm = 2.1,
  distanceToFaultLineKm = 4.2,
  ndviChange5yr = -0.12,
  historicalLandslideDensity = 3,
  landUseChangeFlag = true,
  satelliteChangeDetectedFlag = false,
} = {}) => {
  // 1. Slope Gradient (30% weight) - SRTM 30m DEM
  const slopeScore = slopeAngle >= 42 ? 30 : slopeAngle >= 35 ? 24 : slopeAngle >= 25 ? 15 : 6;

  // 2. Rat-Hole / Limestone Mining Proximity (20% weight)
  const miningScore = distanceToMiningSiteKm < 1.0 ? 20 : distanceToMiningSiteKm < 2.5 ? 15 : distanceToMiningSiteKm < 5.0 ? 8 : 2;

  // 3. Seismic Fault Line Proximity (20% weight - Zone V Dauki/Kopili Systems)
  const faultScore = distanceToFaultLineKm < 2.0 ? 20 : distanceToFaultLineKm < 5.0 ? 15 : distanceToFaultLineKm < 10.0 ? 8 : 2;

  // 4. Sentinel-2 NDVI 5-Year Forest Loss (15% weight)
  const vegScore = ndviChange5yr <= -0.20 ? 15 : ndviChange5yr <= -0.10 ? 10 : ndviChange5yr < 0 ? 5 : 1;

  // 5. Historical Landslide Density & Land Use (15% weight)
  const histScore = Math.min(15, (historicalLandslideDensity || 0) * 3 + (landUseChangeFlag ? 4 : 0));

  // 6. CNN Satellite Scarp Detection Flag Boost
  const cnnBoost = satelliteChangeDetectedFlag ? 12 : 0;

  const totalScore = Math.min(100, Math.round(slopeScore + miningScore + faultScore + vegScore + histScore + cnnBoost));

  let level = 'LOW';
  if (totalScore >= 75) {
    level = 'VERY_HIGH';
  } else if (totalScore >= 55) {
    level = 'HIGH';
  } else if (totalScore >= 35) {
    level = 'MODERATE';
  } else {
    level = 'LOW';
  }

  return {
    score: totalScore,
    level,
    breakdown: {
      slopeScore,
      miningScore,
      faultScore,
      vegScore,
      histScore,
      cnnBoost,
    },
  };
};

export default {
  calculateStaticSusceptibility,
};
