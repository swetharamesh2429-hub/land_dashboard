import api from '../services/api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('✅ ServiceWorker registered with scope:', reg.scope);
      return reg;
    } catch (err) {
      console.warn('⚠️ ServiceWorker registration failed:', err.message);
      return null;
    }
  }
  return null;
}

export async function requestAndSubscribeWebPush({ villageName = 'Sohra', role = 'CITIZEN' } = {}) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported in this browser');
    return { success: false, reason: 'NOT_SUPPORTED' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, reason: 'PERMISSION_DENIED' };
    }

    const reg = await navigator.serviceWorker.ready;

    // Get public VAPID key from backend
    const keyRes = await api.get('/push/vapid-public-key');
    const vapidPublicKey = keyRes.data?.publicKey;

    if (!vapidPublicKey) {
      throw new Error('VAPID public key unavailable from server');
    }

    const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });
    }

    // Send subscription to server
    await api.post('/push/subscribe', {
      subscription,
      villageName,
      role,
    });

    return { success: true, subscription };
  } catch (err) {
    console.error('❌ Push subscription error:', err);
    return { success: false, reason: err.message };
  }
}
