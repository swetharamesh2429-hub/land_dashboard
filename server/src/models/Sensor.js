import mongoose from 'mongoose';

const sensorSchema = new mongoose.Schema({
  sensorCode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['RAIN_GAUGE', 'SOIL_MOISTURE', 'TILTMETER', 'VIBRATION', 'WATER_LEVEL', 'RIVER_GAUGE', 'METEO_STATION'],
    required: true,
  },
  districtId: { type: String, required: true, index: true },
  districtName: { type: String, required: true },
  villageName: { type: String, required: true },
  riskZoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskZone' },
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
  status: {
    type: String,
    enum: ['ONLINE', 'OFFLINE', 'FAULTY_ANOMALY'],
    default: 'ONLINE',
    index: true,
  },
  connectivityMode: {
    type: String,
    enum: ['GSM_SMS', 'LORAWAN', 'CELLULAR_4G_WIFI', 'GPRS'],
    default: 'CELLULAR_4G_WIFI',
  },
  lastReadingValue: { type: Number, default: 0 },
  unit: { type: String, default: 'mm' },
  lastUpdated: { type: Date, default: Date.now },
  batteryLevelPct: { type: Number, default: 94 },
  anomalyDetails: {
    isAnomaly: { type: Boolean, default: false },
    anomalyType: { type: String, default: 'NONE' },
    reason: { type: String, default: '' },
    fallbackSensorId: { type: String, default: '' },
  },
  installationDate: { type: Date, default: Date.now },
});

const Sensor = mongoose.model('Sensor', sensorSchema);
export default Sensor;
