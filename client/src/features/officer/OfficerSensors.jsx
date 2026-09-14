import React, { useState, useEffect } from 'react';
import {
  Activity,
  Radio,
  Wifi,
  AlertTriangle,
  Battery,
  Clock,
  RefreshCw,
  Plus,
  Send,
  HelpCircle,
  Download,
} from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { SensorStatusBadge, ConnectivityBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card, CardHeader } from '../../components/common/Card';
import { TableSkeleton } from '../../components/common/Skeleton';
import { formatRelativeTime } from '../../utils/formatters';
import { exportToCSV } from '../../utils/csvExport';

export const OfficerSensors = ({ districtId = 'ALL' }) => {
  const { socket } = useSocket();
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [simulatingSensor, setSimulatingSensor] = useState(null);
  const [simValue, setSimValue] = useState(45);
  const [simLoading, setSimLoading] = useState(false);

  const fetchSensors = async () => {
    try {
      const res = await api.get(`/sensors?district=${districtId}`);
      if (res.data.success) {
        setSensors(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load sensors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensors();
  }, [districtId]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchSensors();
    socket.on('SENSOR_STATUS_CHANGED', handleUpdate);
    socket.on('DEMO_RESET', handleUpdate);
    return () => {
      socket.off('SENSOR_STATUS_CHANGED', handleUpdate);
      socket.off('DEMO_RESET', handleUpdate);
    };
  }, [socket]);

  const handleSimulateTelemetry = async (e) => {
    e.preventDefault();
    if (!simulatingSensor) return;
    setSimLoading(true);
    try {
      await api.post('/sensors/telemetry', {
        sensorCode: simulatingSensor.sensorCode,
        value: parseFloat(simValue),
      });
      setSimulatingSensor(null);
      fetchSensors();
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setSimLoading(false);
    }
  };

  const total = sensors.length;
  const online = sensors.filter((s) => s.status === 'ONLINE').length;
  const offline = sensors.filter((s) => s.status === 'OFFLINE').length;
  const faulty = sensors.filter((s) => s.status === 'FAULTY_ANOMALY').length;

  const filteredSensors = sensors.filter((s) => {
    if (filterStatus !== 'ALL' && s.status !== filterStatus) return false;
    return true;
  });

  const handleExportSensorsCSV = () => {
    const rows = filteredSensors.map((s) => ({
      'Sensor Code': s.sensorCode,
      'Sensor Name': s.name,
      'Type': (s.type || '').replace(/_/g, ' '),
      'District': s.districtName,
      'Village': s.villageName,
      'Coordinates (Lon, Lat)': s.location?.coordinates ? s.location.coordinates.join(', ') : 'N/A',
      'Operational Status': s.status,
      'Connectivity Mode': s.connectivityMode,
      'Last Reading Value': s.lastReadingValue,
      'Unit': s.unit,
      'Is Anomaly': s.anomalyDetails?.isAnomaly ? 'YES' : 'NO',
      'Anomaly Details': s.anomalyDetails?.reason || 'None',
      'Last Updated': s.lastUpdated ? new Date(s.lastUpdated).toISOString() : 'N/A',
    }));

    exportToCSV(rows, `raksha_sensors_${districtId.toLowerCase()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header & KPI Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-[-0.6px] flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-emerald-400" />
            Sensor Telemetry & IoT Health Monitor
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Real-time Inclinometers, Rain Gauges, Soil Probes, and Statistical Anomaly Filters
          </p>
        </div>
      </div>

      {/* Sensor KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4 md:p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)]">
          <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">Total Sensors</span>
          <span className="text-3xl font-bold font-mono text-white mt-1.5 block tracking-tight">{total}</span>
          <span className="text-[11px] text-neutral-500 mt-0.5 block">Active Geo-Deployments</span>
        </div>

        <div className="bg-[#0a0a0a] border border-emerald-800/40 rounded-2xl p-4 md:p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)]">
          <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider block flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Online & Transmitting
          </span>
          <span className="text-3xl font-bold font-mono text-emerald-400 mt-1.5 block tracking-tight">{online}</span>
          <span className="text-[11px] text-emerald-500/70 mt-0.5 block">Telemetry Live</span>
        </div>

        <div className="bg-[#0a0a0a] border border-orange-800/40 rounded-2xl p-4 md:p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)]">
          <span className="text-[11px] font-mono text-orange-400 uppercase tracking-wider block flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            Faulty / Anomaly
          </span>
          <span className="text-3xl font-bold font-mono text-orange-400 mt-1.5 block tracking-tight">{faulty}</span>
          <span className="text-[11px] text-orange-400/70 mt-0.5 block">Fallback Active</span>
        </div>

        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4 md:p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)]">
          <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">Offline</span>
          <span className="text-3xl font-bold font-mono text-neutral-300 mt-1.5 block tracking-tight">{offline}</span>
          <span className="text-[11px] text-neutral-500 mt-0.5 block">Low Battery / Signal</span>
        </div>
      </div>

      {/* Sensor Table */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)]">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-neutral-800 bg-[#0c0c0c]">
          <h3 className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
            IoT Sensor Array Inventory
          </h3>
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-400">Filter Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-neutral-900 text-neutral-200 border border-neutral-800 rounded-full px-3 py-1 text-xs focus:outline-none focus:border-neutral-700 shadow-sm"
              >
                <option value="ALL">All States ({total})</option>
                <option value="ONLINE">Online ({online})</option>
                <option value="FAULTY_ANOMALY">Faulty / Anomaly ({faulty})</option>
                <option value="OFFLINE">Offline ({offline})</option>
              </select>
            </div>
            <button
              onClick={handleExportSensorsCSV}
              className="bg-neutral-900 hover:bg-neutral-800 text-sky-400 border border-neutral-800 hover:border-neutral-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-neutral-300">
              <thead className="bg-[#050505] text-[11px] text-neutral-400 uppercase font-mono tracking-wider border-b border-neutral-800">
                <tr>
                  <th className="px-4 py-3">Sensor ID & Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Village / District</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Connectivity</th>
                  <th className="px-4 py-3">Last Value</th>
                  <th className="px-4 py-3">Data Freshness</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-sans">
                {filteredSensors.map((sensor) => (
                  <tr key={sensor._id} className="hover:bg-neutral-900/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-white tracking-[-0.2px]">{sensor.sensorCode}</div>
                      <div className="text-[11px] text-neutral-400">{sensor.name}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-neutral-900 text-neutral-300 border border-neutral-800">
                        {sensor.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-neutral-200 font-medium">{sensor.villageName}</div>
                      <div className="text-[11px] text-neutral-400">{sensor.districtName}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        <SensorStatusBadge status={sensor.status} />
                        {sensor.anomalyDetails?.isAnomaly && (
                          <div className="text-[10px] text-orange-400 max-w-xs flex items-center gap-1 font-mono">
                            <HelpCircle className="w-3 h-3 shrink-0" />
                            <span>{sensor.anomalyDetails.reason}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <ConnectivityBadge mode={sensor.connectivityMode} />
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-semibold text-sky-400 text-sm">
                        {sensor.lastReadingValue}
                      </span>{' '}
                      <span className="text-neutral-400 text-xs font-mono">{sensor.unit}</span>
                    </td>
                    <td className="px-4 py-3.5 text-neutral-400 text-xs font-mono">
                      {formatRelativeTime(sensor.lastUpdated)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setSimulatingSensor(sensor);
                          setSimValue(sensor.lastReadingValue);
                        }}
                        className="text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer transition-colors"
                      >
                        Simulate Reading →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick IoT Telemetry Ingestion Simulator Modal */}
      {simulatingSensor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-white tracking-[-0.4px]">
              Simulate Ingest for {simulatingSensor.sensorCode}
            </h3>
            <p className="text-xs text-neutral-400">
              Input test value to test statistical anomaly detection and dynamic risk recalculation:
            </p>
            <form onSubmit={handleSimulateTelemetry} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Sensor Value ({simulatingSensor.unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={simValue}
                  onChange={(e) => setSimValue(e.target.value)}
                  className="w-full px-3 py-2 bg-[#050505] border border-neutral-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-neutral-600"
                />
                <span className="text-[11px] text-neutral-400 mt-1.5 block">
                  Tip: Values above physical limits (e.g. &gt;350mm rain) will trigger anomaly flags.
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSimulatingSensor(null)}
                  className="flex-1 py-2 rounded-full border border-neutral-800 text-neutral-300 hover:bg-neutral-900 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={simLoading}
                  className="flex-1 py-2 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  {simLoading ? 'Transmitting...' : 'Transmit Telemetry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
