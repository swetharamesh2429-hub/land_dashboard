import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Shield,
  Lock,
  Phone,
  UserCheck,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Cpu,
  Award,
  Clock,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LightParticleBackground } from '../../components/common/LightParticleBackground';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginAsGuest } = useAuth();

  const [portalRole, setPortalRole] = useState('OFFICER'); // OFFICER, FIELD_OFFICER, CITIZEN
  const [identifier, setIdentifier] = useState('9876543210');
  const [password, setPassword] = useState('Raksha@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(searchParams.get('expired') === '1');
  const [accuracyData, setAccuracyData] = useState(null);

  // Fetch benchmark/test scenario accuracy
  useEffect(() => {
    const fetchAccuracy = async () => {
      try {
        const res = await api.get('/analytics/accuracy');
        if (res.data?.success) {
          setAccuracyData(res.data.data);
        }
      } catch (err) {
        console.warn('Accuracy fetch note on login:', err.message);
      }
    };
    fetchAccuracy();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(identifier, password, portalRole);
      const userRole = data.user.role;

      // Trigger Welcome Toast on destination dashboard
      sessionStorage.setItem(
        'raksha_welcome_toast',
        JSON.stringify({
          name: data.user.name || data.user.identifier || 'Officer',
          role: userRole,
        })
      );

      if (userRole === 'OFFICER' || userRole === 'SUPER_ADMIN') {
        navigate('/officer/dashboard');
      } else if (userRole === 'FIELD_OFFICER') {
        navigate('/field/dashboard');
      } else {
        navigate('/citizen/home');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (role, id, pwd) => {
    setPortalRole(role);
    setIdentifier(id);
    setPassword(pwd);
    setError('');
  };

  const handleGuestAccess = () => {
    loginAsGuest('EKH', 'Sohra');
    navigate('/citizen/home');
  };

  return (
    <div className="min-h-screen text-neutral-900 flex items-center justify-center p-4 sm:p-6 lg:p-10 select-none relative bg-gradient-to-br from-[#deecfc] via-[#eaf2fc] to-[#f5f9ff] overflow-hidden">
      <LightParticleBackground />

      {/* 2-Panel Desktop Container with Standardized Max-Width (1280px) */}
      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        {/* LEFT PANEL: Mission Branding with Directional Faded Landslide Photograph */}
        <div className="lg:col-span-6 space-y-6 pt-2 pb-4 relative rounded-3xl p-6 lg:p-8 overflow-hidden bg-white/50 backdrop-blur-xs border border-sky-100/70 shadow-sm">
          {/* Directional Faded Landslide Photograph (Darker on Left Edge -> Smoothly Dissolving to Transparent on Right Edge) */}
          <div
            className="absolute inset-0 bg-cover bg-left-center pointer-events-none"
            style={{
              backgroundImage: `url('/landslide_hero.jpg')`,
              opacity: 0.18,
              maskImage: 'linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.55) 45%, rgba(0, 0, 0, 0) 100%)',
              WebkitMaskImage: 'linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.55) 45%, rgba(0, 0, 0, 0) 100%)',
            }}
            aria-hidden="true"
          />
          {/* Subtle gradient overlay to guarantee soft dissolution into page background and crisp text contrast */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-white/70 pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 space-y-6">
            {/* Unclipped RAKSHA-NER Shield Logo */}
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-full bg-[#e6f1fb] border border-sky-100 flex items-center justify-center text-sky-600 shadow-xs shrink-0">
                <Shield className="w-8 h-8 text-sky-600" />
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-[-0.6px] block">
                  RAKSHA-NER
                </span>
                <span className="text-xs font-semibold text-sky-600 uppercase tracking-wider font-mono">
                  Disaster Management & Early Warning Platform
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-[-0.6px] leading-snug">
                AI Multi-Hazard Prediction & Emergency Operations Command
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Protecting North East India through continuous sensor telemetry, geological susceptibility modeling, and human-verified early warning dispatches.
              </p>
            </div>

            {/* ILLUSTRATIVE ACCURACY CARD */}
            <div className="p-5 rounded-2xl bg-white/95 shadow-md border border-sky-100/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-xs font-semibold text-neutral-800">
                  <div className="w-7 h-7 rounded-full bg-[#e6f1fb] flex items-center justify-center text-sky-600 shrink-0">
                    <Award className="w-4 h-4 text-sky-600" />
                  </div>
                  <span>Illustrative Scenario Evaluation</span>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  SIMULATED BASELINE
                </span>
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-700 tracking-tight">
                  {accuracyData?.overallAccuracyPct || 84.4}%
                </span>
                <span className="text-xs font-medium text-neutral-600">
                  illustrative accuracy based on synthetic test scenarios
                </span>
              </div>
              <p className="text-[11px] text-neutral-600 leading-relaxed">
                Evaluated across <strong>{accuracyData?.totalAlertsEvaluated || 45} benchmark alerts</strong>. {accuracyData?.confirmedAccurateAlerts || 38} confirmed accurate on the ground with {accuracyData?.falseAlarmsDismissed || 7} false alarms safely filtered.
              </p>
              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-700"
                  style={{ width: `${accuracyData?.overallAccuracyPct || 84.4}%` }}
                />
              </div>
            </div>

            {/* Mission Loop Tagline */}
            <div className="p-4 rounded-2xl bg-white/95 shadow-md border border-sky-100/60 space-y-1.5">
              <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block font-mono">
                Operational Closed-Loop Lifecycle
              </span>
              <div className="text-[11px] font-mono text-neutral-800 font-semibold tracking-wide flex flex-wrap items-center gap-1.5">
                <span className="text-sky-700">SENSE</span> →
                <span className="text-emerald-700">PREDICT</span> →
                <span className="text-amber-700">CONFIRM</span> →
                <span className="text-orange-700">ALERT</span> →
                <span className="text-purple-700">VERIFY</span> →
                <span className="text-red-700">RESPOND</span> →
                <span className="text-sky-700">LEARN</span>
              </div>
            </div>

            {/* Key Platform Capabilities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-white/95 shadow-md border border-sky-100/60 space-y-2">
                <div className="flex items-center gap-2.5 font-semibold text-neutral-900">
                  <div className="w-7 h-7 rounded-full bg-[#e6f1fb] flex items-center justify-center text-sky-600 shrink-0">
                    <Cpu className="w-4 h-4 text-sky-600" />
                  </div>
                  <span>Dual-Layer AI Engine</span>
                </div>
                <p className="text-[11px] text-neutral-600">
                  Separates static susceptibility (mining/NDVI) from dynamic rain triggers.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/95 shadow-md border border-sky-100/60 space-y-2">
                <div className="flex items-center gap-2.5 font-semibold text-neutral-900">
                  <div className="w-7 h-7 rounded-full bg-[#e6f1fb] flex items-center justify-center text-sky-600 shrink-0">
                    <UserCheck className="w-4 h-4 text-sky-600" />
                  </div>
                  <span>Officer Safeguards</span>
                </div>
                <p className="text-[11px] text-neutral-600">
                  Danger alerts held in review queue for field verification to eliminate false sirens.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Secure Authentication Form & One-Click Demo Credentials */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-sky-100/50 space-y-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-[-0.6px]">
                Portal Authentication
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Select your designated role to enter the operational command center
              </p>
            </div>

            {sessionExpiredNotice && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-2.5 text-amber-800 text-xs animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Your session has expired, please log in again.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSessionExpiredNotice(false)}
                  className="text-amber-700 hover:text-amber-900 text-xs font-semibold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-800 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Portal Selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Operational Portal
                </label>
                <select
                  value={portalRole}
                  onChange={(e) => setPortalRole(e.target.value)}
                  className="block w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  <option value="OFFICER">District / State Disaster Officer (Control Room)</option>
                  <option value="FIELD_OFFICER">Field Officer (Ground Verification / Inspection)</option>
                  <option value="CITIZEN">Citizen (Village Resident / Public)</option>
                </select>
              </div>

              {/* Login Identifier */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Phone Number or Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs sm:text-sm placeholder-neutral-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[11px] text-sky-700 hover:text-sky-900 font-semibold transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-10 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs sm:text-sm placeholder-neutral-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-full bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Enter Operational Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Credentials - Differentiated Tints */}
            <div className="pt-4 border-t border-neutral-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-sky-700 font-semibold font-mono">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>One-Click Demo Credentials:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Officer Cards - Light Blue Tint */}
                <button
                  type="button"
                  onClick={() => setDemoCredentials('OFFICER', '9876543210', 'Raksha@2026')}
                  className="p-3 bg-blue-50/75 hover:bg-blue-100/75 text-neutral-800 rounded-xl border border-blue-200/80 text-left transition-colors cursor-pointer shadow-2xs"
                >
                  <span className="font-semibold block text-neutral-900">Officer (EKH)</span>
                  <span className="text-[10px] text-blue-700/80 font-mono">Dr. Khongwir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDemoCredentials('OFFICER', '9876543211', 'Raksha@2026')}
                  className="p-3 bg-blue-50/75 hover:bg-blue-100/75 text-neutral-800 rounded-xl border border-blue-200/80 text-left transition-colors cursor-pointer shadow-2xs"
                >
                  <span className="font-semibold block text-neutral-900">Officer (DH)</span>
                  <span className="text-[10px] text-blue-700/80 font-mono">P. Saikia</span>
                </button>

                {/* Field Inspector - Light Amber Tint */}
                <button
                  type="button"
                  onClick={() => setDemoCredentials('FIELD_OFFICER', '9876543220', 'Raksha@2026')}
                  className="p-3 bg-amber-50/75 hover:bg-amber-100/75 text-neutral-800 rounded-xl border border-amber-200/80 text-left transition-colors cursor-pointer shadow-2xs"
                >
                  <span className="font-semibold block text-neutral-900">Field Inspector</span>
                  <span className="text-[10px] text-amber-700/80 font-mono">R. Warjri (Sohra)</span>
                </button>

                {/* Citizen App - Light Teal/Green Tint */}
                <button
                  type="button"
                  onClick={() => setDemoCredentials('CITIZEN', '9876543230', 'Raksha@2026')}
                  className="p-3 bg-teal-50/75 hover:bg-teal-100/75 text-neutral-800 rounded-xl border border-teal-200/80 text-left transition-colors cursor-pointer shadow-2xs"
                >
                  <span className="font-semibold block text-neutral-900">Citizen App</span>
                  <span className="text-[10px] text-teal-700/80 font-mono">Sohra Resident</span>
                </button>
              </div>
            </div>

            {/* Guest Access - Distinguished Light Blue Tinted Pill Button */}
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={handleGuestAccess}
                className="w-full py-2.5 px-3 bg-sky-50/80 hover:bg-sky-100/90 text-sky-950 rounded-full border border-sky-200/90 shadow-2xs text-xs font-semibold transition-colors cursor-pointer"
              >
                Continue as Guest (Citizen, View-Only Risk Map)
              </button>
              <div className="text-center">
                <Link
                  to="/register"
                  className="text-xs text-sky-700 hover:text-sky-900 font-semibold"
                >
                  New user? Create official or citizen account →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
