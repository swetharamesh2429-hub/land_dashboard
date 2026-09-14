import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Camera,
  MapPin,
  Radio,
  Compass,
  Clock,
  ArrowRight,
  Globe,
  UploadCloud,
  CheckCircle2,
  PhoneCall,
  Sparkles,
  RefreshCw,
  Trash2,
  RotateCcw,
  Navigation,
  Image as ImageIcon,
  Crosshair,
  Lock,
  Bell,
  BellRing,
} from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  queueOfflineReport,
  getOfflineReportsQueue,
  compressImage,
  syncOfflineReports,
} from '../../utils/offlineSync';
import { Button } from '../../components/common/Button';
import { LiveIndicator } from '../../components/common/LiveIndicator';
import { formatRelativeTime } from '../../utils/formatters';
import { registerServiceWorker, requestAndSubscribeWebPush } from '../../utils/pushNotifications';

const POPUP_CONFIG = {
  className: 'raksha-popup',
  closeButton: true,
  autoPan: true,
  autoPanPaddingTopLeft: [20, 20],
  autoPanPaddingBottomRight: [20, 20],
  keepInView: true,
  maxHeight: 400,
};

export const CitizenHome = () => {
  const { user, isGuest } = useAuth();
  const { socket, dangerAlertBroadcast } = useSocket();
  const { t, lang, changeLanguage, languages } = useLanguage();

  const [selectedVillage, setSelectedVillage] = useState(user?.citizenDetails?.village || 'Sohra');
  const [villageData, setVillageData] = useState(null);
  const [villageAlerts, setVillageAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & sub-views
  const [viewMode, setViewMode] = useState('HOME'); // HOME, REPORT, MAP, SOS
  const [sosConfirmOpen, setSosConfirmOpen] = useState(false);
  const [sosDispatched, setSosDispatched] = useState(false);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestModalAction, setGuestModalAction] = useState('SOS'); // SOS or REPORT
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [pushStatus, setPushStatus] = useState('DEFAULT'); // DEFAULT, GRANTED, DENIED, ENABLING

  // Issue report form state
  const [repCategory, setRepCategory] = useState('CRACK_LANDSLIDE_SIGN');
  const [repDescription, setRepDescription] = useState('');
  const [repPhotoBase64, setRepPhotoBase64] = useState('');
  const [repPhotoFile, setRepPhotoFile] = useState(null);
  const [repCoordinates, setRepCoordinates] = useState([91.7324, 25.2986]); // [lon, lat]
  const [gpsStatus, setGpsStatus] = useState('DEFAULT'); // DEFAULT, ACQUIRING, ACQUIRED, FAILED
  const [repSubmitting, setRepSubmitting] = useState(false);
  const [repSuccessMsg, setRepSuccessMsg] = useState(null);

  const fileInputRef = useRef(null);

  // Initialize Service Worker & Push Notification Permission state
  useEffect(() => {
    registerServiceWorker();
    if ('Notification' in window) {
      if (Notification.permission === 'granted') setPushStatus('GRANTED');
      else if (Notification.permission === 'denied') setPushStatus('DENIED');
    }
  }, []);

  const handleEnablePush = async () => {
    setPushStatus('ENABLING');
    const res = await requestAndSubscribeWebPush({
      villageName: villageData?.name || selectedVillage,
      role: 'CITIZEN',
    });
    if (res.success) {
      setPushStatus('GRANTED');
    } else {
      setPushStatus(Notification?.permission === 'denied' ? 'DENIED' : 'DEFAULT');
    }
  };

  const fetchVillageStatus = async () => {
    try {
      const res = await api.get('/risk-zones');
      if (res.data.success) {
        const found =
          res.data.data.find((z) =>
            z.name.toLowerCase().includes(selectedVillage.toLowerCase())
          ) || res.data.data[0];
        setVillageData(found);
        if (found?.location?.coordinates) {
          setRepCoordinates(found.location.coordinates);
        }
      }

      const alertRes = await api.get('/alerts');
      if (alertRes.data.success) {
        const relevant = alertRes.data.data.filter((a) =>
          a.villageName.toLowerCase().includes(selectedVillage.toLowerCase())
        );
        setVillageAlerts(relevant);
      }
    } catch (err) {
      console.error('Failed to load citizen data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVillageStatus();
    setOfflineQueueCount(getOfflineReportsQueue().length);
  }, [selectedVillage]);

  // Real-time updates for citizen alert pushes & online sync listener
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchVillageStatus();
    socket.on('ALERT_CONFIRMED_DISPATCHED', handleUpdate);
    socket.on('EMERGENCY_DANGER_BROADCAST', handleUpdate);
    socket.on('RISK_ZONE_UPDATED', handleUpdate);
    socket.on('DEMO_RESET', handleUpdate);

    // Online auto-sync handler
    const handleOnline = async () => {
      const res = await syncOfflineReports(api);
      if (res.syncedCount > 0) {
        setOfflineQueueCount(getOfflineReportsQueue().length);
        fetchVillageStatus();
      }
    };
    window.addEventListener('online', handleOnline);

    return () => {
      socket.off('ALERT_CONFIRMED_DISPATCHED', handleUpdate);
      socket.off('EMERGENCY_DANGER_BROADCAST', handleUpdate);
      socket.off('RISK_ZONE_UPDATED', handleUpdate);
      socket.off('DEMO_RESET', handleUpdate);
      window.removeEventListener('online', handleOnline);
    };
  }, [socket]);

  // Acquire Real GPS coordinates
  const acquireDeviceGPS = () => {
    if ('geolocation' in navigator) {
      setGpsStatus('ACQUIRING');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [Number(pos.coords.longitude.toFixed(5)), Number(pos.coords.latitude.toFixed(5))];
          setRepCoordinates(coords);
          setGpsStatus('ACQUIRED');
        },
        (err) => {
          console.warn('Geolocation failed or denied, using village default:', err.message);
          setGpsStatus('FAILED');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  // Open Google Maps Directions in new tab with Citizen GPS as origin and Shelter as destination
  const openShelterDirections = (shelterCoords) => {
    const citizenLat = repCoordinates?.[1] || 25.2986;
    const citizenLng = repCoordinates?.[0] || 91.7324;
    const sLat = shelterCoords ? shelterCoords[1] : (villageData?.nearestShelter?.coordinates ? villageData.nearestShelter.coordinates[1] : (citizenLat + 0.007));
    const sLng = shelterCoords ? shelterCoords[0] : (villageData?.nearestShelter?.coordinates ? villageData.nearestShelter.coordinates[0] : (citizenLng + 0.006));
    const url = `https://www.google.com/maps/dir/?api=1&origin=${citizenLat},${citizenLng}&destination=${sLat},${sLng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Handle file capture/selection
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRepPhotoFile(file);
    // Auto-acquire GPS on photo capture
    acquireDeviceGPS();

    try {
      const compressed = await compressImage(file, 1000, 0.75);
      setRepPhotoBase64(compressed);
    } catch (err) {
      console.error('Photo compression failed:', err);
    }
  };

  const handleRemovePhoto = () => {
    setRepPhotoBase64('');
    setRepPhotoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // SOS Trigger
  const handleTriggerSOS = async () => {
    setSosConfirmOpen(false);
    try {
      await api.post('/sos', {
        citizenName: user?.name || 'Village Resident',
        citizenPhone: user?.phone || 'Citizen App',
        villageName: villageData?.name || selectedVillage,
        districtId: villageData?.districtId || 'EKH',
        coordinates: repCoordinates || villageData?.location?.coordinates || [91.7324, 25.2986],
        emergencyType: 'IMMINENT_LANDSLIDE_TRAP_CITIZEN',
      });
      setSosDispatched(true);
    } catch (err) {
      console.error('SOS failed:', err);
    }
  };

  // Submit Citizen Report (Offline Capable with real GPS & photo base64)
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setRepSubmitting(true);

    const payload = {
      villageName: villageData?.name || selectedVillage,
      districtId: villageData?.districtId || 'EKH',
      districtName: villageData?.districtName || 'East Khasi Hills',
      category: repCategory,
      description: repDescription,
      photoUrl: repPhotoBase64 || '',
      coordinates: repCoordinates,
      reporterName: user?.name || 'Village Resident',
      reporterPhone: user?.phone || 'Citizen App',
    };

    try {
      if (navigator.onLine) {
        await api.post('/citizen-reports', payload);
        setRepSuccessMsg('Ground report submitted and received by District EOC!');
      } else {
        queueOfflineReport(payload);
        setOfflineQueueCount(getOfflineReportsQueue().length);
        setRepSuccessMsg('Saved offline! Report will auto-sync as soon as cellular signal returns.');
      }
      setRepDescription('');
      handleRemovePhoto();
    } catch (err) {
      queueOfflineReport(payload);
      setOfflineQueueCount(getOfflineReportsQueue().length);
      setRepSuccessMsg('Network unavailable — report safely queued in offline storage.');
    } finally {
      setRepSubmitting(false);
    }
  };

  const handleFeedback = async (isAccurate) => {
    if (villageAlerts.length > 0) {
      try {
        await api.post(`/alerts/${villageAlerts[0]._id}/citizen-feedback`, { isAccurate });
        setFeedbackGiven(true);
      } catch (e) {
        console.warn(e);
        setFeedbackGiven(true);
      }
    } else {
      setFeedbackGiven(true);
    }
  };

  const currentTier = villageData?.combinedRisk?.tier || 'SAFE';
  const isDanger = currentTier === 'DANGER' || dangerAlertBroadcast?.tier === 'DANGER';
  const latestAlert = villageAlerts[0] || null;
  const isFloodAlert =
    latestAlert?.hazardType === 'FLASH_FLOOD' ||
    dangerAlertBroadcast?.hazardType === 'FLASH_FLOOD' ||
    ((villageData?.combinedRisk?.flashFloodScore || 0) >= 45 &&
      (villageData?.combinedRisk?.flashFloodScore || 0) >= (villageData?.combinedRisk?.landslideScore || 0));

  return (
    <div className="min-h-screen text-neutral-900 font-sans antialiased pb-20 select-none">
      {/* Top Daylight Header with Language Switcher */}
      <header className="bg-white/95 backdrop-blur-md border-b border-sky-100/60 sticky top-0 z-30 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#e6f1fb] border border-sky-100 flex items-center justify-center text-sky-600 shadow-xs">
              <ShieldAlert className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight leading-none">
                {t('appName')}
              </h1>
              <div className="relative overflow-hidden inline-flex items-center px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200/70 mt-1 shadow-2xs">
                {/* Full-width continuous scanning line */}
                <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden pointer-events-none" aria-hidden="true">
                  <div className="h-full bg-gradient-to-r from-transparent via-sky-500 to-transparent animate-radar-scan opacity-80 shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
                </div>
                <span className="text-[10px] sm:text-xs font-mono text-sky-700 font-bold uppercase tracking-wider relative z-10">
                  {t('appSub')}
                </span>
              </div>
            </div>
          </div>

          {/* Header Controls: Vivid LIVE Indicator & Regional Language Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LiveIndicator showLabel={true} />

            <div className="flex items-center gap-1.5 bg-[#e6f1fb]/80 px-3 py-1.5 rounded-full border border-sky-100 shadow-xs">
              <Globe className="w-3.5 h-3.5 text-sky-600" />
              <select
                value={lang}
                onChange={(e) => changeLanguage(e.target.value)}
                className="bg-transparent text-xs font-semibold text-neutral-800 focus:outline-none cursor-pointer"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.native}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* GUEST ACCESS TOP NOTIFICATION BAR */}
      {(isGuest || user?.isGuest) && (
        <div className="bg-neutral-900 text-neutral-200 px-4 py-2.5 text-xs border-b border-neutral-800 flex flex-wrap items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-mono font-semibold border border-white/20 text-[10px] tracking-wider uppercase">
              Guest View
            </span>
            <span className="text-neutral-300 text-xs">
              Public Read-Only Mode — Sign in for full Emergency SOS, Ground Reporting, and Personalized Alerts.
            </span>
          </div>
          <Link
            to="/login"
            className="px-3.5 py-1 bg-white hover:bg-neutral-100 text-neutral-900 rounded-full text-xs font-bold transition-colors shrink-0 shadow-xs"
          >
            Sign In →
          </Link>
        </div>
      )}

      {/* WEB PUSH EMERGENCY ALERTS ONBOARDING BANNER (Item 4) */}
      {pushStatus !== 'GRANTED' && pushStatus !== 'DENIED' && (
        <div className="bg-neutral-900 text-white px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            <span className="text-neutral-200">
              <strong className="text-white">Emergency Push Alerts:</strong> Receive disaster warnings even when this browser is closed.
            </span>
          </div>
          <button
            type="button"
            onClick={handleEnablePush}
            disabled={pushStatus === 'ENABLING'}
            className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold rounded-full text-xs transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            {pushStatus === 'ENABLING' ? 'Enabling...' : '🔔 Enable Lockscreen Alerts'}
          </button>
        </div>
      )}

      {/* Offline Queue Indicator if any items stored */}
      {offlineQueueCount > 0 && (
        <div className="bg-amber-400 text-neutral-950 px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-inner">
          <UploadCloud className="w-4 h-4 animate-bounce" />
          <span>
            {offlineQueueCount} {t('offlineSyncPending')}
          </span>
        </div>
      )}

      {/* DYNAMIC EMERGENCY STATE BANNER (DANGER, WARNING, WATCH) */}
      {currentTier === 'DANGER' && (
        <div className="bg-red-600 text-white px-4 py-4 shadow-md border-b-2 border-red-700 animate-in fade-in">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="flex items-center gap-2 font-black text-sm sm:text-base uppercase tracking-wider">
              <AlertOctagon className="w-6 h-6 animate-bounce shrink-0" />
              <span>{isFloodAlert ? 'CRITICAL HAZARD WARNING: IMMINENT FLASH FLOOD RISK' : t('dangerBanner')}</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold bg-red-700/80 px-3.5 py-2 rounded-xl border border-red-400/40 leading-relaxed">
              {t('actionRequired')}: {isFloodAlert ? 'Move to higher ground immediately; stay away from river valleys, streams, and culverts.' : t('shelterInstruction')}
            </p>
            {villageData?.nearestShelter && (
              <div className="text-xs bg-red-950/60 p-3.5 rounded-2xl border border-red-400/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="space-y-0.5">
                  <span className="text-red-200 block text-[11px] font-mono uppercase tracking-wider">{t('nearestShelter')} (Higher Ground)</span>
                  <strong className="text-white text-sm block font-bold">{villageData.nearestShelter.name}</strong>
                  <span className="text-xs text-red-200 font-mono block">
                    Distance: {villageData.nearestShelter.distanceKm} km from village center
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openShelterDirections(villageData?.nearestShelter?.coordinates)}
                    className="bg-white text-neutral-900 hover:bg-neutral-100 font-bold px-4 py-2 rounded-full text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Compass className="w-4 h-4 text-neutral-700 shrink-0" />
                    <span>Get Directions</span>
                  </button>
                  <Button
                    size="sm"
                    variant="danger"
                    className="bg-red-500 hover:bg-red-400 text-white border border-red-400 font-extrabold rounded-full px-4 shadow-sm"
                    onClick={() => {
                      if (isGuest || user?.isGuest) {
                        setGuestModalAction('SOS');
                        setGuestModalOpen(true);
                      } else {
                        setSosConfirmOpen(true);
                      }
                    }}
                  >
                    {t('sosButton')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {currentTier === 'WARNING' && (
        <div className="bg-amber-600 text-white px-4 py-3.5 shadow-md border-b-2 border-amber-700 animate-in fade-in">
          <div className="max-w-2xl mx-auto space-y-2.5">
            <div className="flex items-center gap-2 font-extrabold text-sm sm:text-base uppercase tracking-wider">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-200 animate-pulse" />
              <span>{isFloodAlert ? 'HIGH HAZARD WARNING: FLASH FLOOD RUNOFF RISK' : t('warningBanner')}</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold bg-amber-700/80 px-3 py-1.5 rounded-xl border border-amber-400/40 leading-relaxed">
              {isFloodAlert ? 'Caution: Heavy runoff potential. Avoid low-lying river corridors and prepare to evacuate to higher ground.' : t('warningInstruction')}
            </p>
            {villageData?.nearestShelter && (
              <div className="text-xs bg-amber-950/60 p-2.5 rounded-xl border border-amber-400/40 flex items-center justify-between gap-2">
                <div>
                  <span className="text-amber-200 text-[11px] font-mono uppercase tracking-wider block">{t('nearestShelter')}</span>
                  <strong className="text-white text-xs">{villageData.nearestShelter.name} ({villageData.nearestShelter.distanceKm} km)</strong>
                </div>
                <button
                  onClick={() => openShelterDirections(villageData?.nearestShelter?.coordinates)}
                  className="bg-white text-neutral-900 hover:bg-neutral-100 font-bold px-3 py-1.5 rounded-full text-xs flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Directions</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {currentTier === 'WATCH' && (
        <div className="bg-amber-400 text-neutral-950 px-4 py-3 shadow-sm border-b border-amber-500 animate-in fade-in">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-neutral-900 shrink-0" />
              <div>
                <span className="font-extrabold text-xs sm:text-sm block">{t('watchBanner')}</span>
                <span className="text-[11px] font-medium text-neutral-800 block">{t('watchInstruction')}</span>
              </div>
            </div>
            <button
              onClick={() => setViewMode('MAP')}
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold px-3.5 py-1.5 rounded-full text-xs shrink-0 transition-colors cursor-pointer"
            >
              View Map
            </button>
          </div>
        </div>
      )}

      {/* Main Standardized Content Wrapper (Section 3) */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Village Locality Selector */}
        <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl shadow-md border border-sky-100/40 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#e6f1fb] flex items-center justify-center text-sky-600 shrink-0">
              <MapPin className="w-4 h-4 text-sky-600" />
            </div>
            <span className="font-semibold text-neutral-800">Area / Village:</span>
          </div>
          <select
            value={selectedVillage}
            onChange={(e) => setSelectedVillage(e.target.value)}
            className="font-bold text-neutral-900 bg-[#e6f1fb]/60 px-3.5 py-1.5 rounded-full border border-sky-100 text-xs sm:text-sm focus:outline-none cursor-pointer"
          >
            <option value="Sohra">Sohra (Cherrapunji)</option>
            <option value="Mawlynnong">Mawlynnong</option>
            <option value="Mawkynrew">Mawkynrew</option>
            <option value="Pynursla">Pynursla</option>
            <option value="Haflong">Haflong Ridge (Assam)</option>
            <option value="Umrangso">Umrangso (Assam)</option>
          </select>
        </div>

        {/* PRIMARY "MY AREA RISK" HERO CARD (Part A Section 23) */}
        <div
          className={`p-6 sm:p-7 rounded-2xl border-2 transition-all shadow-md bg-white ${
            isDanger
              ? 'border-red-500'
              : currentTier === 'WARNING'
              ? 'border-amber-500'
              : currentTier === 'WATCH'
              ? 'border-yellow-500'
              : 'border-emerald-500'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-500 font-mono">
              {t('myAreaRisk')}
            </span>
            <span className="text-xs font-mono text-neutral-400">
              {t('lastUpdated')}: {formatRelativeTime(villageData?.combinedRisk?.lastEvaluated)}
            </span>
          </div>

          <div className="my-4 flex items-center justify-between gap-4">
            <div>
              <span
                className={`text-3xl sm:text-4xl font-black uppercase tracking-tight block ${
                  isDanger
                    ? 'text-red-600'
                    : currentTier === 'WARNING'
                    ? 'text-amber-600'
                    : currentTier === 'WATCH'
                    ? 'text-yellow-600'
                    : 'text-emerald-600'
                }`}
              >
                {currentTier === 'DANGER'
                  ? '🔴 DANGER'
                  : currentTier === 'WARNING'
                  ? '🟠 WARNING'
                  : currentTier === 'WATCH'
                  ? '🟡 WATCH'
                  : '🟢 SAFE'}
              </span>
              <span className="text-sm sm:text-base font-semibold text-neutral-700 mt-1 block">
                {isDanger
                  ? 'Imminent Hazard Alert Active'
                  : currentTier === 'WARNING'
                  ? 'High Hazard Probability'
                  : currentTier === 'WATCH'
                  ? 'Heightened Monitoring'
                  : t('safeDesc')}
              </span>
            </div>

            <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[#e6f1fb] shadow-sm border border-sky-100 shrink-0">
              {isDanger ? (
                <AlertOctagon className="w-8 h-8 text-red-600 animate-pulse" />
              ) : currentTier === 'WARNING' ? (
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              ) : (
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-neutral-100 text-xs sm:text-sm">
            <div className="bg-[#f8fbff] p-3.5 rounded-xl border border-sky-100/60 shadow-xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#e6f1fb] flex items-center justify-center text-sky-600 shrink-0">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <span className="text-neutral-500 block text-xs font-medium">24h Rain</span>
                <strong className="text-neutral-900 text-sm sm:text-base font-bold font-mono">
                  {villageData?.currentTelemetry?.rainfall24h || 20} mm
                </strong>
              </div>
            </div>
            <div className="bg-[#f8fbff] p-3.5 rounded-xl border border-sky-100/60 shadow-xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#e6f1fb] flex items-center justify-center text-sky-600 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-neutral-500 block text-xs font-medium">Confidence</span>
                <strong className="text-neutral-900 text-sm sm:text-base font-bold font-mono">
                  {villageData?.combinedRisk?.confidence || 85}%
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS ROW: Report / Map / SOS */}
        <div className="grid grid-cols-3 gap-3.5">
          <button
            onClick={() => {
              if (isGuest || user?.isGuest) {
                setGuestModalAction('REPORT');
                setGuestModalOpen(true);
              } else {
                setViewMode(viewMode === 'REPORT' ? 'HOME' : 'REPORT');
              }
            }}
            className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all text-center cursor-pointer ${
              viewMode === 'REPORT'
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-md'
                : 'bg-white hover:bg-sky-50/50 text-neutral-900 border-sky-100/40 shadow-md group'
            }`}
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center ${viewMode === 'REPORT' ? 'bg-white/20 text-white' : 'bg-[#e6f1fb] text-sky-600'}`}>
              <Camera className="w-6 h-6" />
            </div>
            <span className="text-xs sm:text-sm font-bold">{t('reportHazard')}</span>
          </button>

          <button
            onClick={() => setViewMode(viewMode === 'MAP' ? 'HOME' : 'MAP')}
            className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all text-center cursor-pointer ${
              viewMode === 'MAP'
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-md'
                : 'bg-white hover:bg-sky-50/50 text-neutral-900 border-sky-100/40 shadow-md group'
            }`}
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center ${viewMode === 'MAP' ? 'bg-white/20 text-white' : 'bg-[#e6f1fb] text-sky-600'}`}>
              <Compass className="w-6 h-6" />
            </div>
            <span className="text-xs sm:text-sm font-bold">{t('publicMap')}</span>
          </button>

          <button
            onClick={() => {
              if (isGuest || user?.isGuest) {
                setGuestModalAction('SOS');
                setGuestModalOpen(true);
              } else {
                setSosConfirmOpen(true);
              }
            }}
            className="p-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white border border-red-700 shadow-lg shadow-red-600/30 flex flex-col items-center justify-center gap-2 text-center cursor-pointer active:scale-95 transition-all font-black tracking-wide"
          >
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-white">
              <Radio className="w-6 h-6 text-white animate-pulse" />
            </div>
            <span className="text-xs sm:text-sm font-black tracking-wider">{t('sosButton')}</span>
          </button>
        </div>

        {/* REPORT HAZARD SUB-VIEW */}
        {viewMode === 'REPORT' && (
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-md border border-sky-100/40 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#e6f1fb] flex items-center justify-center text-sky-600 shrink-0">
                  <Camera className="w-4 h-4 text-sky-600" />
                </div>
                <h3 className="text-base font-bold text-neutral-900">
                  {t('submitReport')}
                </h3>
              </div>
              <button
                onClick={() => setViewMode('HOME')}
                className="text-xs text-neutral-500 hover:text-neutral-800 font-bold px-3 py-1 rounded-full bg-[#f8fbff] hover:bg-neutral-100 border border-sky-100/80 transition-colors"
              >
                ✕ Close
              </button>
            </div>

            {repSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                <span>{repSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReport} className="space-y-4 text-xs sm:text-sm">
              {/* Category */}
              <div>
                <label className="block text-neutral-700 font-bold mb-1.5">{t('category')}</label>
                <select
                  value={repCategory}
                  onChange={(e) => setRepCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f8fbff] border border-sky-100/80 rounded-xl text-neutral-900 font-semibold text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-sky-500"
                >
                  <option value="CRACK_LANDSLIDE_SIGN">{t('crackSign')}</option>
                  <option value="RISING_WATER">{t('risingWater')}</option>
                  <option value="BLOCKED_ROAD">{t('blockedRoad')}</option>
                  <option value="OTHER">{t('otherIssue')}</option>
                </select>
              </div>

              {/* REAL PHOTO / VIDEO FILE CAPTURE (Mobile Camera Direct Trigger) */}
              <div>
                <label className="block text-neutral-700 font-bold mb-1.5">
                  {t('photoUpload')} (Camera / Gallery)
                </label>

                {/* Hidden Real File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                  id="citizen-photo-capture"
                />

                {!repPhotoBase64 ? (
                  <label
                    htmlFor="citizen-photo-capture"
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-sky-200/80 hover:border-sky-400 bg-[#f8fbff] hover:bg-[#eef4ff] rounded-2xl cursor-pointer transition-colors text-center group"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#e6f1fb] border border-sky-100 flex items-center justify-center text-sky-600 mb-2 group-hover:scale-110 transition-transform shadow-xs">
                      <Camera className="w-6 h-6 text-sky-600" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-neutral-900 block">
                      Tap to Open Camera or Choose Photo
                    </span>
                    <span className="text-[11px] text-neutral-500 mt-0.5">
                      Automatically attaches GPS coordinates & compresses photo
                    </span>
                  </label>
                ) : (
                  <div className="space-y-2">
                    <div className="relative rounded-2xl overflow-hidden border border-sky-100/80 bg-neutral-900 max-h-56">
                      <img
                        src={repPhotoBase64}
                        alt="Captured Hazard Preview"
                        className="w-full h-52 object-cover"
                      />
                      <div className="absolute top-2 right-2 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1 bg-neutral-900/90 hover:bg-neutral-900 text-white rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm backdrop-blur-sm"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retake</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="px-3 py-1 bg-red-600/90 hover:bg-red-600 text-white rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm backdrop-blur-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* READ-ONLY AUTO-CAPTURED GPS COORDINATES (Requirement 3) */}
              <div className="p-3.5 bg-[#f8fbff] rounded-xl border border-sky-100/80 flex items-center justify-between text-xs shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#e6f1fb] flex items-center justify-center text-sky-600 shrink-0">
                    <Crosshair className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold font-mono text-neutral-900 block">
                      Location: {repCoordinates[1]}° N, {repCoordinates[0]}° E
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {gpsStatus === 'ACQUIRED'
                        ? '✓ Auto-detected via Device GPS'
                        : gpsStatus === 'ACQUIRING'
                        ? 'Acquiring GPS precision...'
                        : 'Village centroid coordinates'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={acquireDeviceGPS}
                  className="text-sky-700 hover:text-sky-900 font-semibold underline text-xs cursor-pointer"
                >
                  Refresh GPS
                </button>
              </div>

              {/* Description */}
              <div>
                <label className="block text-neutral-700 font-bold mb-1.5">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Describe where the crack or water overflow was seen..."
                  value={repDescription}
                  onChange={(e) => setRepDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f8fbff] border border-sky-100/80 rounded-xl text-neutral-900 text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={repSubmitting}
                className="w-full py-3 px-4 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white font-bold rounded-full text-xs sm:text-sm shadow-md transition-colors cursor-pointer"
              >
                {repSubmitting ? 'Submitting...' : `${t('submitReport')} (Works Offline)`}
              </button>
            </form>
          </div>
        )}

        {/* PUBLIC MAP SUB-VIEW (Real Read-Only Leaflet Map with Village & Shelter Markers) */}
        {viewMode === 'MAP' && (() => {
          const villageLat = repCoordinates[1] || 25.2986;
          const villageLon = repCoordinates[0] || 91.7324;
          const shelterLat = villageData?.nearestShelter?.coordinates
            ? villageData.nearestShelter.coordinates[1]
            : villageLat + 0.007;
          const shelterLon = villageData?.nearestShelter?.coordinates
            ? villageData.nearestShelter.coordinates[0]
            : villageLon + 0.006;
          
          const tierColors = {
            DANGER: '#EF4444',
            WARNING: '#F97316',
            WATCH: '#EAB308',
            SAFE: '#22C55E',
          };
          const pinColor = tierColors[currentTier] || '#22C55E';

          const villageIcon = L.divIcon({
            className: 'citizen-village-pin',
            html: `<div style="background-color: ${pinColor}; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px ${pinColor}90; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">📍</div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });

          const shelterIcon = L.divIcon({
            className: 'citizen-shelter-pin',
            html: `<div style="background-color: #059669; width: 24px; height: 24px; border-radius: 6px; border: 2px solid white; box-shadow: 0 0 8px rgba(5,150,105,0.6); display: flex; align-items: center; justify-content: center; color: white; font-size: 13px;">🏠</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          return (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-sky-100/40 shadow-md space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#e6f1fb] flex items-center justify-center text-sky-600 shrink-0">
                    <Compass className="w-4 h-4 text-sky-600" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-900">
                    {t('publicMap')} — {villageData?.name || selectedVillage}
                  </h3>
                </div>
                <button
                  onClick={() => setViewMode('HOME')}
                  className="text-xs text-neutral-500 hover:text-neutral-800 font-bold px-3 py-1 rounded-full bg-[#f8fbff] hover:bg-neutral-100 border border-sky-100/80 transition-colors"
                >
                  ✕ Close Map
                </button>
              </div>

              <p className="text-xs text-neutral-600">
                Live community hazard overview: Village risk status and designated emergency evacuation shelter.
              </p>

              {/* Real OpenStreetMap Leaflet Map */}
              <div className="h-72 sm:h-80 rounded-xl overflow-hidden relative border border-sky-100/60 shadow-inner z-0">
                <MapContainer
                  center={[villageLat, villageLon]}
                  zoom={14}
                  style={{ width: '100%', height: '100%' }}
                  zoomControl={true}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={18}
                  />

                  {/* Evacuation Route Line */}
                  <Polyline
                    positions={[
                      [villageLat, villageLon],
                      [shelterLat, shelterLon],
                    ]}
                    pathOptions={{
                      color: '#059669',
                      weight: 3,
                      dashArray: '6, 6',
                      opacity: 0.8,
                    }}
                  />

                  {/* Village Risk Marker */}
                  <Marker position={[villageLat, villageLon]} icon={villageIcon}>
                    <Popup {...POPUP_CONFIG}>
                      <div className="p-3 text-xs text-neutral-100 space-y-1 bg-slate-900 rounded-xl min-w-[200px]">
                        <div className="pr-7 border-b border-slate-800 pb-1 flex items-center justify-between">
                          <strong className="block text-sm font-bold text-white">{villageData?.name || selectedVillage}</strong>
                          <span
                            className="font-bold px-1.5 py-0.5 rounded text-[11px]"
                            style={{ backgroundColor: `${pinColor}25`, color: pinColor }}
                          >
                            {currentTier}
                          </span>
                        </div>
                        <span className="text-[11px] text-sky-300 block font-mono pt-0.5">
                          Elevation: {villageData?.susceptibility?.elevationMeters || 1430} m (OpenTopography)
                        </span>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Nearest Shelter Marker */}
                  <Marker position={[shelterLat, shelterLon]} icon={shelterIcon}>
                    <Popup {...POPUP_CONFIG}>
                      <div className="p-3 text-xs text-neutral-100 space-y-1.5 min-w-[220px] bg-slate-900 rounded-xl">
                        <div className="pr-7 border-b border-slate-800 pb-1">
                          <strong className="block text-sm font-bold text-emerald-400">
                            🏠 {villageData?.nearestShelter?.name || 'Designated Community Shelter'}
                          </strong>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Primary emergency evacuation shelter for {villageData?.name || selectedVillage}.
                        </p>
                        <div className="font-semibold text-emerald-300 text-[11px]">
                          Distance: {villageData?.nearestShelter?.distanceKm || 1.2} km
                        </div>
                        <button
                          type="button"
                          onClick={() => openShelterDirections([shelterLon, shelterLat])}
                          className="w-full mt-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>Get Directions</span>
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>

              {/* Exact Shelter and GPS Caption Preserved Below Map */}
              <div className="bg-[#f8fbff] p-3.5 rounded-xl border border-sky-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-neutral-900 block">
                    {villageData?.name || selectedVillage}: <strong style={{ color: pinColor }}>{currentTier} Risk Zone</strong>
                  </span>
                  <span className="text-neutral-500 font-mono text-[11px] block">
                    GPS Coordinates: {villageLat}°N, {villageLon}°E
                  </span>
                </div>
                {villageData?.nearestShelter && (
                  <div className="bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded-full border border-emerald-300 font-medium inline-flex items-center gap-2 shrink-0">
                    <span className="text-emerald-700">🏠</span>
                    <span>Shelter: <strong>{villageData.nearestShelter.name}</strong> ({villageData.nearestShelter.distanceKm} km)</span>
                    <button
                      type="button"
                      onClick={() => openShelterDirections([shelterLon, shelterLat])}
                      className="ml-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-0.5 rounded-full text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                    >
                      <Compass className="w-3 h-3" />
                      <span>Directions</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* RECENT ALERTS ADVISORY LIST */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#e6f1fb] flex items-center justify-center text-sky-600 shrink-0">
              <Bell className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-700 font-bold">
              Recent Alerts for {villageData?.name || selectedVillage}
            </h3>
          </div>

          {villageAlerts.length === 0 ? (
            <div className="p-5 rounded-2xl bg-white border border-sky-100/40 shadow-md text-xs sm:text-sm text-neutral-500 text-center">
              No active warnings or advisories for this village.
            </div>
          ) : (
            villageAlerts.map((alt) => {
              const liveRain = villageData?.currentTelemetry?.rainfall24h || 20;
              const isFlood = alt.hazardType === 'FLASH_FLOOD';
              const syncedSources = (alt.contributingSources || []).map((s) =>
                s.replace(/Rainfall.*?\b(\d+)\s*mm/i, `Rainfall (${liveRain} mm`)
              );
              return (
                <div
                  key={alt._id}
                  className={`p-4 sm:p-5 rounded-2xl border shadow-md space-y-2 ${
                    isFlood
                      ? 'bg-gradient-to-b from-[#f0f7ff] to-white border-sky-200/80'
                      : 'bg-white border-sky-100/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                      <span>{isFlood ? '🌊' : '⛰️'}</span>
                      <span>{isFlood ? 'Flash Flood Warning' : 'Landslide Warning'}</span>
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">
                      {formatRelativeTime(alt.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-600">
                    Time Window: <strong className="text-neutral-900">{alt.timeWindow}</strong> · Confidence: <span className="font-mono">{alt.confidencePct}%</span> · 24h Rain: <strong className="text-neutral-900 font-mono">{liveRain} mm</strong>
                  </p>
                  {isFlood && alt.floodExtentSqKm && (
                    <div className="p-2 rounded-xl bg-sky-100/60 border border-sky-200 text-xs text-sky-900 font-medium">
                      🌊 <strong>Estimated Flood Footprint:</strong> {alt.floodExtentSqKm} km² · <em>Move to higher ground immediately; stay away from river channels.</em>
                    </div>
                  )}
                  {syncedSources.length > 0 && (
                    <div className="pt-1 text-[11px] text-neutral-500 space-y-0.5">
                      {syncedSources.map((src, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                          <span>{src}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* CITIZEN ALERT ACCURACY FEEDBACK PROMPT */}
        {!feedbackGiven && (
          <div className="bg-white border border-sky-100/40 p-4 sm:p-5 rounded-2xl space-y-3 shadow-md">
            <span className="text-xs sm:text-sm font-bold text-neutral-900 block">{t('feedbackQuestion')}</span>
            <div className="flex gap-2.5">
              <button
                onClick={() => handleFeedback(true)}
                className="flex-1 py-2.5 px-4 bg-[#0070f3] hover:bg-blue-600 active:bg-blue-700 text-white rounded-full text-xs sm:text-sm font-bold shadow-md transition-colors cursor-pointer"
              >
                {t('accurateYes')}
              </button>
              <button
                onClick={() => handleFeedback(false)}
                className="flex-1 py-2.5 px-4 bg-[#f8fbff] hover:bg-neutral-100 text-neutral-800 border border-sky-100/80 rounded-full text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
              >
                {t('accurateNo')}
              </button>
            </div>
          </div>
        )}

        {feedbackGiven && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs sm:text-sm text-center font-medium shadow-xs">
            ✓ Thank you for ground-truth feedback. Recorded in SDMA AI accuracy model.
          </div>
        )}
      </main>

      {/* GUEST ACTION GATED LOGIN MODAL */}
      {guestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-sm w-full border border-sky-100/40 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-[#e6f1fb] rounded-full flex items-center justify-center mx-auto text-sky-600 border border-sky-100 shadow-xs">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-neutral-900 tracking-tight">
              {guestModalAction === 'SOS' ? 'Emergency SOS Requires Citizen Login' : 'Citizen Account Required'}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              {guestModalAction === 'SOS'
                ? 'To dispatch high-priority SOS distress signals with real-time GPS telemetry to the District EOC, please sign in or register with your verified phone number.'
                : 'Submitting geo-tagged field photos and hazard reports requires an authenticated citizen account for ground verification.'}
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setGuestModalOpen(false)}
                className="flex-1 py-2.5 px-4 text-neutral-700 bg-[#f8fbff] border border-sky-100/80 hover:bg-neutral-100 font-semibold rounded-full text-xs transition-colors cursor-pointer"
              >
                Continue Viewing
              </button>
              <Link
                to="/login"
                className="flex-1 py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-bold shadow-md flex items-center justify-center transition-colors"
              >
                Sign In Now →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* SOS CONFIRMATION MODAL */}
      {sosConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-sm w-full border border-red-200 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 border border-red-200">
              <Radio className="w-7 h-7 animate-ping" />
            </div>
            <h3 className="text-lg font-black text-neutral-900 tracking-tight">CONFIRM EMERGENCY SOS</h3>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">{t('sosConfirmText')}</p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSosConfirmOpen(false)}
                className="flex-1 py-2.5 px-4 text-neutral-700 bg-[#f8fbff] border border-neutral-200 hover:bg-neutral-100 font-semibold rounded-full text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerSOS}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full text-xs shadow-lg shadow-red-600/30 transition-colors cursor-pointer"
              >
                YES, SEND SOS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOS SUCCESS TOAST */}
      {sosDispatched && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto bg-red-600 text-white p-4 rounded-2xl shadow-2xl z-50 flex items-center justify-between gap-3 animate-in slide-in-from-bottom">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            <Radio className="w-5 h-5 animate-spin shrink-0" />
            <span>SOS BEACON ACTIVE — Emergency team & District EOC notified.</span>
          </div>
          <button
            onClick={() => setSosDispatched(false)}
            className="text-white text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
