import mongoose from 'mongoose';

const sensorReadingSchema = new mongoose.Schema({
  sensorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sensor', required: true, index: true },
  sensorCode: { type: String, required: true },
  districtId: { type: String, required: true, index: true },
  readingValue: { type: Number, required: true },
  unit: { type: String, default: 'mm' },
  isAnomaly: { type: Boolean, default: false },
  anomalyFlag: { type: String, default: 'NORMAL' },
  timestamp: { type: Date, default: Date.now, index: true },
});

// Compound index for time-series aggregation
sensorReadingSchema.index({ sensorId: 1, timestamp: -1 });

const SensorReading = mongoose.model('SensorReading', sensorReadingSchema);
export default SensorReading;
