import mongoose from 'mongoose';

const historicalLandslideSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    districtId: { type: String, required: true, index: true },
    districtName: { type: String, required: true },
    villageName: { type: String, required: true },
    date: { type: Date, required: true },
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
    severity: {
      type: String,
      enum: ['LOW', 'MODERATE', 'HIGH', 'SEVERE'],
      default: 'HIGH',
    },
    description: { type: String, required: true },
    triggerRainfallMm: { type: Number, default: 120 },
    casualties: { type: Number, default: 0 },
    source: {
      type: String,
      default: 'Geological Survey of India (GSI) Landslide Inventory',
    },
  },
  { timestamps: true }
);

const HistoricalLandslide = mongoose.model('HistoricalLandslide', historicalLandslideSchema);
export default HistoricalLandslide;
