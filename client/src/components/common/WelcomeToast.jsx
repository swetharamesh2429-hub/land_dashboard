import React, { useState, useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

/**
 * WelcomeToast — brief top-right toast that greets user upon login.
 * Features a clean white card with subtle shadow, small colored left-accent bar matching role,
 * and auto-dismisses after 3.5s.
 */
export const WelcomeToast = () => {
  const [toastData, setToastData] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('raksha_welcome_toast');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setToastData(parsed);
        sessionStorage.removeItem('raksha_welcome_toast');

        const timer = setTimeout(() => {
          setToastData(null);
        }, 3500);

        return () => clearTimeout(timer);
      } catch (e) {
        sessionStorage.removeItem('raksha_welcome_toast');
      }
    }
  }, []);

  if (!toastData) return null;

  const roleLabels = {
    OFFICER: 'Disaster Operations Officer',
    SUPER_ADMIN: 'State Super-Admin',
    FIELD_OFFICER: 'Field Inspector',
    CITIZEN: 'Citizen',
  };

  const roleLeftAccents = {
    OFFICER: 'border-l-4 border-l-sky-500',
    SUPER_ADMIN: 'border-l-4 border-l-purple-500',
    FIELD_OFFICER: 'border-l-4 border-l-amber-500',
    CITIZEN: 'border-l-4 border-l-emerald-500',
  };

  const rolePills = {
    OFFICER: 'bg-blue-50 text-blue-700 border-blue-200',
    SUPER_ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
    FIELD_OFFICER: 'bg-amber-50 text-amber-700 border-amber-200',
    CITIZEN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const accentClass = roleLeftAccents[toastData.role] || 'border-l-4 border-l-sky-500';
  const pillClass = rolePills[toastData.role] || 'bg-slate-100 text-slate-700 border-slate-200';
  const displayRole = roleLabels[toastData.role] || toastData.role;

  return (
    <div className="fixed top-5 right-5 z-[99999] max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto select-none">
      <div className={`bg-white rounded-2xl shadow-xl border border-sky-100/70 ${accentClass} p-4 flex items-start gap-3.5 text-neutral-900`}>
        <div className="w-9 h-9 rounded-full bg-[#e6f1fb] border border-sky-100 flex items-center justify-center text-sky-600 shrink-0 mt-0.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-neutral-900 tracking-tight">
              Welcome back, {toastData.name}
            </span>
            <button
              onClick={() => setToastData(null)}
              className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded-full cursor-pointer transition-colors"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${pillClass}`}>
              {displayRole}
            </span>
            <span className="text-[11px] text-neutral-500 font-medium">Session Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
