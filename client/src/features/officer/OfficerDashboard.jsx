import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertOctagon,
  AlertTriangle,
  Eye,
  ShieldCheck,
  Activity,
  Radio,
  Clock,
  Send,
  UserCheck,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Droplets,
} from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { OfficerRiskMap } from './OfficerRiskMap';
import { RiskZoneDetailPanel } from './RiskZoneDetailPanel';
import { RiskBadge, SensorStatusBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card, CardHeader } from '../../components/common/Card';
import { CardSkeleton } from '../../components/common/Skeleton';
import { formatRelativeTime } from '../../utils/formatters';

export const OfficerDashboard = ({ districtId = 'ALL', onNavigate }) => {
  const { socket, liveActivities, activeSOS, clearSOS } = useSocket();

  const [zones, setZones] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [roads, setRoads] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [reports, setReports] = useState([]);
  const [sosList, setSosList] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastModelUpdate, setLastModelUpdate] = useState('1 min ago');

  const fetchDashboardData = async () => {
    try {
      const [zonesRes, sensorsRes, roadsRes, alertsRes, reportsRes, sosRes] = await Promise.all([
        api.get(`/risk-zones?district=${districtId}`),
        api.get(`/sensors?district=${districtId}`),
        api.get(`/risk-zones/road-segments?district=${districtId}`),
        api.get(`/alerts?district=${districtId}`),
        api.get(`/citizen-reports?district=${districtId}`),
        api.get(`/sos?district=${districtId}`),
      ]);

      if (zonesRes.data.success) setZones(zonesRes.data.data);
      if (sensorsRes.data.success) setSensors(sensorsRes.data.data);
      if (roadsRes.data.success) setRoads(roadsRes.data.data);
      if (alertsRes.data.success) setAlerts(alertsRes.data.data);
      if (reportsRes.data.success) setReports(reportsRes.data.data);
      if (sosRes.data.success) setSosList(sosRes.data.data);

      setLastModelUpdate('Just now');
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [districtId]);

  // Real-time socket event synchronization
  useEffect(() => {
    if (!socket) return;

    const handleDataUpdate = () => {
      fetchDashboardData();
    };

    socket.on('ALERT_CREATED', handleDataUpdate);
    socket.on('ALERT_ESCALATED_TO_DANGER', handleDataUpdate);
    socket.on('ALERT_CONFIRMED_DISPATCHED', handleDataUpdate);
    socket.on('ALERT_DISMISSED_FALSE_POSITIVE', handleDataUpdate);
    socket.on('RISK_ZONE_UPDATED', handleDataUpdate);
    socket.on('SENSOR_STATUS_CHANGED', handleDataUpdate);
    socket.on('CITIZEN_REPORT_SUBMITTED', handleDataUpdate);
    socket.on('FIELD_VERIFICATION_SUBMITTED', handleDataUpdate);
    socket.on('CITIZEN_SOS_TRIGGERED', handleDataUpdate);
    socket.on('DEMO_RESET', handleDataUpdate);

    return () => {
      socket.off('ALERT_CREATED', handleDataUpdate);
      socket.off('ALERT_ESCALATED_TO_DANGER', handleDataUpdate);
      socket.off('ALERT_CONFIRMED_DISPATCHED', handleDataUpdate);
      socket.off('ALERT_DISMISSED_FALSE_POSITIVE', handleDataUpdate);
      socket.off('RISK_ZONE_UPDATED', handleDataUpdate);
      socket.off('SENSOR_STATUS_CHANGED', handleDataUpdate);
      socket.off('CITIZEN_REPORT_SUBMITTED', handleDataUpdate);
      socket.off('FIELD_VERIFICATION_SUBMITTED', handleDataUpdate);
      socket.off('CITIZEN_SOS_TRIGGERED', handleDataUpdate);
      socket.off('DEMO_RESET', handleDataUpdate);
    };
  }, [socket]);

  // Multi-Hazard Summary Metrics
  const dangerAlerts = alerts.filter((a) => a.tier === 'DANGER');
  const pendingAlerts = alerts.filter((a) => a.status === 'PENDING_OFFICER_REVIEW');
  const warningAlerts = alerts.filter((a) => a.tier === 'WARNING');
  const flashFloodAlerts = alerts.filter((a) => a.hazardType === 'FLASH_FLOOD');
  const landslideAlerts = alerts.filter((a) => a.hazardType === 'LANDSLIDE');
  const safeVillages = zones.filter((z) => z.combinedRisk?.tier === 'SAFE');
  const sensorsOnline = sensors.filter((s) => s.status === 'ONLINE').length;

  return (
    <div className="space-y-5 text-[#ededed]">
      {/* High-Priority SOS Distress Emergency Banner if triggered */}
      {activeSOS && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/90 to-[#120808] border border-red-500/60 shadow-[0_0_0_1px_rgba(238,0,0,0.2),0_8px_24px_rgba(238,0,0,0.25)] animate-pulse flex flex-wrap items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-red-400 animate-ping shrink-0" />
            <div>
              <span className="font-bold text-sm uppercase tracking-wider block text-red-200">
                🚨 LIVE CITIZEN SOS DISTRESS BEACON ACTIVE
              </span>
              <p className="text-xs text-red-300 font-mono">
                Citizen: <strong>{activeSOS.citizenName}</strong> ({activeSOS.citizenPhone}) · Village: <strong>{activeSOS.villageName}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-neutral-900 border border-red-500/50 hover:bg-neutral-800 text-white transition-all cursor-pointer"
              onClick={() => {
                if (activeSOS.location?.coordinates) {
                  setSelectedZone({
                    name: `SOS Location: ${activeSOS.villageName}`,
                    districtName: activeSOS.districtId === 'DH' ? 'Dima Hasao' : 'East Khasi Hills',
                    stateName: 'NER Region',
                    location: activeSOS.location,
                    populationEstimate: 500,
                    combinedRisk: { tier: 'DANGER', score: 98, confidence: 99, susceptibilityContribution: 50, triggerContribution: 50 },
                    susceptibility: { score: 80, slopeAngle: 40, distanceToMiningSiteKm: 1.5 },
                    currentTelemetry: { rainfall24h: 120, soilMoisture: 88, slopeMovementMm: 4 },
                  });
                }
              }}
            >
              Zoom to SOS Marker
            </button>
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-red-600 hover:bg-red-500 text-white transition-all cursor-pointer"
              onClick={clearSOS}
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* KPI SUMMARY CARDS (Multi-Hazard Stacked Elevation Metric Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Critical KPI: Active Danger */}
        <div
          onClick={() => onNavigate && onNavigate('alerts')}
          className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
            dangerAlerts.length > 0
              ? 'border-red-500/30 shadow-[0_0_0_1px_rgba(238,0,0,0.18),0_4px_12px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#140b0b] to-[#0a0a0a]'
              : 'bg-[#0a0a0a] border-neutral-800 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-red-400 font-mono font-medium mb-1.5">
            <span>Danger Alerts</span>
            <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
          </div>
          <span className="text-3xl font-bold font-mono text-white block tracking-tight">
            {dangerAlerts.length}
          </span>
          <span className="text-[10px] text-neutral-500 font-mono block mt-1">High Confidence Hazard</span>
        </div>

        {/* Critical KPI: Pending Officer Verification */}
        <div
          onClick={() => onNavigate && onNavigate('alerts')}
          className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
            pendingAlerts.length > 0
              ? 'border-amber-500/30 shadow-[0_0_0_1px_rgba(245,166,35,0.15),0_4px_12px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#141009] to-[#0a0a0a]'
              : 'bg-[#0a0a0a] border-neutral-800 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-400 font-mono font-medium mb-1.5">
            <span>Pending Review</span>
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-3xl font-bold font-mono text-amber-300 block tracking-tight">
            {pendingAlerts.length}
          </span>
          <span className="text-[10px] text-neutral-500 font-mono block mt-1">Awaiting Confirmation</span>
        </div>

        {/* Fix 2: Dedicated Flash Flood KPI */}
        <div
          onClick={() => onNavigate && onNavigate('alerts')}
          className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
            flashFloodAlerts.length > 0
              ? 'border-sky-500/30 shadow-[0_0_0_1px_rgba(14,165,233,0.15),0_4px_12px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#081523] to-[#0a0a0a]'
              : 'bg-[#0a0a0a] border-neutral-800 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-sky-400 font-mono font-medium mb-1.5">
            <span>Flash Flood Alerts</span>
            <Droplets className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <span className="text-3xl font-bold font-mono text-sky-300 block tracking-tight">
            {flashFloodAlerts.length}
          </span>
          <span className="text-[10px] text-sky-400/80 font-mono block mt-1">SCS-CN Inundation active</span>
        </div>

        {/* Supporting KPI: Warning Tier */}
        <div
          onClick={() => onNavigate && onNavigate('alerts')}
          className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)] cursor-pointer hover:border-neutral-700 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-orange-400 font-mono font-medium mb-1.5">
            <span>Warning Alerts</span>
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <span className="text-3xl font-bold font-mono text-white block tracking-tight">
            {warningAlerts.length}
          </span>
          <span className="text-[10px] text-neutral-500 font-mono block mt-1">Landslide & Flood</span>
        </div>

        {/* Supporting KPI: Safe Villages */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-mono font-medium mb-1.5">
            <span>Safe Villages</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-3xl font-bold font-mono text-emerald-400 block tracking-tight">
            {safeVillages.length}
          </span>
          <span className="text-[10px] text-neutral-500 font-mono block mt-1">Normal Baseline</span>
        </div>

        {/* Secondary KPI: Sensors Online */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-mono font-medium mb-1.5">
            <span>Sensors Online</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-3xl font-bold font-mono text-white block tracking-tight">
            {sensorsOnline} <span className="text-xs text-neutral-500 font-normal">/ {sensors.length}</span>
          </span>
          <span className="text-[10px] text-neutral-500 font-mono block mt-1">Freshness: ~18s</span>
        </div>
      </div>

      {/* MAIN OPERATIONAL WORKSPACE: 60% Dominant GIS Map + Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Dominant GIS Map (~60% workspace) */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400" />
              Live GIS Command Center Map
            </h3>
            <span className="text-xs text-neutral-400 font-mono">
              Click any village marker to inspect causal explainability
            </span>
          </div>

          <div className="h-[540px] w-full relative rounded-2xl overflow-hidden border border-neutral-800 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_4px_12px_rgba(0,0,0,0.5)]">
            <OfficerRiskMap
              zones={zones}
              sensors={sensors}
              roads={roads}
              reports={reports}
              sosList={sosList}
              selectedZone={selectedZone}
              onSelectZone={(zone) => setSelectedZone(zone)}
              districtId={districtId}
            />
          </div>
        </div>

        {/* Side Panel: Detail Inspector OR Live Feeds (~40%) */}
        <div className="lg:col-span-4 space-y-4">
          {selectedZone ? (
            <RiskZoneDetailPanel
              zone={selectedZone}
              onClose={() => setSelectedZone(null)}
              onRequestVerification={(zone) => {
                if (onNavigate) onNavigate('alerts');
              }}
              onGenerateAlert={(zone) => {
                if (onNavigate) onNavigate('alerts');
              }}
            />
          ) : (
            <>
              {/* Live Alerts Queue Panel */}
              <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-sky-400" />
                    Priority Alerts Feed ({alerts.length})
                  </h4>
                  <button
                    onClick={() => onNavigate && onNavigate('alerts')}
                    className="text-[11px] font-mono text-sky-400 hover:text-sky-300 font-medium flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Verification Hub</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {alerts.slice(0, 4).map((a) => {
                    const isFlood = a.hazardType === 'FLASH_FLOOD';
                    return (
                      <div
                        key={a._id}
                        onClick={() => onNavigate && onNavigate('alerts')}
                        className={`p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                          a.status === 'PENDING_OFFICER_REVIEW'
                            ? 'bg-amber-950/20 border-amber-500/30 hover:bg-amber-950/40'
                            : isFlood
                            ? 'bg-[#06121e]/70 border-sky-800/40 hover:bg-sky-950/40'
                            : 'bg-[#060606] border-neutral-850 hover:bg-neutral-900/60'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <RiskBadge tier={a.tier} confidence={a.confidencePct} size="sm" />
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                                isFlood
                                  ? 'bg-sky-950 text-sky-300 border-sky-500/40'
                                  : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                              }`}
                            >
                              {isFlood ? '🌊 FLOOD' : '⛰️ LANDSLIDE'}
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {formatRelativeTime(a.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-xs text-neutral-100 truncate">{a.villageName}</div>
                          {isFlood && a.floodExtentSqKm && (
                            <span className="text-[10px] text-cyan-400 font-mono font-bold shrink-0">
                              {a.floodExtentSqKm} km²
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 truncate mt-0.5 font-mono">
                          {a.contributingSources?.[0] || 'Multi-hazard sensor trigger'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Real-Time Live Activity Feed */}
              <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Live Activity Stream
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 font-medium">
                    REAL-TIME
                  </span>
                </div>

                <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1 text-xs">
                  {liveActivities.map((act) => (
                    <div key={act.id} className="flex items-start gap-2.5 text-neutral-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0070f3] shrink-0 mt-1.5" />
                      <div className="flex-1">
                        <p className="text-[11px] text-neutral-300 leading-snug">{act.text}</p>
                        <span className="text-[10px] text-neutral-500 font-mono">{act.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
