export const formatRelativeTime = (dateInput) => {
  if (!dateInput) return 'Just now';
  const date = new Date(dateInput);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const formatCoordinates = (coords) => {
  if (!coords || !Array.isArray(coords) || coords.length < 2) return 'N/A';
  // coordinates are [longitude, latitude]
  return `${coords[1].toFixed(4)}°N, ${coords[0].toFixed(4)}°E`;
};

export const formatNumber = (num, decimals = 1) => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return Number(num).toLocaleString('en-IN', { maximumFractionDigits: decimals });
};
