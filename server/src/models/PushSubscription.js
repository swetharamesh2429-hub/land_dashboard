import mongoose from 'mongoose';

const pushSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  role: {
    type: String,
    enum: ['OFFICER', 'FIELD_OFFICER', 'CITIZEN', 'ALL'],
    default: 'CITIZEN',
  },
  villageName: {
    type: String,
    default: null,
  },
  endpoint: {
    type: String,
    required: true,
    unique: true,
  },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);
export default PushSubscription;
