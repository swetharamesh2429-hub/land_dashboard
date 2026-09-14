import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String, default: 'System' },
  userRole: { type: String, default: 'SYSTEM' },
  districtId: { type: String, index: true },
  action: {
    type: String,
    enum: [
      'USER_LOGIN',
      'ALERT_GENERATED',
      'ALERT_CONFIRMED_DISPATCHED',
      'ALERT_DISMISSED',
      'FIELD_VERIFICATION_REQUESTED',
      'FIELD_VERIFICATION_SUBMITTED',
      'SENSOR_ANOMALY_TRIGGERED',
      'CITIZEN_REPORT_VERIFIED',
      'CITIZEN_REPORT_REJECTED',
      'SOS_DISPATCHED',
      'SIMULATION_RUN'
    ],
    required: true,
  },
  details: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now, index: true },
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
