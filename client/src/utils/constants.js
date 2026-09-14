// RAKSHA-NER Central Constants & Theme Config

export const RISK_TIERS = {
  SAFE: {
    key: 'SAFE',
    label: 'SAFE',
    color: '#22C55E',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    badgeClass: 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30',
    icon: 'ShieldCheck',
    description: 'Normal background environmental levels. No active hazard risk detected.',
  },
  WATCH: {
    key: 'WATCH',
    label: 'WATCH',
    color: '#EAB308',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    textColor: 'text-yellow-400',
    badgeClass: 'bg-yellow-950/60 text-yellow-400 border border-yellow-500/30',
    icon: 'Eye',
    description: 'Elevated sensor reading or single contributing factor. Monitoring active.',
  },
  WARNING: {
    key: 'WARNING',
    label: 'WARNING',
    color: '#F97316',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/40',
    textColor: 'text-orange-400',
    badgeClass: 'bg-orange-950/60 text-orange-400 border border-orange-500/40',
    icon: 'AlertTriangle',
    description: 'Two or more independent data sources aligned. In-app & SMS advisories active.',
  },
  DANGER: {
    key: 'DANGER',
    label: 'DANGER',
    color: '#DC2626',
    bgColor: 'bg-red-500/15',
    borderColor: 'border-red-500/60',
    textColor: 'text-red-400',
    badgeClass: 'bg-red-950/80 text-red-300 border-2 border-red-500 shadow-lg shadow-red-950/50',
    icon: 'AlertOctagon',
    description: 'High-confidence imminent hazard. Requires Officer verification before public cell broadcast.',
  },
};

export const SENSOR_STATUS = {
  ONLINE: {
    label: 'Online',
    color: '#22C55E',
    badgeClass: 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/30',
    dotClass: 'bg-emerald-500',
  },
  OFFLINE: {
    label: 'Offline',
    color: '#94A3B8',
    badgeClass: 'bg-slate-800 text-slate-400 border border-slate-700',
    dotClass: 'bg-slate-400',
  },
  FAULTY_ANOMALY: {
    label: 'Faulty / Anomaly',
    color: '#F97316',
    badgeClass: 'bg-orange-950/60 text-orange-400 border border-orange-500/40',
    dotClass: 'bg-orange-500',
  },
};

export const CONNECTIVITY_MODES = {
  CELLULAR_4G_WIFI: { label: '🌐 4G / WiFi', description: 'High-speed broadband uplink' },
  LORAWAN: { label: '📡 LoRaWAN', description: 'Long-range low-power telemetry network' },
  GSM_SMS: { label: '📶 GSM / SMS', description: 'Fallback cellular text protocol' },
  GPRS: { label: '📲 GPRS', description: 'Legacy packet cellular uplink' },
};

export const DISTRICTS = [
  { id: 'ALL', name: 'All Districts (State Overview)' },
  { id: 'EKH', name: 'East Khasi Hills (Meghalaya)' },
  { id: 'DH', name: 'Dima Hasao (Assam)' },
];

export const HAZARD_TYPES = {
  LANDSLIDE: { label: 'Landslide', icon: 'Mountain' },
  FLASH_FLOOD: { label: 'Flash Flood', icon: 'Waves' },
  FLOOD_EXTENT: { label: 'Inundation Extent', icon: 'CloudRain' },
  MULTI_HAZARD: { label: 'Multi-Hazard', icon: 'AlertOctagon' },
};
