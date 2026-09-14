import mongoose from 'mongoose';

const weatherDataSchema = new mongoose.Schema(
  {
    villageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RiskZone',
      required: true,
      index: true,
    },
    villageName: {
      type: String,
      required: true,
    },
    districtId: {
      type: String,
      required: true,
    },
    rainfallHourlyMm: {
      type: Number,
      default: 0,
    },
    rainfall24hMm: {
      type: Number,
      required: true,
    },
    rainfall7DayCumulativeMm: {
      type: Number,
      default: 0,
    },
    soilMoisturePct: {
      type: Number,
      default: 50,
    },
    temperatureC: {
      type: Number,
      default: 21,
    },
    humidityPct: {
      type: Number,
      default: 85,
    },
    windSpeedKmh: {
      type: Number,
      default: 12,
    },
    // LSTM / GRU Autoregressive 24h & 48h short-term forecast
    forecast24hMm: {
      type: Number,
      default: 0,
    },
    forecast48hMm: {
      type: Number,
      default: 0,
    },
    source: {
      type: String,
      enum: ['OPENWEATHER_LIVE', 'DATA_GOV_IN_IMD', 'LOCAL_AWS_TELEMETRY', 'SYNTHETIC_FALLBACK'],
      default: 'OPENWEATHER_LIVE',
    },
    isStaleFallback: {
      type: Boolean,
      default: false,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

weatherDataSchema.index({ villageId: 1, recordedAt: -1 });

export default mongoose.model('WeatherData', weatherDataSchema);
