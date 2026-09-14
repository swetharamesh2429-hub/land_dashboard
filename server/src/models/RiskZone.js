import mongoose from 'mongoose';

const riskZoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  districtId: { type: String, required: true, index: true },
  districtName: { type: String, required: true },
  stateName: { type: String, default: 'Meghalaya' },
  blockName: { type: String },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere',
    },
  },
  populationEstimate: { type: Number, default: 1200 },
  nearestShelter: {
    name: { type: String, default: 'Community Disaster Relief Center' },
    distanceKm: { type: Number, default: 1.2 },
    coordinates: { type: [Number] },
  },

  // Zone-level Telecom Infrastructure Reliability Configuration (pre-configured, not live detected)
  networkReliability: {
    type: String,
    enum: ['STRONG', 'WEAK', 'UNKNOWN'],
    default: 'UNKNOWN',
    index: true,
  },

  // Layer 1: Static Susceptibility Factors (Predisposing)
  susceptibility: {
    score: { type: Number, default: 45 }, // 0 - 100
    level: { type: String, enum: ['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'], default: 'MODERATE' },
    ndviCurrent: { type: Number, default: 0.52 },
    ndviChange5yr: { type: Number, default: -0.12 }, // vegetation loss
    distanceToMiningSiteKm: { type: Number, default: 2.1 }, // rat-hole coal mines / limestone
    miningActivityType: { type: String, default: 'Rat-hole Coal Quarrying' },
    landUseChangeFlag: { type: Boolean, default: true },
    slopeAngle: { type: Number, default: 38 }, // degrees (SRTM DEM 30m)
    elevationMeters: { type: Number, default: 1430 }, // elevation in meters (OpenTopography DEM)
    soilErodibilityIndex: { type: String, default: 'High (Weathered Sandstone/Shale)' },
    historicalLandslideDensity: { type: Number, default: 4 }, // past events (legacy)
    historicalLandslideCount: { type: Number, default: 6 }, // Explicit GSI Historical Landslide Records count
    historicalLandslideDensityScore: { type: Number, default: 65 }, // 0 - 100 GSI Historical Landslide hazard score

    // PART B: GAP 1 — Proximity to Fault Lines & Seismic Zone V
    distanceToFaultLineKm: { type: Number, default: 4.2 }, // Distance to nearest tectonic fault
    nearestFaultLineName: { type: String, default: 'Dauki Fault System (Zone V)' },
    seismicZone: { type: String, default: 'Zone V (Very Severe Seismic Hazard)' },

    // PART C: GAP 2 — CNN Satellite / UAV Change Detection Signal
    satelliteChangeDetectedFlag: { type: Boolean, default: false },
    satelliteChangeConfidencePct: { type: Number, default: 0 },

    // PART D: Hydrology & Catchment Factors (SCS-CN Flood Modeling)
    drainageDensityKmPerSqKm: { type: Number, default: 2.8 }, // OSM waterway segments per km²
    soilType: { type: String, default: 'Clay Loam (Moderate Infiltration)' }, // Soil retention class
    curveNumber: { type: Number, default: 78 }, // SCS-CN Curve Number (varies by soil & LULC)
    lulcClass: { type: String, default: 'Dense Subtropical Forest / Valley Vegetation' }, // ESA WorldCover / Sentinel-2
    historicalFloodCount: { type: Number, default: 2 }, // CWC / GSI historical flash flood occurrences
    historicalFloodEvents: [{
      year: Number,
      floodLevelMeters: Number,
      description: String,
    }],
  },

  // Layer 2: Dynamic Meteorological / Sensor Triggers
  currentTelemetry: {
    rainfall24h: { type: Number, default: 28 }, // mm
    rainfall72h: { type: Number, default: 45 }, // mm
    soilMoisture: { type: Number, default: 42 }, // %
    slopeMovementMm: { type: Number, default: 0.2 }, // mm displacement
    waterLevelMeters: { type: Number, default: 1.4 },
    lastReadingTime: { type: Date, default: Date.now },
    forecastNext24hMm: { type: Number, default: 35 }, // LSTM forecast
  },

  // Layer 3: AI Multi-Hazard Risk Computation
  combinedRisk: {
    tier: { type: String, enum: ['SAFE', 'WATCH', 'WARNING', 'DANGER'], default: 'SAFE', index: true },
    score: { type: Number, default: 22 }, // 0 - 100
    confidence: { type: Number, default: 85 }, // %
    landslideScore: { type: Number, default: 20 },
    flashFloodScore: { type: Number, default: 15 },
    flashFloodWindow: { type: String, default: 'None' },
    floodExtentSqKm: { type: Number, default: 0.2 },
    runoffMm: { type: Number, default: 0 },
    drainageDensity: { type: Number, default: 2.8 },
    susceptibilityContribution: { type: Number, default: 40 },
    triggerContribution: { type: Number, default: 60 },
    contributingFactors: [{
      name: String,
      weight: Number,
      description: String,
    }],
    lastEvaluated: { type: Date, default: Date.now },
  },

  // External Data Source Status & Staleness tracking
  externalDataStatus: {
    weatherSource: { type: String, default: 'OPENWEATHER_LIVE' },
    weatherStale: { type: Boolean, default: false },
    satelliteSource: { type: String, default: 'Copernicus Sentinel-2' },
    satelliteStale: { type: Boolean, default: false },
    lastSyncTimestamp: { type: Date, default: Date.now },
  },

  // Assigned Field Officer for this zone
  assignedFieldOfficerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now },
});

const RiskZone = mongoose.model('RiskZone', riskZoneSchema);
export default RiskZone;
