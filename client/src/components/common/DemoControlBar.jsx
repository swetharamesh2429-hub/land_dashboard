import React, { useState } from 'react';
import { CloudRain, AlertTriangle, Radio, RotateCcw, Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../services/api';
import { Button } from './Button';

export const DemoControlBar = ({ onSimulationTriggered }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const triggerAction = async (actionType, endpoint, payload, label) => {
    setLoadingAction(actionType);
    setFeedback(null);
    try {
      const res = await api.post(endpoint, payload);
      setFeedback({ type: 'success', message: res.data.message });
      if (onSimulationTriggered) onSimulationTriggered(actionType, res.data);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Simulation failed' });
    } finally {
      setLoadingAction(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className="bg-[#0a0a0a] border-b border-neutral-800 text-xs shadow-sm">
      {/* Compact Header Strip */}
      <div className="px-4 py-2 flex items-center justify-between gap-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-neutral-400 hover:text-neutral-200 text-xs font-medium cursor-pointer transition-colors"
        >
          <Sliders className="w-3.5 h-3.5 text-sky-400" />
          <span className="uppercase tracking-wider font-mono text-[10px] text-sky-400 font-semibold">
            Simulation & Drill Tools
          </span>
          <span className="text-[11px] text-neutral-500 hidden sm:inline">
            (Scenario triggers for operational readiness & testing)
          </span>
          {isOpen ? (
            <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          )}
        </button>

        {feedback && (
          <span
            className={`px-3 py-0.5 rounded-full text-[11px] font-mono font-medium border animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/50'
                : 'bg-red-950/90 text-red-300 border-red-700/50'
            }`}
          >
            {feedback.message}
          </span>
        )}
      </div>

      {/* Expandable Controls Panel */}
      {isOpen && (
        <div className="px-4 py-3 bg-[#050505] border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2 animate-in slide-in-from-top-1">
          <span className="text-[11px] text-neutral-400 font-mono">
            Inject synthetic telemetry & emergency event streams:
          </span>

          <div className="flex items-center flex-wrap gap-2">
            <button
              disabled={!!loadingAction}
              onClick={() =>
                triggerAction(
                  'rain',
                  '/demo/simulate-rainfall-spike',
                  { villageName: 'Sohra', rainfall24h: 138, soilMoisture: 84 },
                  'Rainfall Spike'
                )
              }
              className="bg-neutral-900 border border-sky-700/50 hover:bg-sky-950/40 text-sky-300 text-xs py-1 px-3 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <CloudRain className="w-3.5 h-3.5" />
              <span>Simulate Rainfall Spike (Sohra)</span>
            </button>

            <button
              disabled={!!loadingAction}
              onClick={() =>
                triggerAction('anomaly', '/demo/inject-sensor-anomaly', {}, 'Sensor Anomaly')
              }
              className="bg-neutral-900 border border-amber-700/50 hover:bg-amber-950/40 text-amber-300 text-xs py-1 px-3 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Simulate Sensor Anomaly</span>
            </button>

            <button
              disabled={!!loadingAction}
              onClick={() =>
                triggerAction(
                  'sos',
                  '/sos',
                  {
                    citizenName: 'Aiborlang Lyndem',
                    citizenPhone: '9876543230',
                    villageName: 'Sohra (Cherrapunji)',
                    districtId: 'EKH',
                    coordinates: [91.7324, 25.2986],
                    emergencyType: 'IMMINENT_SLOPE_COLLAPSE_TRAPPED',
                  },
                  'Citizen SOS'
                )
              }
              className="bg-neutral-900 border border-red-700/50 hover:bg-red-950/40 text-red-300 text-xs py-1 px-3 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Simulate Citizen SOS</span>
            </button>

            <button
              disabled={!!loadingAction}
              onClick={() => triggerAction('reset', '/demo/reset', {}, 'Reset')}
              className="text-neutral-400 hover:text-white text-xs py-1 px-3 rounded-full hover:bg-neutral-900 border border-transparent transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset State</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
