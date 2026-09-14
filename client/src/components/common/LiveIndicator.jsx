import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

export const LiveIndicator = ({ showLabel = true }) => {
  const { connectionStatus } = useSocket();

  const configs = {
    LIVE: {
      dotClass: 'bg-[#10b981] animate-live-dot shadow-[0_0_8px_#10b981]',
      textColor: 'text-emerald-300 drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]',
      label: 'LIVE',
      borderClass: 'border-emerald-500/50 bg-emerald-950/80 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
      icon: Wifi,
    },
    RECONNECTING: {
      dotClass: 'bg-amber-400 animate-spin',
      textColor: 'text-amber-300',
      label: 'RECONNECTING',
      borderClass: 'border-amber-500/40 bg-amber-950/60 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
      icon: RefreshCw,
    },
    OFFLINE: {
      dotClass: 'bg-slate-400',
      textColor: 'text-slate-300',
      label: 'OFFLINE',
      borderClass: 'border-slate-700 bg-slate-900/80',
      icon: WifiOff,
    },
  };

  const current = configs[connectionStatus] || configs.OFFLINE;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-bold tracking-wider select-none ${current.borderClass}`}>
      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
        {connectionStatus === 'LIVE' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${current.dotClass}`}></span>
      </span>
      {showLabel && (
        <span className={`${current.textColor} font-black text-[11px]`}>
          {current.label}
        </span>
      )}
    </div>
  );
};
