import React, { useState, useEffect, useRef } from 'react';
import {
  UserCheck,
  CheckCircle2,
  Clock,
  Camera,
  MapPin,
  AlertTriangle,
  UploadCloud,
  Send,
  Navigation,
  FileCheck,
  RefreshCw,
  Sparkles,
  RotateCcw,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { CardSkeleton } from '../../components/common/Skeleton';
import { formatRelativeTime } from '../../utils/formatters';
import { compressImage } from '../../utils/offlineSync';

export const FieldDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [tasks, setTasks] = useState([]);
  const [roads, setRoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [photoBase64, setPhotoBase64] = useState('');
  const [severity, setSeverity] = useState('MAJOR_SUBSIDENCE');
  const [notes, setNotes] = useState('');
  const [roadPassable, setRoadPassable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const fileInputRef = useRef(null);

  const fetchFieldData = async () => {
    try {
      const [tasksRes, roadsRes] = await Promise.all([
        api.get('/field-tasks/my'),
        api.get('/risk-zones/road-segments'),
      ]);

      if (tasksRes.data.success) setTasks(tasksRes.data.data);
      if (roadsRes.data.success) setRoads(roadsRes.data.data);
    } catch (err) {
      console.error('Failed to load field data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFieldData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchFieldData();
    socket.on('FIELD_TASK_ASSIGNED', handleUpdate);
    socket.on('DEMO_RESET', handleUpdate);
    return () => {
      socket.off('FIELD_TASK_ASSIGNED', handleUpdate);
      socket.off('DEMO_RESET', handleUpdate);
    };
  }, [socket]);

  const openTaskModal = (task) => {
    setActiveTask(task);
    setChecklist(
      task.checklist && task.checklist.length > 0
        ? task.checklist
        : [
            { label: 'Check for visible ground cracks / shear fractures', checked: true },
            { label: 'Inspect toe of slope and spring discharge', checked: true },
            { label: 'Measure stream/water marker elevation', checked: false },
            { label: 'Verify road passability for evacuation', checked: false },
          ]
    );
    setNotes(
      task.evidence?.notes ||
        'Verified 3-inch active longitudinal fracture extending along retaining embankment. Water seepage noted at toe.'
    );
    setPhotoBase64(
      task.evidence?.photoUrl ||
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80'
    );
    setSeverity('MAJOR_SUBSIDENCE');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1000, 0.75);
      setPhotoBase64(compressed);
    } catch (err) {
      console.error('Failed to compress field image:', err);
    }
  };

  const handleChecklistToggle = (index) => {
    const updated = [...checklist];
    updated[index].checked = !updated[index].checked;
    setChecklist(updated);
  };

  const handleSubmitVerification = async (e) => {
    e.preventDefault();
    if (!activeTask) return;
    setSubmitting(true);

    try {
      await api.post(`/field-tasks/${activeTask._id}/submit`, {
        checklist,
        evidence: {
          photoUrl: photoBase64,
          notes,
          observedSeverity: severity,
          roadPassable,
        },
      });

      setStatusMsg({
        type: 'success',
        text: `Inspection for ${activeTask.villageName} transmitted to District EOC in real time!`,
      });
      setActiveTask(null);
      fetchFieldData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Submission failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRoad = async (roadId, currentStatus) => {
    const nextStatus =
      currentStatus === 'CLEAR' ? 'CAUTION' : currentStatus === 'CAUTION' ? 'BLOCKED' : 'CLEAR';
    try {
      await api.patch('/field-tasks/road-status', {
        roadSegmentId: roadId,
        status: nextStatus,
      });
      fetchFieldData();
    } catch (err) {
      console.error('Failed to update road:', err);
    }
  };

  const pendingTasks = tasks.filter((t) => t.status === 'PENDING');
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-10">
      {/* Header & Operational Identity */}
      <div className="bg-white border border-sky-100/60 rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
        {/* Continuous Scanning Line Animation (Radar Sweep Across Full Card Width) */}
        <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden pointer-events-none z-10" aria-hidden="true">
          <div className="h-full bg-gradient-to-r from-transparent via-sky-500 to-transparent animate-radar-scan opacity-80 shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-0">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#e6f1fb] border border-sky-100 flex items-center justify-center text-sky-600 shadow-xs shrink-0 mt-0.5">
              <UserCheck className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <div className="relative overflow-hidden inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 mb-1.5 shadow-2xs">
                {/* Full-width continuous scanning line */}
                <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden pointer-events-none" aria-hidden="true">
                  <div className="h-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-radar-scan opacity-80 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                </div>
                <span className="relative flex h-2.5 w-2.5 z-10">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10b981] shadow-[0_0_8px_#10b981]"></span>
                </span>
                <span className="text-xs font-mono text-emerald-800 font-bold uppercase tracking-wider relative z-10">
                  Field Inspection Unit Active
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                {user?.name || 'Rilang Warjri (Field Inspector)'}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                Assigned Jurisdiction: <strong className="text-neutral-900">{user?.jurisdiction?.district || 'East Khasi Hills'}</strong> · Sub-Division: <strong className="text-neutral-900">{user?.jurisdiction?.block || 'Sohra'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-[#f8fbff] px-5 py-3 rounded-2xl border border-sky-100/80 shadow-xs shrink-0">
            <div className="text-center">
              <span className="text-xs text-neutral-500 uppercase font-semibold block font-mono">Pending</span>
              <span className="text-2xl font-extrabold font-mono text-amber-600">{pendingTasks.length}</span>
            </div>
            <div className="h-8 w-px bg-sky-100" />
            <div className="text-center">
              <span className="text-xs text-neutral-500 uppercase font-semibold block font-mono">Verified</span>
              <span className="text-2xl font-extrabold font-mono text-emerald-600">{completedTasks.length}</span>
            </div>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-medium border flex items-center justify-between animate-in fade-in shadow-sm ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-red-50 border-red-300 text-red-800'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-neutral-500 hover:text-neutral-900 px-2 py-1 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* 2-COLUMN RESPONSIVE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: ASSIGNED VERIFICATION TASKS (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#e6f1fb] flex items-center justify-center text-sky-600 shrink-0">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-mono text-neutral-700 uppercase tracking-wider font-bold">
                Assigned Verification Tasks ({pendingTasks.length} Pending)
              </h3>
            </div>
            <span className="text-xs text-neutral-400 font-mono">Outdoor Sunlight Mode</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-10 text-center bg-white border border-sky-100/40 rounded-2xl space-y-2 shadow-md">
              <div className="w-14 h-14 rounded-full bg-[#e6f1fb] flex items-center justify-center text-emerald-600 mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-base font-bold text-neutral-900">All Assigned Tasks Completed</p>
              <p className="text-xs text-neutral-500">Stand by for real-time hazard verification dispatches from EOC.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {tasks.map((task) => {
                const isPending = task.status === 'PENDING';
                return (
                  <div
                    key={task._id}
                    className={`p-5 rounded-2xl border transition-all shadow-md bg-white ${
                      isPending
                        ? 'border-l-4 border-l-amber-500 border-sky-100/40 hover:shadow-lg'
                        : 'border-l-4 border-l-emerald-500 border-sky-100/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono uppercase ${
                              isPending
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {task.status}
                          </span>
                          <span className="text-xs text-neutral-400 font-mono">{task.taskCode}</span>
                          <span className="text-xs text-neutral-400">· {formatRelativeTime(task.createdAt)}</span>
                        </div>

                        <h4 className="text-lg font-bold text-neutral-900 tracking-tight">{task.title}</h4>
                        <p className="text-xs sm:text-sm text-neutral-600 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                          {task.villageName}, {task.districtName}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">{task.reason}</p>
                      </div>

                      <div className="shrink-0">
                        {isPending ? (
                          <button
                            onClick={() => openTaskModal(task)}
                            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold rounded-full text-xs sm:text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Perform Inspection →</span>
                          </button>
                        ) : (
                          <div className="text-xs sm:text-sm text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50 px-3.5 py-2 rounded-full border border-emerald-200 shadow-xs">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Report Transmitted</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: LIFELINE ROAD STATUS & ROUTE CONDITIONS (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#e6f1fb] flex items-center justify-center text-sky-600 shrink-0">
                <Navigation className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-mono text-neutral-700 uppercase tracking-wider font-bold">
                Lifeline Road Passability
              </h3>
            </div>
            <span className="text-xs text-neutral-400 font-mono">Real-Time Routing</span>
          </div>

          <div className="bg-white border border-sky-100/40 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md">
            <p className="text-xs text-neutral-500">
              Select status to update route condition for evacuation management:
            </p>

            <div className="space-y-3">
              {roads.map((road) => {
                let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                if (road.status === 'CAUTION') badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
                if (road.status === 'BLOCKED') badgeBg = 'bg-red-50 text-red-700 border-red-200';

                return (
                  <div
                    key={road._id}
                    onClick={() => handleToggleRoad(road._id, road.status)}
                    className="bg-[#f8fbff] hover:bg-[#eef4ff] border border-sky-100/80 p-4 rounded-xl cursor-pointer transition-all space-y-2 group shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm sm:text-base text-neutral-900 group-hover:text-black transition-colors">
                        {road.name}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase border ${badgeBg}`}>
                        {road.status}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600">{road.alternateRouteDescription}</p>
                    <div className="pt-1 flex items-center justify-between text-[11px] text-neutral-400">
                      <span>Click to cycle: Clear → Caution → Blocked</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* FIELD TASK VERIFICATION INSPECTION MODAL */}
      {activeTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-sky-100/40 rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4 text-neutral-900">
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#e6f1fb] flex items-center justify-center text-sky-600 shrink-0 mt-0.5">
                  <FileCheck className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider block font-bold">
                    Ground-Truth Hazard Verification
                  </span>
                  <h3 className="text-xl font-bold text-neutral-900">{activeTask.villageName}</h3>
                  <p className="text-xs text-neutral-500 font-mono">{activeTask.districtName} · Task: {activeTask.taskCode}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTask(null)}
                className="text-neutral-500 hover:text-neutral-900 p-2 rounded-full bg-[#f8fbff] hover:bg-neutral-100 text-xs font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitVerification} className="space-y-4 text-xs sm:text-sm">
              {/* Checklist */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  On-Ground Checklist
                </label>
                <div className="space-y-2 bg-[#f8fbff] p-3.5 rounded-2xl border border-sky-100/80">
                  {checklist.map((item, idx) => (
                    <label
                      key={idx}
                      className="min-h-[44px] flex items-center gap-3 p-2.5 rounded-xl hover:bg-white cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => handleChecklistToggle(idx)}
                        className="w-4 h-4 rounded bg-white border-neutral-300 text-sky-600 focus:ring-sky-500"
                      />
                      <span className="text-xs sm:text-sm text-neutral-800 font-medium">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Observed Severity */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Observed Physical Threat Level
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#f8fbff] border border-sky-100/80 rounded-xl text-neutral-900 font-semibold text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-sky-500"
                >
                  <option value="ACTIVE_SLIPPAGE">🔴 Active Slippage / Mass Movement</option>
                  <option value="MAJOR_SUBSIDENCE">🟠 Major Tension Cracks & Subsidence</option>
                  <option value="MINOR_CRACKS">🟡 Minor Hairline Surface Cracks</option>
                  <option value="NO_THREAT">🟢 No Immediate Hazard / Stable Slope</option>
                </select>
              </div>

              {/* Real Photo Capture / Upload */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Inspection Photo Evidence
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                  id="field-photo-capture"
                />

                {!photoBase64 ? (
                  <label
                    htmlFor="field-photo-capture"
                    className="min-h-[80px] flex flex-col items-center justify-center p-5 border-2 border-dashed border-sky-200/80 hover:border-sky-400 bg-[#f8fbff] hover:bg-[#eef4ff] rounded-2xl cursor-pointer transition-colors text-center group"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#e6f1fb] flex items-center justify-center text-sky-600 mb-1.5 group-hover:scale-110 transition-transform">
                      <Camera className="w-5 h-5 text-sky-600" />
                    </div>
                    <span className="text-xs font-bold text-neutral-900">Tap to Capture Field Photo</span>
                  </label>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-sky-100/80 h-48 bg-neutral-900">
                    <img src={photoBase64} alt="Inspection Evidence" className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1 bg-neutral-900/90 hover:bg-neutral-900 text-white rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm backdrop-blur-sm cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retake</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Field Observations & Recommended Evacuation Action
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe slope fracture width, spring turbidity, evacuation readiness..."
                  className="w-full px-3.5 py-2.5 bg-[#f8fbff] border border-sky-100/80 rounded-xl text-neutral-900 text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTask(null)}
                  className="flex-1 min-h-[44px] py-2.5 px-4 text-neutral-700 bg-[#f8fbff] border border-sky-100/80 hover:bg-neutral-100 font-semibold rounded-full text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 min-h-[44px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-full text-xs shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Submitting...' : 'Submit Inspection Report'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
