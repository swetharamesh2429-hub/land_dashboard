import React from 'react';
import { ShieldCheck, Eye, AlertTriangle, AlertOctagon, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { RISK_TIERS, SENSOR_STATUS, CONNECTIVITY_MODES } from '../../utils/constants';

export const RiskBadge = ({ tier = 'SAFE', confidence = null, size = 'md' }) => {
  const tierConfig = RISK_TIERS[tier] || RISK_TIERS.SAFE;

  const icons = {
    SAFE: ShieldCheck,
    WATCH: Eye,
    WARNING: AlertTriangle,
    DANGER: AlertOctagon,
  };

  const IconComp = icons[tier] || ShieldCheck;
  const isDanger = tier === 'DANGER';

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs font-semibold gap-1.5',
    lg: 'px-3 py-1.5 text-sm font-bold gap-2',
    xl: 'px-4 py-2 text-base font-extrabold gap-2.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md uppercase tracking-wider font-sans transition-all ${tierConfig.badgeClass} ${sizeClasses[size] || sizeClasses.md} ${
        isDanger ? 'animate-pulse-danger' : ''
      }`}
    >
      <IconComp className={size === 'sm' ? 'w-3 h-3' : size === 'lg' || size === 'xl' ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
      <span>{tierConfig.label}</span>
      {confidence !== null && confidence !== undefined && (
        <span className="opacity-90 font-mono tracking-normal font-normal lowercase">
          · {confidence}%
        </span>
      )}
    </span>
  );
};

export const SensorStatusBadge = ({ status = 'ONLINE', size = 'sm' }) => {
  const config = SENSOR_STATUS[status] || SENSOR_STATUS.ONLINE;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium gap-1.5 ${config.badgeClass}`}>
      <span className={`w-2 h-2 rounded-full ${config.dotClass} ${status === 'ONLINE' ? 'animate-ping opacity-75' : ''}`} />
      <span>{config.label}</span>
    </span>
  );
};

export const ConnectivityBadge = ({ mode = 'CELLULAR_4G_WIFI' }) => {
  const config = CONNECTIVITY_MODES[mode] || { label: mode };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800/80 text-slate-300 border border-slate-700/60" title={config.description}>
      {config.label}
    </span>
  );
};

export const VerificationStatusBadge = ({ status = 'PENDING' }) => {
  const map = {
    PENDING: { label: 'Pending Review', class: 'bg-amber-950/40 text-amber-400 border-amber-500/30' },
    VERIFIED: { label: 'Verified Real', class: 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' },
    REJECTED: { label: 'Dismissed / Spam', class: 'bg-slate-800 text-slate-400 border-slate-700' },
    ASSIGNED_TO_FIELD: { label: 'Field Check Active', class: 'bg-sky-950/40 text-sky-400 border-sky-500/30' },
  };
  const config = map[status] || map.PENDING;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.class}`}>
      {config.label}
    </span>
  );
};
