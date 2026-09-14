import mongoose from 'mongoose';

const alertAccuracyLogSchema = new mongoose.Schema({
  alertId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alert', required: true },
  alertCode: { type: String, required: true },
  districtId: { type: String, required: true, index: true },
  villageName: { type: String, required: true },
  hazardType: {
    type: String,
    enum: ['LANDSLIDE', 'FLASH_FLOOD', 'FLOOD_EXTENT'],
    default: 'LANDSLIDE',
  },
  predictedTier: { type: String, required: true },
  actualOutcome: {
    type: String,
    enum: ['ACCURATE_HAZARD_OCCURRED', 'PREEMPTIVE_EVACUATION_SUCCESS', 'FALSE_ALARM', 'DOWNGRADED'],
    required: true,
  },
  isAccurate: { type: Boolean, required: true },
  groundEvidenceNotes: { type: String },
  contributingCitizenVotes: {
    accurate: { type: Number, default: 0 },
    inaccurate: { type: Number, default: 0 },
  },
  loggedAt: { type: Date, default: Date.now },
});

const AlertAccuracyLog = mongoose.model('AlertAccuracyLog', alertAccuracyLogSchema);
export default AlertAccuracyLog;
