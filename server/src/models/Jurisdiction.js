import mongoose from 'mongoose';

const jurisdictionSchema = new mongoose.Schema({
  stateId: { type: String, required: true },
  stateName: { type: String, required: true },
  districtId: { type: String, required: true, unique: true },
  districtName: { type: String, required: true },
  headquarters: { type: String },
  centerCoordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
  },
  bounds: {
    type: [[Number]], // Bounding box
  },
  emergencyContacts: [{
    label: String,
    number: String,
  }],
  totalVillages: { type: Number, default: 0 },
  activeAlertsCount: { type: Number, default: 0 },
});

const Jurisdiction = mongoose.model('Jurisdiction', jurisdictionSchema);
export default Jurisdiction;
