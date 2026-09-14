import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  alertCode: { type: String, required: true, unique: true },
  districtId: { type: String, required: true, index: true },
  districtName: { type: String, required: true },
  villageName: { type: String, required: true },
  riskZoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskZone', required: true },
  
  hazardType: {
    type: String,
    enum: ['LANDSLIDE', 'FLASH_FLOOD', 'FLOOD_EXTENT', 'MULTI_HAZARD'],
    default: 'LANDSLIDE',
  },
  tier: {
    type: String,
    enum: ['WATCH', 'WARNING', 'DANGER'],
    required: true,
    index: true,
  },
  confidencePct: { type: Number, required: true }, // e.g. 82%
  riskScore: { type: Number, required: true }, // 0 - 100
  timeWindow: { type: String, default: 'Next 2–6 hours' },
  
  contributingSources: [{
    type: String, // e.g. "Rainfall 24h spike", "Soil saturation > 78%", "Rat-hole mining proximity", "Satellite NDVI loss"
  }],
  
  // Hydrology & Inundation Extent Details (SCS-CN Model)
  floodExtentSqKm: { type: Number, default: 0 },
  runoffMm: { type: Number, default: 0 },
  drainageDensity: { type: Number, default: 0 },
  soilType: { type: String },
  affectedInfrastructure: [{ type: String }],
  overlappingVillages: [{ type: String }],
  
  status: {
    type: String,
    enum: ['AUTO_DETECTED', 'PENDING_OFFICER_REVIEW', 'CONFIRMED_DISPATCHED', 'DISMISSED_FALSE_POSITIVE'],
    default: function () {
      return this.tier === 'DANGER' ? 'PENDING_OFFICER_REVIEW' : 'CONFIRMED_DISPATCHED';
    },
    index: true,
  },
  
  // Field Officer verification assignment
  fieldVerification: {
    isRequested: { type: Boolean, default: false },
    requestedAt: { type: Date },
    assignedFieldOfficerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedFieldOfficerName: { type: String },
    status: { type: String, enum: ['NONE', 'PENDING', 'REQUESTED', 'SUBMITTED', 'VERIFIED', 'REJECTED'], default: 'NONE' },
    fieldTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'FieldTask' },
    reportSummary: { type: String },
    evidencePhotoUrl: { type: String },
    submittedAt: { type: Date },
  },
  
  // Officer Review & Decision
  officerDecision: {
    officerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    officerName: { type: String },
    action: { type: String, enum: ['NONE', 'CONFIRMED', 'DISMISSED'], default: 'NONE' },
    notes: { type: String },
    timestamp: { type: Date },
  },
  
  // Multi-Channel Dispatch Metadata
  dispatchChannels: {
    inAppPush: { type: Boolean, default: true },
    smsBroadcast: { type: Boolean, default: false },
    voiceBroadcast: { type: Boolean, default: false },
    cellBroadcastSachet: {
      type: Boolean,
      default: false,
      note: 'SACHET API hook ready (Government mock integration)',
    },
    dispatchedAt: { type: Date },
  },
  
  // Citizen ground feedback on this alert
  citizenFeedback: {
    totalResponses: { type: Number, default: 0 },
    confirmedAccurateCount: { type: Number, default: 0 },
    falseAlarmCount: { type: Number, default: 0 },
  },

  // Two-Way SMS Citizen Safety Check-In (Vonage Inbound Webhook)
  citizenCheckIns: {
    safeCount: { type: Number, default: 0 },
    totalNotified: { type: Number, default: 0 },
    responses: [
      {
        phone: { type: String },
        senderName: { type: String },
        text: { type: String },
        respondedAt: { type: Date, default: Date.now },
      },
    ],
  },
  
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

const Alert = mongoose.model('Alert', alertSchema);
export default Alert;
