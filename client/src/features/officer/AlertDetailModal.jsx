import React from 'react';
import { Modal } from '../../components/common/Modal';
import { RiskBadge, VerificationStatusBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  AlertOctagon,
  ShieldCheck,
  Send,
  UserCheck,
  XCircle,
  Radio,
  FileText,
  Clock,
  MapPin,
  CheckCircle2,
  CheckSquare,
  Square,
  Loader2,
  Droplets,
} from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatters';

export const AlertDetailModal = ({
  isOpen,
  onClose,
  alert,
  onConfirm,
  onDismiss,
  onRequestFieldVerification,
  loadingAction,
}) => {
  if (!alert) return null;

  const isPending = alert.status === 'PENDING_OFFICER_REVIEW';
  const isDanger = alert.tier === 'DANGER';
  const isFlood = alert.hazardType === 'FLASH_FLOOD';
  const isVerified =
    alert.fieldVerification?.status === 'SUBMITTED' ||
    alert.fieldVerification?.status === 'VERIFIED';
  const isRequested =
    alert.fieldVerification?.isRequested ||
    alert.fieldVerification?.status === 'PENDING' ||
    alert.fieldVerification?.status === 'REQUESTED';

  const fieldTask = alert.fieldVerification?.fieldTaskId;
  const checklist = fieldTask?.checklist || [];

  const floodArea = alert.floodExtentSqKm || 2.4;
  const floodRadiusMeters = Math.max(250, Math.round(Math.sqrt((floodArea * 1000000) / Math.PI)));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Hazard Alert Lifecycle: ${alert.alertCode}`}
      subtitle={`District: ${alert.districtName} · Village: ${alert.villageName}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5 text-neutral-200 text-xs sm:text-sm">
        {/* Tier & Status Banner */}
        <div
          className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
            isDanger
              ? 'bg-red-950/20 border-red-800/40'
              : isFlood
              ? 'bg-sky-950/20 border-sky-800/40'
              : 'bg-[#050505] border-neutral-800 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <RiskBadge tier={alert.tier} confidence={alert.confidencePct} size="lg" />
            <div>
              <span className="font-semibold text-sm text-white flex items-center gap-1.5 tracking-[-0.2px]">
                {isFlood ? '🌊 FLASH FLOOD EMERGENCY ADVISORY' : '⛰️ LANDSLIDE EMERGENCY ADVISORY'}
              </span>
              <span className="text-xs text-neutral-400">
                Expected Time Window: <strong className="text-white font-mono">{alert.timeWindow || (isFlood ? '2–4 hours' : '2–6 hours')}</strong>
                {isFlood && <span className="ml-2 text-cyan-300 font-mono font-bold">(Rapid Onset Hydrology)</span>}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-mono text-neutral-400 block">Current Status</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold uppercase inline-block mt-0.5 border ${
                isPending
                  ? 'bg-amber-950/80 text-amber-300 border-amber-700/50'
                  : alert.status === 'CONFIRMED_DISPATCHED'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50'
                  : 'bg-neutral-900 text-neutral-300 border-neutral-800'
              }`}
            >
              {alert.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* FLASH FLOOD SPECIFIC: Hydrological Model & Inundation Extent Details (Part 1 & 2) */}
        {isFlood && (
          <div className="bg-[#06121e] border border-sky-700/50 rounded-2xl p-4 space-y-3 shadow-[0_0_0_1px_rgba(14,165,233,0.15)]">
            <div className="flex items-center justify-between border-b border-sky-800/60 pb-2">
              <h4 className="text-xs font-mono font-semibold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-sky-400" />
                SCS-CN Hydrological Inundation Model Analysis
              </h4>
              <span className="text-[10px] font-mono text-cyan-300 font-bold bg-sky-950 px-2 py-0.5 rounded border border-sky-600/40">
                ACTIVE FLOOD FOOTPRINT
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-[#0a1a2b] p-2.5 rounded-xl border border-sky-800/40">
                <span className="text-[10px] font-mono text-slate-400 block">Inundation Extent</span>
                <strong className="text-sm font-bold font-mono text-cyan-300">{floodArea} km²</strong>
              </div>
              <div className="bg-[#0a1a2b] p-2.5 rounded-xl border border-sky-800/40">
                <span className="text-[10px] font-mono text-slate-400 block">Impact Radius</span>
                <strong className="text-sm font-bold font-mono text-sky-300">~{floodRadiusMeters >= 1000 ? `${(floodRadiusMeters/1000).toFixed(1)} km` : `${floodRadiusMeters} m`}</strong>
              </div>
              <div className="bg-[#0a1a2b] p-2.5 rounded-xl border border-sky-800/40">
                <span className="text-[10px] font-mono text-slate-400 block">SCS-CN Runoff</span>
                <strong className="text-sm font-bold font-mono text-emerald-400">{alert.runoffMm || 48.6} mm</strong>
              </div>
              <div className="bg-[#0a1a2b] p-2.5 rounded-xl border border-sky-800/40">
                <span className="text-[10px] font-mono text-slate-400 block">Drainage Density</span>
                <strong className="text-sm font-bold font-mono text-amber-300">{alert.drainageDensity || 2.4} km/km²</strong>
              </div>
            </div>

            {/* Overlapping Infrastructure & Villages Check (Part 1 Requirement 3) */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-mono font-semibold text-sky-200 uppercase tracking-wider block">
                Settlements & Critical Infrastructure Overlapping Flood Radius:
              </span>
              <div className="p-2.5 rounded-xl bg-[#081523] border border-sky-800/40 space-y-1 text-xs">
                {(alert.affectedInfrastructure || ['NH-206 Sohra-Shella Link Road', 'Pynursla Valley Culvert Bridge']).map((item, idx) => (
                  <div key={`af-${idx}`} className="text-amber-200 flex items-center gap-1.5 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>Corridor at Risk: <strong>{item}</strong></span>
                  </div>
                ))}
                {(alert.overlappingVillages || ['Pynursla Slope Area', 'Mawlynnong Drainage Confluence']).map((v, idx) => (
                  <div key={`ov-${idx}`} className="text-sky-200 flex items-center gap-1.5 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                    <span>Adjacent Settlement: <strong>{v}</strong></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Honest Engineering Disclaimer (Part 1 Requirement 4) */}
            <div className="text-[11px] text-sky-300/80 bg-sky-950/60 p-2.5 rounded-xl border border-sky-800/50 leading-relaxed">
              ℹ️ <strong>Engineering Note:</strong> <em>Approximate impact radius based on computed inundation area from SCS-CN runoff volume — not a precise 2D hydrodynamic floodplain simulation.</em>
            </div>
          </div>
        )}

        {/* Contributing Multi-Source Evidence */}
        <div className="bg-[#050505] border border-neutral-800 rounded-2xl p-4 space-y-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
          <h4 className="text-xs font-mono font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            Contributing Scientific Evidence & Data Alignment
          </h4>
          <div className="space-y-1.5">
            {alert.contributingSources && alert.contributingSources.length > 0 ? (
              alert.contributingSources.map((src, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0a0a0a] border border-neutral-800 text-xs text-neutral-200 font-mono"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{src}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-400">Automated sensor & ML feature alignment.</p>
            )}
          </div>
        </div>

        {/* Field Verification Ground-Truth Status */}
        <div className="bg-[#050505] border border-neutral-800 rounded-2xl p-4 space-y-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-purple-400" />
              Field Officer Ground Verification
            </h4>
            <span className="text-xs">
              {isRequested || isVerified ? (
                <span className="text-sky-300 font-medium">
                  Assigned to: {alert.fieldVerification?.assignedFieldOfficerName || 'Duty Field Officer'}
                </span>
              ) : (
                <span className="text-neutral-400">Not Requested</span>
              )}
            </span>
          </div>

          {isVerified ? (
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  Ground Inspection Report Received
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {formatRelativeTime(alert.fieldVerification.submittedAt)}
                </span>
              </div>
              <p className="text-xs text-neutral-200 bg-[#0a0a0a] p-2.5 rounded-xl border border-neutral-800">
                {alert.fieldVerification.reportSummary || 'Field physical verification completed.'}
              </p>

              {/* On-ground Checklist Inspection Results */}
              {checklist.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-mono font-semibold text-neutral-300 uppercase tracking-wider block">
                    Field Inspection Checklist:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {checklist.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-1.5 text-xs p-2 rounded-xl border ${
                          item.checked
                            ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-200'
                            : 'bg-[#0a0a0a] border-neutral-800 text-neutral-400'
                        }`}
                      >
                        {item.checked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        )}
                        <span className="truncate">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {alert.fieldVerification.evidencePhotoUrl && (
                <div className="mt-2.5">
                  <span className="text-[11px] text-neutral-400 block mb-1.5 font-semibold">
                    Attached Photographic Ground Evidence:
                  </span>
                  <img
                    src={alert.fieldVerification.evidencePhotoUrl}
                    alt="Field Ground Truth Evidence"
                    className="h-40 w-full object-cover rounded-xl border border-neutral-800"
                  />
                </div>
              )}
            </div>
          ) : isRequested ? (
            <div className="p-3.5 bg-amber-950/20 border border-amber-800/40 rounded-xl text-xs text-amber-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
              <span>
                Field Officer {alert.fieldVerification?.assignedFieldOfficerName || 'Duty Inspector'} is currently on-site inspecting slope tension cracks & drainage channels. (Requested {formatRelativeTime(alert.fieldVerification?.requestedAt || alert.createdAt)})
              </span>
            </div>
          ) : null}
        </div>

        {/* Multi-Channel Broadcast Channels Status */}
        <div className="bg-[#050505] border border-neutral-800 rounded-2xl p-4 space-y-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
          <h4 className="text-xs font-mono font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-sky-400" />
            Emergency Broadcast Dispatch Channels
          </h4>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div
              className={`p-2.5 rounded-xl border ${
                alert.dispatchChannels?.inAppPush
                  ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                  : 'bg-[#0a0a0a] border-neutral-800 text-neutral-400'
              }`}
            >
              <span className="block font-semibold">📱 In-App Alert</span>
              <span className="text-[10px] font-mono mt-0.5 block">
                {alert.dispatchChannels?.inAppPush ? 'Broadcasted Live' : 'Standby'}
              </span>
            </div>
            <div
              className={`p-2.5 rounded-xl border ${
                alert.dispatchChannels?.smsBroadcast
                  ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                  : 'bg-[#0a0a0a] border-neutral-800 text-neutral-400'
              }`}
            >
              <span className="block font-semibold">💬 SMS Broadcast</span>
              <span className="text-[10px] font-mono mt-0.5 block">
                {alert.dispatchChannels?.smsBroadcast ? 'Dispatch Sent' : 'Standby'}
              </span>
            </div>
            <div
              className={`p-2.5 rounded-xl border ${
                alert.dispatchChannels?.cellBroadcastSachet
                  ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                  : 'bg-[#0a0a0a] border-neutral-800 text-neutral-400'
              }`}
            >
              <span className="block font-semibold">📡 NDMA SACHET</span>
              <span className="text-[10px] font-mono mt-0.5 block">
                {alert.dispatchChannels?.cellBroadcastSachet ? 'CAP-IN Hook Active' : 'Ready to Trigger'}
              </span>
            </div>
          </div>
        </div>

        {/* Two-Way SMS Citizen Safety Check-In Metrics */}
        <div className="bg-[#050505] border border-neutral-800 rounded-2xl p-4 space-y-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Two-Way SMS Citizen Safety Check-In (Vonage Inbound)
            </h4>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold">
              Reply "SAFE" to SMS Alert
            </span>
          </div>

          <div className="flex items-center justify-between bg-[#0a0a0a] p-3 rounded-xl border border-neutral-800">
            <div>
              <span className="text-neutral-400 text-xs block">Confirmed Safe Residents:</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <strong className="text-emerald-400 text-lg font-bold font-mono">
                  {alert.citizenCheckIns?.safeCount || 0}
                </strong>
                <span className="text-neutral-400 text-xs font-mono"> of {alert.citizenCheckIns?.totalNotified || 50} notified</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-neutral-400 block">Check-In Ratio</span>
              <span className="text-sm font-bold text-sky-400 font-mono">
                {Math.round(((alert.citizenCheckIns?.safeCount || 0) / (alert.citizenCheckIns?.totalNotified || 50)) * 100)}%
              </span>
            </div>
          </div>

          {alert.citizenCheckIns?.responses && alert.citizenCheckIns.responses.length > 0 && (
            <div className="space-y-1.5 pt-1 max-h-28 overflow-y-auto">
              <span className="text-[10px] font-mono text-neutral-400 block font-semibold">Recent Citizen Check-In SMS:</span>
              {alert.citizenCheckIns.responses.slice(-3).map((r, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-[#0a0a0a] border border-neutral-800">
                  <span className="text-neutral-300 font-mono">{r.senderName || r.phone}: <strong className="text-emerald-300">"{r.text}"</strong></span>
                  <span className="text-[10px] text-neutral-500 font-mono">{formatRelativeTime(r.respondedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Officer Decision Buttons */}
        {isPending && (
          <div className="p-4 bg-[#050505] border border-neutral-800 rounded-2xl space-y-3 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
            <span className="text-xs font-mono font-semibold text-neutral-300 uppercase tracking-wider block">
              Officer Decision (Human-in-the-Loop Protocol)
            </span>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                disabled={!!loadingAction}
                onClick={() => onConfirm(alert)}
                className={`flex-1 py-2.5 px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50 ${
                  isVerified ? 'ring-2 ring-emerald-400/80 shadow-emerald-950/60' : ''
                }`}
              >
                {loadingAction === 'confirm' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>
                  {loadingAction === 'confirm'
                    ? 'Dispatching...'
                    : isVerified
                    ? 'Confirm & Dispatch (Verified)'
                    : 'Confirm & Dispatch to Public'}
                </span>
              </button>

              {!isRequested && !isVerified && (
                <button
                  disabled={!!loadingAction}
                  onClick={() => onRequestFieldVerification(alert)}
                  className="flex-1 py-2.5 px-4 rounded-full border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loadingAction === 'field' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  <span>{loadingAction === 'field' ? 'Requesting...' : 'Request Field Check'}</span>
                </button>
              )}

              <button
                disabled={!!loadingAction}
                onClick={() => onDismiss(alert)}
                className="py-2.5 px-4 rounded-full border border-red-800/60 hover:bg-red-950/40 text-red-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {loadingAction === 'dismiss' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span>{loadingAction === 'dismiss' ? 'Dismissing...' : 'Dismiss as False Positive'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
