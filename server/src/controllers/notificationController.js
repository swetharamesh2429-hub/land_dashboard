import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { getUserNotifications } from '../services/notificationService.js';

export const getNotifications = async (req, res, next) => {
  try {
    const role = req.user?.role || (req.query.role ? String(req.query.role).trim() : 'ALL');
    const userId = req.user?._id || null;

    const { notifications, unreadCount } = await getUserNotifications({
      userId,
      role,
      limit: Math.min(100, parseInt(req.query.limit || '50', 10)),
    });

    res.json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications,
    });
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification identifier.' });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    // IDOR check: If notification is assigned to specific user, ensure only that user or super admin can mark read
    if (notification.userId && req.user && notification.userId.toString() !== req.user._id.toString() && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: You cannot modify other users notifications.' });
    }

    notification.read = true;
    await notification.save();

    res.json({
      success: true,
      data: notification,
    });
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const role = req.user?.role || 'ALL';
    const userId = req.user?._id || null;

    const query = {};
    if (userId) {
      query.$or = [{ userId }, { role: 'ALL' }];
      if (role) query.$or.push({ role });
    } else if (role) {
      query.$or = [{ role }, { role: 'ALL' }];
    }

    await Notification.updateMany({ ...query, read: false }, { read: true });

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (err) {
    next(err);
  }
};

