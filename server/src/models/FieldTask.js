import mongoose from 'mongoose';

const fieldTaskSchema = new mongoose.Schema({
  taskCode: { type: String, required: true, unique: true },
  fieldOfficerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fieldOfficerName: { type: String, required: true },
  districtId: { type: String, required: true, index: true },
  districtName: { type: String, required: true },
  villageName: { type: String, required: true },
  riskZoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskZone' },
  alertId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alert' },
  title: { type: String, required: true },
  reason: { type: String, required: true }, // e.g., "AI flagged Danger-tier Landslide (82% conf) — confirm before public dispatch"
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'HIGH' },
  deadline: { type: Date },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'],
    default: 'PENDING',
    index: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  // Field Checklist verification items
  checklist: [{
    label: { type: String, required: true },
    checked: { type: Boolean, default: false },
    note: { type: String, default: '' },
  }],
  evidence: {
    photoUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
    observedSeverity: { type: String, enum: ['NO_THREAT', 'MINOR_CRACKS', 'MAJOR_SUBSIDENCE', 'ACTIVE_SLIPPAGE'], default: 'MAJOR_SUBSIDENCE' },
    roadPassable: { type: Boolean, default: false },
  },
  submittedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

const FieldTask = mongoose.model('FieldTask', fieldTaskSchema);
export default FieldTask;
