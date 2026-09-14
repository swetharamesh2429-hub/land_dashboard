import mongoose from 'mongoose';

const roadSegmentSchema = new mongoose.Schema({
  segmentCode: { type: String, required: true, unique: true },
  name: { type: String, required: true }, // e.g. "NH-206 Sohra-Shella Link"
  districtId: { type: String, required: true, index: true },
  coordinates: {
    type: [[Number]], // Array of [lon, lat] coordinates for polyline
    required: true,
  },
  status: {
    type: String,
    enum: ['CLEAR', 'CAUTION', 'BLOCKED', 'CLOSED'],
    default: 'CLEAR',
  },
  blockageProbabilityPct: { type: Number, default: 15 },
  criticality: { type: String, enum: ['LIFELINE_ROAD', 'SECONDARY_ARTERIAL', 'VILLAGE_ACCESS'], default: 'LIFELINE_ROAD' },
  alternateRouteDescription: { type: String, default: 'Via Mawkdok Bypass (Add 14 km)' },
  lastInspectionTime: { type: Date, default: Date.now },
});

const RoadSegment = mongoose.model('RoadSegment', roadSegmentSchema);
export default RoadSegment;
