import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Eye,
  ShieldCheck,
  Send,
  UserCheck,
  XCircle,
  FileText,
  Clock,
  ExternalLink,
  Filter,
  Sparkles,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { RiskBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card, CardHeader } from '../../components/common/Card';
import { CardSkeleton } from '../../components/common/Skeleton';
import { AlertDetailModal } from './AlertDetailModal';
import { formatRelativeTime } from '../../utils/formatters';

export const OfficerAlerts = ({ districtId = 'ALL' }) => {
  const { socket } = useSocket();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, PENDING, DANGER, WARNING, WATCH
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [loadingActions, setLoadingActions] = useState({}); // { [alertId]: 'confirm' | 'field' | 'dismiss' }
  const [statusMessage, setStatusMessage] = useState(null);

  const fetchAlerts = async () => {
    try {
      const res = await api.get(`/alerts?district=${districtId}`);
      if (res.data.success) {
        setAlerts(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [districtId]);

  // Real-time socket event listener for alert state updates
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchAlerts();
    };

    socket.on('ALERT_CREATED', handleUpdate);
    socket.on('ALERT_ESCALATED_TO_DANGER', handleUpdate);
    socket.on('ALERT_CONFIRMED_DISPATCHED', handleUpdate);
    socket.on('ALERT_DISMISSED_FALSE_POSITIVE', handleUpdate);
    socket.on('FIELD_TASK_ASSIGNED', handleUpdate);
    socket.on('FIELD_VERIFICATION_SUBMITTED', handleUpdate);
    socket.on('DEMO_RESET', handleUpdate);

    return () => {
      socket.off('ALERT_CREATED', handleUpdate);
      socket.off('ALERT_ESCALATED_TO_DANGER', handleUpdate);
      socket.off('ALERT_CONFIRMED_DISPATCHED', handleUpdate);
      socket.off('ALERT_DISMISSED_FALSE_POSITIVE', handleUpdate);
      socket.off('FIELD_TASK_ASSIGNED', handleUpdate);
      socket.off('FIELD_VERIFICATION_SUBMITTED', handleUpdate);
      socket.off('DEMO_RESET', handleUpdate);
    };
  }, [socket]);

  // Actions
  const handleConfirmAlert = async (alert) => {
    setLoadingActions((prev) => ({ ...prev, [alert._id]: 'confirm' }));
    try {
      const res = await api.post(`/alerts/${alert._id}/confirm`, {
        notes: 'Verified by Duty Disaster Officer; Public multi-channel broadcast approved.',
      });
      setStatusMessage({ type: 'success', text: `Alert ${alert.alertCode} confirmed & dispatched!` });
      setSelectedAlert(null);
      await fetchAlerts();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Confirmation failed.' });
    } finally {
      setLoadingActions((prev) => ({ ...prev, [alert._id]: null }));
    }
  };

  const handleDismissAlert = async (alert) => {
    setLoadingActions((prev) => ({ ...prev, [alert._id]: 'dismiss' }));
    try {
      await api.post(`/alerts/${alert._id}/dismiss`, {
        reason: 'Officer verified sensor stability; no immediate slope risk observed.',
      });
      setStatusMessage({ type: 'success', text: `Alert ${alert.alertCode} dismissed as False Positive.` });
      setSelectedAlert(null);
      await fetchAlerts();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Dismissal failed.' });
    } finally {
      setLoadingActions((prev) => ({ ...prev, [alert._id]: null }));
    }
  };

  const handleRequestFieldVerification = async (alert) => {
    setLoadingActions((prev) => ({ ...prev, [alert._id]: 'field' }));
    try {
      const res = await api.post(`/alerts/${alert._id}/request-field-verification`);
      setStatusMessage({
        type: 'success',
        text: `Field verification task created & assigned to ${res.data.task?.fieldOfficerName || 'duty field officer'}.`,
      });
      setSelectedAlert(null);
      await fetchAlerts();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Request failed.' });
    } finally {
      setLoadingActions((prev) => ({ ...prev, [alert._id]: null }));
    }
  };

  // Filtered list
  const filteredAlerts = alerts.filter((a) => {
    if (activeTab === 'PENDING') return a.status === 'PENDING_OFFICER_REVIEW';
    if (activeTab === 'DANGER') return a.tier === 'DANGER';
    if (activeTab === 'WARNING') return a.tier === 'WARNING';
    if (activeTab === 'WATCH') return a.tier === 'WATCH';
    if (activeTab === 'FLASH_FLOOD') return a.hazardType === 'FLASH_FLOOD';
    if (activeTab === 'LANDSLIDE') return a.hazardType === 'LANDSLIDE';
    return true;
  });

  const pendingCount = alerts.filter((a) => a.status === 'PENDING_OFFICER_REVIEW').length;
  const dangerCount = alerts.filter((a) => a.tier === 'DANGER').length;
  const floodCount = alerts.filter((a) => a.hazardType === 'FLASH_FLOOD').length;
  const landslideCount = alerts.filter((a) => a.hazardType === 'LANDSLIDE').length;

  return (
    <div className="space-y-6">
      {/* Top Banner with Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <AlertOctagon className="w-7 h-7 text-sky-400" />
            Operational Hazard Alerts & Verification
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            AI Multi-Hazard Predictions, Human Verification Queue, and Multi-Channel Broadcast
          </p>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'ALL' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({alerts.length})
          </button>
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'PENDING'
                ? 'bg-amber-600 text-white shadow'
                : 'text-amber-400 hover:bg-amber-950/40'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('DANGER')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'DANGER'
                ? 'bg-red-600 text-white shadow'
                : 'text-red-400 hover:bg-red-950/40'
            }`}
          >
            Danger ({dangerCount})
          </button>
          <button
            onClick={() => setActiveTab('FLASH_FLOOD')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${
              activeTab === 'FLASH_FLOOD'
                ? 'bg-sky-600 text-white shadow'
                : 'text-sky-400 hover:bg-sky-950/40'
            }`}
          >
            <span>🌊 Flash Flood ({floodCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('LANDSLIDE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${
              activeTab === 'LANDSLIDE'
                ? 'bg-amber-600 text-white shadow'
                : 'text-amber-300 hover:bg-amber-950/40'
            }`}
          >
            <span>⛰️ Landslide ({landslideCount})</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-medium border flex items-center justify-between animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/60 border-red-500/40 text-red-300'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Alerts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-2xl space-y-3">
          <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto opacity-80" />
          <h3 className="text-base font-bold text-slate-200">No Active Hazard Alerts in This View</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            All environmental sensors, rain thresholds, and slope models are operating within normal baseline tolerances.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAlerts.map((alert) => {
            const isPending = alert.status === 'PENDING_OFFICER_REVIEW';
            const isDispatched = alert.status === 'CONFIRMED_DISPATCHED';
            const isDismissed = alert.status === 'DISMISSED_FALSE_POSITIVE';
            const isFlood = alert.hazardType === 'FLASH_FLOOD';
            const isVerified =
              alert.fieldVerification?.status === 'SUBMITTED' ||
              alert.fieldVerification?.status === 'VERIFIED';
            const isRequested =
              alert.fieldVerification?.isRequested ||
              alert.fieldVerification?.status === 'PENDING' ||
              alert.fieldVerification?.status === 'REQUESTED';
            const currentAction = loadingActions[alert._id];

            const tierCardStyles = {
              DANGER:
                'border-red-500/30 shadow-[0_0_0_1px_rgba(238,0,0,0.18),0_4px_12px_rgba(0,0,0,0.7),0_16px_32px_-8px_rgba(238,0,0,0.12)] bg-gradient-to-b from-[#140b0b] to-[#0a0a0a]',
              WARNING: isFlood
                ? 'border-sky-500/30 shadow-[0_0_0_1px_rgba(14,165,233,0.15),0_4px_12px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#081523] to-[#0a0a0a]'
                : 'border-amber-500/30 shadow-[0_0_0_1px_rgba(245,166,35,0.15),0_4px_12px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#141009] to-[#0a0a0a]',
              WATCH:
                'border-sky-500/20 shadow-[0_0_0_1px_rgba(0,112,243,0.12),0_4px_12px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#090d14] to-[#0a0a0a]',
            };

            return (
              <div
                key={alert._id}
                className={`border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-neutral-700/80 ${
                  tierCardStyles[alert.tier] ||
                  'bg-[#0a0a0a] border-neutral-800 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5),0_12px_24px_-4px_rgba(0,0,0,0.8)]'
                }`}
              >
                <div>
                  {/* Top Bar: Pill Badge, Hazard Type & Metadata */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <RiskBadge tier={alert.tier} confidence={alert.confidencePct} size="md" />
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          isFlood
                            ? 'bg-sky-950 text-sky-300 border-sky-500/40'
                            : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {isFlood ? '🌊 FLASH FLOOD' : '⛰️ LANDSLIDE'}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400 tracking-tight font-normal">
                        {alert.alertCode}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-neutral-500">
                      {formatRelativeTime(alert.createdAt)}
                    </span>
                  </div>

                  {/* Village & Hazard Details */}
                  <h3 className="text-lg font-semibold text-[#ededed] tracking-[-0.6px] leading-snug">
                    {alert.villageName} ({alert.districtName})
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1 mb-3 text-xs text-neutral-400">
                    <span>
                      <strong className="text-neutral-200 font-medium">{isFlood ? 'Flash Flood Runoff' : 'Slope Instability'}</strong> Early Warning
                    </span>
                    <span className="text-neutral-600">·</span>
                    <span
                      className={`font-mono text-[11px] px-2 py-0.5 rounded-md border ${
                        isFlood
                          ? 'bg-sky-950 text-sky-300 border-sky-600/50 font-bold'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-800'
                      }`}
                      title={isFlood ? 'Urgent flash flood onset window (short hydrological lead-time)' : 'Expected landslide window'}
                    >
                      ⏱️ {alert.timeWindow || (isFlood ? '2–4 hours' : '2–6 hours')}
                    </span>
                    {isFlood && alert.floodExtentSqKm && (
                      <span className="font-mono text-[11px] text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded-md font-bold">
                        🌊 Inundation: {alert.floodExtentSqKm} km²
                      </span>
                    )}
                  </div>

                  {/* Flash Flood Hydrology & Overlapping Infrastructure Details */}
                  {isFlood && (
                    <div className="bg-[#081523]/80 border border-sky-800/40 rounded-xl p-3 mb-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-sky-300 font-semibold font-mono uppercase text-[10px]">
                          Hydrological Impact Matrix:
                        </span>
                        {alert.runoffMm && (
                          <span className="text-emerald-400 font-mono text-[11px] font-bold">
                            Runoff: {alert.runoffMm} mm
                          </span>
                        )}
                      </div>
                      {(alert.affectedInfrastructure?.length > 0 || alert.overlappingVillages?.length > 0) && (
                        <div className="text-[11px] text-sky-200/90 space-y-0.5 pt-0.5">
                          {alert.affectedInfrastructure?.map((item, idx) => (
                            <div key={`inf-${idx}`} className="flex items-center gap-1.5 text-amber-300 font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                              <span>Overlaps: <strong>{item}</strong></span>
                            </div>
                          ))}
                          {alert.overlappingVillages?.map((v, idx) => (
                            <div key={`ov-${idx}`} className="flex items-center gap-1.5 text-sky-300 font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                              <span>Nearby Sector: <strong>{v}</strong></span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                    {/* Contributing Sources Evidence (Terminal/Mono Inset Box) */}
                    <div className="bg-[#050505] border border-neutral-800/80 rounded-xl p-3 mb-3 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-medium block">
                        Contributing Scientific Evidence:
                      </span>
                      {alert.contributingSources && alert.contributingSources.length > 0 ? (
                        alert.contributingSources.slice(0, 3).map((src, i) => (
                          <div key={i} className="text-xs font-mono text-neutral-300 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0070f3] shrink-0" />
                            <span>{src}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs font-mono text-neutral-500">Rainfall & Soil sensors baseline aligned</span>
                      )}
                    </div>

                    {/* Field Verification State Pill */}
                    {isVerified ? (
                    <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-semibold text-emerald-300 block">✓ Field Verified — Evidence Submitted</span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            Inspected by {alert.fieldVerification?.assignedFieldOfficerName || 'Field Officer'} ({formatRelativeTime(alert.fieldVerification?.submittedAt)})
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedAlert(alert)}
                        className="px-3 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-medium transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Report</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  ) : isRequested ? (
                    <div className="mb-3 p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-sky-400 shrink-0" />
                        <div>
                          <span className="font-medium text-neutral-200 block">
                            ✓ Field Check Requested — Assigned to {alert.fieldVerification?.assignedFieldOfficerName || 'Field Officer'}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            Requested {formatRelativeTime(alert.fieldVerification?.requestedAt || alert.createdAt)} · Inspection in progress
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-[10px] text-sky-400 font-mono font-medium uppercase">
                        Pending
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Bottom Actions Container */}
                <div className="pt-3 border-t border-neutral-800/80 space-y-2.5">
                  {isPending ? (
                    <div className="space-y-2.5">
                      <div className="p-2.5 rounded-xl bg-[#17120a] border border-amber-500/25 text-[11px] text-amber-200/90 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span><strong>Officer Action Required:</strong> Danger alert held in queue to avoid false alarms.</span>
                      </div>
                      
                      <div className={isRequested || isVerified ? 'space-y-2' : 'grid grid-cols-2 gap-2'}>
                        {/* Confirm Button - Vercel Pill CTA */}
                        <button
                          type="button"
                          disabled={!!currentAction}
                          onClick={() => handleConfirmAlert(alert)}
                          className={`w-full rounded-full px-4 py-2 text-xs font-medium tracking-tight transition-all duration-150 active:scale-[0.98] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                            isVerified
                              ? 'bg-white text-neutral-950 hover:bg-neutral-100 ring-2 ring-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.25)] font-semibold'
                              : 'bg-white text-neutral-950 hover:bg-neutral-200 border border-white/20'
                          }`}
                        >
                          {currentAction === 'confirm' ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Dispatching...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>{isVerified ? 'Confirm & Dispatch to Public (Verified)' : 'Confirm & Dispatch'}</span>
                            </>
                          )}
                        </button>

                        {/* Request Field Check Button - Vercel Secondary Pill */}
                        {!isRequested && !isVerified && (
                          <button
                            type="button"
                            disabled={!!currentAction}
                            onClick={() => handleRequestFieldVerification(alert)}
                            className="w-full rounded-full px-4 py-2 text-xs font-medium tracking-tight bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700/80 hover:border-neutral-600 transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {currentAction === 'field' ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Requesting...</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5 text-neutral-300" />
                                <span>Request Field Check</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : isDispatched ? (
                    <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-semibold text-emerald-300 block">✓ Confirmed & Dispatched</span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            Broadcast Active · {formatRelativeTime(alert.dispatchChannels?.dispatchedAt || alert.updatedAt)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedAlert(alert)}
                        className="text-neutral-400 hover:text-white flex items-center gap-1 text-[11px] font-mono font-medium underline cursor-pointer transition-colors"
                      >
                        <span>View Lifecycle</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : isDismissed ? (
                    <div className="p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <div>
                          <span className="font-medium text-neutral-300 block">✕ Dismissed as False Positive</span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            Logged in AI Accuracy feedback loop · {formatRelativeTime(alert.updatedAt)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedAlert(alert)}
                        className="text-neutral-400 hover:text-white flex items-center gap-1 text-[11px] font-mono font-medium underline cursor-pointer transition-colors"
                      >
                        <span>Inspect Audit Log</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <span className="text-emerald-400 font-medium">✓ Active Operational Advisory</span>
                      <button
                        onClick={() => setSelectedAlert(alert)}
                        className="text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>View Full Lifecycle</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Secondary Dismiss & Audit buttons for Pending Alert */}
                  {isPending && (
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedAlert(alert)}
                        className="text-[11px] font-mono text-neutral-500 hover:text-neutral-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>Inspect Full Audit Trail</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={!!currentAction}
                        onClick={() => handleDismissAlert(alert)}
                        className="text-[11px] font-mono text-neutral-500 hover:text-red-400 disabled:opacity-50 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {currentAction === 'dismiss' ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Dismissing...</span>
                          </>
                        ) : (
                          <span>Dismiss as False Positive</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <AlertDetailModal
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        alert={selectedAlert}
        onConfirm={handleConfirmAlert}
        onDismiss={handleDismissAlert}
        onRequestFieldVerification={handleRequestFieldVerification}
        loadingAction={selectedAlert ? loadingActions[selectedAlert._id] : null}
      />
    </div>
  );
};
