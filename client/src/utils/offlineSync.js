/**
 * Offline Sync and Cache Engine
 * Provides local caching of last-known risk zones, client-side photo compression,
 * and an offline queue for citizen/field reports that auto-syncs when online.
 */

const CACHE_KEYS = {
  RISK_ZONES: 'raksha_cache_risk_zones',
  MY_VILLAGE: 'raksha_cache_my_village',
  OFFLINE_REPORTS_QUEUE: 'raksha_offline_reports_queue',
};

// Client-side Image Compression (Converts File -> Compressed Base64 Data URL)
export const compressImage = (file, maxWidth = 1000, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      // If video or non-image, read directly or fallback
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Cache Risk Zones
export const cacheRiskZones = (zones) => {
  try {
    localStorage.setItem(
      CACHE_KEYS.RISK_ZONES,
      JSON.stringify({
        timestamp: Date.now(),
        data: zones,
      })
    );
  } catch (e) {
    console.warn('Failed to cache risk zones locally:', e);
  }
};

export const getCachedRiskZones = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.RISK_ZONES);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};

// Queue Offline Report
export const queueOfflineReport = (reportData) => {
  try {
    const queue = getOfflineReportsQueue();
    const item = {
      ...reportData,
      localId: `offline-${Date.now()}`,
      queuedAt: new Date().toISOString(),
    };
    queue.push(item);
    localStorage.setItem(CACHE_KEYS.OFFLINE_REPORTS_QUEUE, JSON.stringify(queue));
    return item;
  } catch (e) {
    console.error('Failed to queue offline report:', e);
    return null;
  }
};

export const getOfflineReportsQueue = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.OFFLINE_REPORTS_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const clearOfflineQueue = () => {
  try {
    localStorage.removeItem(CACHE_KEYS.OFFLINE_REPORTS_QUEUE);
  } catch (e) {
    console.warn(e);
  }
};

// Auto-Sync queued reports to backend
export const syncOfflineReports = async (apiClient) => {
  const queue = getOfflineReportsQueue();
  if (!queue || queue.length === 0) return { syncedCount: 0 };

  const remaining = [];
  let syncedCount = 0;

  for (const report of queue) {
    try {
      await apiClient.post('/citizen-reports', report);
      syncedCount++;
    } catch (err) {
      remaining.push(report);
    }
  }

  if (remaining.length > 0) {
    localStorage.setItem(CACHE_KEYS.OFFLINE_REPORTS_QUEUE, JSON.stringify(remaining));
  } else {
    clearOfflineQueue();
  }

  return { syncedCount, remainingCount: remaining.length };
};
