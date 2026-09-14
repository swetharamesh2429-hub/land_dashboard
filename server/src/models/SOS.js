import mongoose from 'mongoose';

const sosSchema = new mongoose.Schema({
  sosCode: { type: String, required: true, unique: true },
  citizenId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  citizenName: { type: String, default: 'Citizen in Distress' },
  citizenPhone: { type: String, default: 'N/A' },
  districtId: { type: String, required: true, index: true },
  villageName: { type: String, default: 'Unassigned Village' },
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
  emergencyType: { type: String, default: 'TRAPPED_BY_LANDSLIDE' },
  status: {
    type: String,
    enum: ['ACTIVE', 'RESPONDING', 'RESOLVED'],
    default: 'ACTIVE',
    index: true,
  },
  assignedRescueUnit: { type: String, default: 'EOC Fast Response Unit 2' },
  dispatchedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
});

const SOS = mongoose.model('SOS', sosSchema);
export default SOS;
