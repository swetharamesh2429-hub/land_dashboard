import mongoose from 'mongoose';

const satelliteSnapshotSchema = new mongoose.Schema(
  {
    villageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RiskZone',
      required: true,
      index: true,
    },
    villageName: {
      type: String,
      required: true,
    },
    districtId: {
      type: String,
      required: true,
    },
    // Sentinel-2 Multi-Spectral Indices
    ndviMean: {
      type: Number,
      required: true, // e.g. 0.42 (0 to 1 scale)
    },
    ndviBaseline5Yr: {
      type: Number,
      required: true, // e.g. 0.75
    },
    ndviDelta5YrPct: {
      type: Number,
      required: true, // e.g. -44%
    },
    cloudCoverPct: {
      type: Number,
      default: 15,
    },
    // CNN Satellite / UAV Surface Displacement & Crack Detection
    changeDetectedFlag: {
      type: Boolean,
      default: false,
    },
    changeConfidencePct: {
      type: Number,
      default: 0,
    },
    changeDescription: {
      type: String,
      default: 'No active scarp formation or abrupt canopy displacement detected.',
    },
    sensorConstellation: {
      type: String,
      default: 'Copernicus Sentinel-2 MSI (ISRO Bhuvan calibrated)',
    },
    source: {
      type: String,
      enum: ['SENTINEL_HUB_API', 'COPERNICUS_ECOSYSTEM', 'BHUVAN_NRSC', 'SYNTHETIC_FALLBACK'],
      default: 'SENTINEL_HUB_API',
    },
    isStaleFallback: {
      type: Boolean,
      default: false,
    },
    acquiredDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

satelliteSnapshotSchema.index({ villageId: 1, acquiredDate: -1 });

export default mongoose.model('SatelliteSnapshot', satelliteSnapshotSchema);
