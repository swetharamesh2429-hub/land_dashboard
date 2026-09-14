import mongoose from 'mongoose';

const citizenReportSchema = new mongoose.Schema({
  reportCode: { type: String, required: true, unique: true },
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reporterName: { type: String, default: 'Village Resident' },
  reporterPhone: { type: String, default: 'Anonymous' },
  districtId: { type: String, required: true, index: true },
  districtName: { type: String, required: true },
  villageName: { type: String, required: true },
  category: {
    type: String,
    enum: ['CRACK_LANDSLIDE_SIGN', 'RISING_WATER', 'BLOCKED_ROAD', 'ROCKFALL', 'OTHER'],
    required: true,
  },
  description: { type: String, default: '' },
  photoUrl: { type: String, default: '' },
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
  // AI Mock CNN Pre-Screening
  aiPreScreening: {
    confidencePct: { type: Number, default: 78 },
    label: { type: String, default: 'Likely genuine structural shear crack' },
    isVerifiedLikely: { type: Boolean, default: true },
  },
  verificationStatus: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'REJECTED', 'ASSIGNED_TO_FIELD'],
    default: 'PENDING',
    index: true,
  },
  verifiedByOfficerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedFieldOfficerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  officerNotes: { type: String },
  submittedAt: { type: Date, default: Date.now, index: true },
});

const CitizenReport = mongoose.model('CitizenReport', citizenReportSchema);
export default CitizenReport;
