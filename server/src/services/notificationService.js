import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { getIO } from './socketService.js';

/**
 * Creates and persists a durable notification record in MongoDB,
 * and emits a real-time event to connected clients.
 */
export const createNotification = async ({
  userId = null,
  role = 'ALL',
  type,
  relatedEntityId = null,
  title,
  message,
  villageName = null,
}) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️ Mongoose not connected, skipping persistent notification creation');
      return null;
    }

    const notification = await Notification.create({
      userId,
      role,
      type,
      relatedEntityId,
      title,
      message,
      villageName,
      read: false,
      createdAt: new Date(),
    });

    // Real-time broadcast via Socket.IO
    try {
      const io = getIO();
      if (io) {
        io.emit('NEW_NOTIFICATION', notification);
      }
    } catch (sockErr) {
      // socket might not be initialized in test environments
    }

    return notification;
  } catch (err) {
    console.error('❌ Failed to persist notification:', err.message);
    return null;
  }
};

/**
 * Retrieves notifications for a user based on role or specific userId.
 */
export const getUserNotifications = async ({ userId = null, role = null, limit = 50 }) => {
  try {
    const query = {};
    if (userId) {
      query.$or = [{ userId }, { role: 'ALL' }];
      if (role) query.$or.push({ role });
    } else if (role) {
      query.$or = [{ role }, { role: 'ALL' }];
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    const unreadCount = await Notification.countDocuments({
      ...query,
      read: false,
    });

    return { notifications, unreadCount };
  } catch (err) {
    console.error('❌ Error fetching notifications:', err.message);
    return { notifications: [], unreadCount: 0 };
  }
};
