import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  role: {
    type: String,
    enum: ['OFFICER', 'FIELD_OFFICER', 'CITIZEN', 'ALL'],
    default: 'ALL',
    index: true,
  },
  type: {
    type: String,
    enum: ['ALERT_DANGER', 'ALERT_CONFIRMED', 'FIELD_TASK_ASSIGNED', 'SOS_BEACON', 'SYSTEM'],
    required: true,
  },
  relatedEntityId: {
    type: String,
    default: null,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
  villageName: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
