import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';
import mongoose from 'mongoose';

let vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:eoc-alerts@raksha-ner.gov.in';

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
    console.log('🔔 Web Push VAPID initialized from environment configuration');
  } catch (err) {
    console.warn('⚠️ Web Push VAPID environment key initialization warning:', err.message);
  }
} else {
  // Generate transient in-memory keys for development / testing environments
  try {
    const generated = webpush.generateVAPIDKeys();
    vapidPublicKey = generated.publicKey;
    vapidPrivateKey = generated.privateKey;
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔔 Generated ephemeral development VAPID keys for Web Push');
    } else {
      console.warn('⚠️ VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY should be configured in production for durable browser push subscriptions.');
    }
  } catch (e) {
    console.warn('⚠️ Web Push VAPID generation warning:', e.message);
  }
}

export const getVapidPublicKey = () => {
  return vapidPublicKey;
};

export const saveSubscription = async ({ userId = null, role = 'CITIZEN', villageName = null, subscription }) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return { success: true, simulated: true };
    }

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      throw new Error('Invalid subscription object');
    }

    const updated = await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        userId,
        role,
        villageName,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        createdAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return { success: true, data: updated };
  } catch (err) {
    console.error('❌ Error saving push subscription:', err.message);
    return { success: false, error: err.message };
  }
};

export const sendEmergencyWebPush = async ({
  title = '🚨 RAKSHA-NER Emergency Warning',
  message,
  url = '/',
  role = null,
  villageName = null,
  data = {},
}) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log(`🔔 [MOCK WEB PUSH DISPATCHED]: "${title}" - ${message}`);
      return { success: true, deliveredCount: 1, simulated: true };
    }

    const query = {};
    if (role && role !== 'ALL') {
      query.$or = [{ role }, { role: 'ALL' }];
    }
    if (villageName) {
      query.$or = (query.$or || []).concat([{ villageName }, { villageName: null }]);
    }

    const subscriptions = await PushSubscription.find(query);
    console.log(`🔔 Dispatching Web Push to ${subscriptions.length} subscribers...`);

    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/vite.svg',
      badge: '/vite.svg',
      data: {
        url,
        timestamp: new Date(),
        ...data,
      },
    });

    let deliveredCount = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payload
        );
        deliveredCount++;
      } catch (pushErr) {
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
          // Subscription has expired or is invalid, remove from DB
          await PushSubscription.deleteOne({ _id: sub._id });
        }
      }
    }

    return { success: true, deliveredCount };
  } catch (err) {
    console.error('❌ Error sending emergency web push:', err.message);
    return { success: false, error: err.message };
  }
};
