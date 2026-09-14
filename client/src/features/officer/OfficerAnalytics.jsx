import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  ShieldCheck,
  Award,
  CloudRain,
  Cpu,
  Layers,
  Activity,
  CheckCircle2,
  XCircle,
  Download,
} from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { exportToCSV } from '../../utils/csvExport';

export const OfficerAnalytics = () => {
  const [accuracyData, setAccuracyData] = useState(null);
  const [rainfallData, setRainfallData] = useState([]);
  const [featureData, setFeatureData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [accRes, rainRes, featRes] = await Promise.all([
          api.get('/analytics/accuracy'),
          api.get('/analytics/rainfall-trend'),
          api.get('/analytics/feature-importance'),
        ]);

        if (accRes.data.success) setAccuracyData(accRes.data.data);
        if (rainRes.data.success) setRainfallData(rainRes.data.data);
        if (featRes.data.success) setFeatureData(featRes.data.data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const handleExportAnalyticsCSV = () => {
    const rows = (rainfallData || []).map((r) => ({
      'Record Type': 'Rainfall & Soil Telemetry Trend',
      'Date': r.date,
      'Rainfall (mm)': r.rainfallMm,
      'Soil Moisture (%)': r.soilMoisturePct,
      'Catchment Area': 'Sohra / East Khasi Hills',
      'Model Ground-Truth Accuracy (%)': accuracyData?.overallAccuracyPct || 84.4,
      'Total Alerts Evaluated (30-Day)': accuracyData?.totalAlertsEvaluated || 45,
      'Confirmed Accurate Alerts': accuracyData?.confirmedAccurateAlerts || 38,
      'False Alarms Dismissed': accuracyData?.falseAlarmsDismissed || 7,
    }));

    if (!rows.length && accuracyData) {
      rows.push({
        'Record Type': 'Model Accuracy Summary',
        'Date': new Date().toISOString().split('T')[0],
        'Rainfall (mm)': 'N/A',
        'Soil Moisture (%)': 'N/A',
        'Catchment Area': 'Regional NER Overview',
        'Model Ground-Truth Accuracy (%)': accuracyData?.overallAccuracyPct || 84.4,
        'Total Alerts Evaluated (30-Day)': accuracyData?.totalAlertsEvaluated || 45,
        'Confirmed Accurate Alerts': accuracyData?.confirmedAccurateAlerts || 38,
        'False Alarms Dismissed': accuracyData?.falseAlarmsDismissed || 7,
      });
    }

    exportToCSV(rows, 'raksha_analytics_rainfall_accuracy');
  };

  const historicalTierData = [
    { period: 'Week 1', Watch: 12, Warning: 6, Danger: 2 },
    { period: 'Week 2', Watch: 15, Warning: 9, Danger: 4 },
    { period: 'Week 3', Watch: 8, Warning: 14, Danger: 5 },
    { period: 'Week 4', Watch: 11, Warning: 8, Danger: 3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.6px] flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-sky-400" />
            Analytics, Verification Accuracy & Model Transparency
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            30-Day Model Verification Performance, Time-Series Rainfall Trends, and Susceptibility Weights
          </p>
        </div>
        <button
          onClick={handleExportAnalyticsCSV}
          className="self-start sm:self-auto bg-neutral-900 hover:bg-neutral-800 text-sky-400 border border-neutral-800 hover:border-neutral-700 px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-sky-400" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* HERO METRIC: 30-Day Alert Accuracy Transparency Widget */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-700/60 text-sky-300 text-[11px] font-mono font-semibold uppercase tracking-wider">
              <Award className="w-3.5 h-3.5 text-sky-400" />
              <span>Illustrative Model Verification</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-semibold text-white tracking-[-0.8px]">
              {accuracyData?.overallAccuracyPct || 84.4}% Accuracy (Synthetic Baseline)
            </h3>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              Illustrative accuracy based on <strong>{accuracyData?.totalAlertsEvaluated || 45} synthetic test scenarios</strong>. {accuracyData?.confirmedAccurateAlerts || 38} confirmed accurate across simulated catchments with {accuracyData?.falseAlarmsDismissed || 7} false alarms safely filtered.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
            <div className="bg-[#050505] border border-neutral-800 rounded-xl p-3.5 text-center min-w-[110px]">
              <span className="text-[11px] font-mono text-neutral-400 block mb-1">Evaluated</span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
                {accuracyData?.totalAlertsEvaluated || 45}
              </span>
            </div>
            <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-3.5 text-center min-w-[110px]">
              <span className="text-[11px] font-mono text-emerald-400 block mb-1">Accurate</span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tracking-tight">
                {accuracyData?.confirmedAccurateAlerts || 38}
              </span>
            </div>
            <div className="bg-orange-950/20 border border-orange-800/40 rounded-xl p-3.5 text-center min-w-[110px]">
              <span className="text-[11px] font-mono text-orange-400 block mb-1">False Alarms</span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-orange-400 tracking-tight">
                {accuracyData?.falseAlarmsDismissed || 7}
              </span>
            </div>
          </div>
        </div>

        {/* Hazard Accuracy Progress Bars */}
        <div className="mt-6 pt-5 border-t border-neutral-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {accuracyData?.byHazard?.map((h, i) => (
            <div key={i} className="space-y-1.5 bg-[#050505] p-3 rounded-xl border border-neutral-800">
              <div className="flex justify-between font-medium text-neutral-200">
                <span>{h.name}</span>
                <span className="font-mono text-sky-400 font-bold">{h.accuracyPct}%</span>
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${h.accuracyPct}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-neutral-400 block">
                {h.accurate} accurate of {h.total} alerts
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Middle Section: Rainfall Trend & Historical Alert Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 14-Day Rainfall & Soil Moisture Trend */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-sky-400" />
              14-Day Cumulative Rainfall & Soil Saturation Trend
            </h3>
            <span className="text-[11px] font-mono text-neutral-400">Sohra Catchment</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rainfallData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" opacity={0.6} />
                <XAxis dataKey="date" stroke="#737373" fontSize={11} font-family="monospace" />
                <YAxis stroke="#737373" fontSize={11} font-family="monospace" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <ReferenceLine y={120} label="Danger (120mm)" stroke="#DC2626" strokeDasharray="3 3" />
                <ReferenceLine y={70} label="Warning (70mm)" stroke="#F97316" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="rainfallMm" name="Rainfall (mm)" stroke="#0EA5E9" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="soilMoisturePct" name="Soil Moisture (%)" stroke="#10B981" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historical Alerts by Tier */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Historical Alert Volume by Severity Tier
            </h3>
            <span className="text-[11px] font-mono text-neutral-400">Weekly Distribution</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historicalTierData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" opacity={0.6} />
                <XAxis dataKey="period" stroke="#737373" fontSize={11} font-family="monospace" />
                <YAxis stroke="#737373" fontSize={11} font-family="monospace" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="Watch" fill="#EAB308" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Warning" fill="#F97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Danger" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section: AI Susceptibility vs Trigger Feature Importance */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            AI Multi-Hazard Model Feature Weights & Causal Contribution
          </h3>
          <span className="text-[11px] font-mono text-neutral-400">Autonomous Multi-Hazard AI Model</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-3">
            <p className="text-xs text-neutral-300 leading-relaxed">
              Unlike generic weather apps, RAKSHA-NER explicitly separates <strong className="text-amber-300">Static Susceptibility</strong> (coal mining proximity, 5-year NDVI forest loss, shale formation erodibility) from <strong className="text-sky-300">Dynamic Meteorological Triggers</strong> (24h cumulative rainfall, soil saturation).
            </p>
            <div className="space-y-2.5 text-xs">
              {featureData.map((f, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between font-medium text-neutral-200">
                    <span>{f.factor} ({f.category})</span>
                    <span className="font-mono text-sky-400 font-bold">{f.weightPct}%</span>
                  </div>
                  <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        f.category.includes('Static')
                          ? 'bg-amber-500'
                          : f.category.includes('Dynamic')
                          ? 'bg-sky-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${f.weightPct * 2.5}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#050505] p-4 rounded-xl border border-neutral-800 space-y-3 text-xs text-neutral-300">
            <h4 className="font-semibold text-white text-sm tracking-[-0.2px]">North East India Specific Geological Factors</h4>
            <ul className="space-y-2 list-disc pl-4 text-neutral-300">
              <li>
                <strong className="text-amber-300">Rat-hole Coal Extraction:</strong> Prominent in Meghalaya Jaintia/Khasi hills border, creates sub-surface voids that collapse under moderate precipitation.
              </li>
              <li>
                <strong className="text-amber-300">Jhum Cultivation Deforestation:</strong> 5-year Sentinel-2 NDVI trend analysis identifies slopes stripped of deep root retention.
              </li>
              <li>
                <strong className="text-sky-300">Disung Shale Incompetence:</strong> Dima Hasao railway/highway corridor characterized by severe shear slippage during heavy rain.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
