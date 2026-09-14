import React, { useState, useEffect } from 'react';
import {
  Camera,
  CheckCircle2,
  XCircle,
  UserCheck,
  MapPin,
  Sparkles,
  ExternalLink,
  Download,
} from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { VerificationStatusBadge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { CardSkeleton } from '../../components/common/Skeleton';
import { formatRelativeTime } from '../../utils/formatters';
import { exportToCSV } from '../../utils/csvExport';

export const OfficerCitizenReports = ({ districtId = 'ALL' }) => {
  const { socket } = useSocket();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [loadingId, setLoadingId] = useState(null);

  const fetchReports = async () => {
    try {
      const res = await api.get(`/citizen-reports?district=${districtId}`);
      if (res.data.success) {
        setReports(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch citizen reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [districtId]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchReports();
    socket.on('CITIZEN_REPORT_SUBMITTED', handleUpdate);
    socket.on('CITIZEN_REPORT_VERIFIED', handleUpdate);
    socket.on('DEMO_RESET', handleUpdate);
    return () => {
      socket.off('CITIZEN_REPORT_SUBMITTED', handleUpdate);
      socket.off('CITIZEN_REPORT_VERIFIED', handleUpdate);
      socket.off('DEMO_RESET', handleUpdate);
    };
  }, [socket]);

  const handleVerify = async (reportId, status, notes = '') => {
    setLoadingId(reportId);
    try {
      await api.patch(`/citizen-reports/${reportId}/verify`, {
        status,
        officerNotes: notes,
      });
      fetchReports();
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setLoadingId(null);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (filterStatus !== 'ALL' && r.verificationStatus !== filterStatus) return false;
    return true;
  });

  const handleExportReportsCSV = () => {
    const rows = filteredReports.map((r) => ({
      'Report Code': r.reportCode,
      'District': r.districtName,
      'Village': r.villageName,
      'Category': (r.category || '').replace(/_/g, ' '),
      'Verification Status': r.verificationStatus,
      'AI Pre-screen Label': r.aiPrescreen?.label || r.aiPrescreenLabel || 'N/A',
      'AI Confidence (%)': r.aiPrescreen?.confidencePct || r.aiConfidencePct || 'N/A',
      'Description': r.description || '',
      'Officer Notes': r.officerNotes || 'None',
      'Coordinates (Lon, Lat)': r.location?.coordinates ? r.location.coordinates.join(', ') : 'N/A',
      'Submitted At': r.submittedAt ? new Date(r.submittedAt).toISOString() : 'N/A',
      'Verified At': r.verifiedAt ? new Date(r.verifiedAt).toISOString() : 'N/A',
    }));

    exportToCSV(rows, `raksha_citizen_reports_${districtId.toLowerCase()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-[-0.6px] flex items-center gap-2.5">
            <Camera className="w-7 h-7 text-purple-400" />
            Citizen Ground-Truth Reports & AI Pre-Screening
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Community-sourced slope movement, road blockages, and CNN image verification
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-neutral-400">Status Filter:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-neutral-900 text-neutral-200 border border-neutral-800 rounded-full px-3 py-1 text-xs focus:outline-none focus:border-neutral-700 shadow-sm"
            >
              <option value="ALL">All Reports ({reports.length})</option>
              <option value="PENDING">Pending Review</option>
              <option value="VERIFIED">Verified Real</option>
              <option value="REJECTED">Dismissed</option>
            </select>
          </div>
          <button
            onClick={handleExportReportsCSV}
            className="bg-neutral-900 hover:bg-neutral-800 text-sky-400 border border-neutral-800 hover:border-neutral-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="p-12 text-center bg-[#0a0a0a] border border-neutral-800 rounded-2xl shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
          <Camera className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-neutral-300">No Citizen Reports Found</h3>
          <p className="text-xs text-neutral-500 mt-1">
            Ground-truth hazard reports submitted by citizens will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((report) => (
            <div
              key={report._id}
              className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)] space-y-4 flex flex-col justify-between hover:border-neutral-700 transition-colors"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <VerificationStatusBadge status={report.verificationStatus} />
                    <span className="text-[11px] font-mono text-neutral-400">{report.reportCode}</span>
                  </div>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {formatRelativeTime(report.submittedAt)}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-white tracking-[-0.4px] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                  {report.villageName} ({report.districtName})
                </h3>
                <p className="text-xs text-neutral-300 font-medium mt-0.5">
                  Category: <span className="text-sky-300 font-mono text-[11px]">{report.category.replace(/_/g, ' ')}</span>
                </p>

                {report.description && (
                  <p className="text-xs text-neutral-300 bg-[#050505] p-3 rounded-xl border border-neutral-800 my-2.5 leading-relaxed">
                    "{report.description}"
                  </p>
                )}

                {/* Attached Photo */}
                {report.photoUrl && (
                  <div className="my-2.5 rounded-xl overflow-hidden border border-neutral-800 max-h-48 bg-[#050505]">
                    <img
                      src={report.photoUrl}
                      alt="Citizen Ground Hazard"
                      className="w-full h-44 object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                {/* AI CNN Pre-Screening Banner */}
                {report.aiPreScreening && (
                  <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-xl text-xs space-y-1 mt-2.5">
                    <div className="flex items-center justify-between text-purple-300 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        AI Image Pre-Screening
                      </span>
                      <span className="font-mono text-[11px]">{report.aiPreScreening.confidencePct}% Confidence</span>
                    </div>
                    <p className="text-[11px] text-neutral-300">{report.aiPreScreening.label}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                <span className="text-[11px] text-neutral-400 font-mono">
                  Reporter: {report.reporterName} ({report.reporterPhone})
                </span>

                {report.verificationStatus === 'PENDING' ? (
                  <div className="flex gap-2">
                    <button
                      disabled={loadingId === report._id}
                      onClick={() => handleVerify(report._id, 'VERIFIED', 'Verified by EOC Officer')}
                      className="px-3.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify</span>
                    </button>
                    <button
                      disabled={loadingId === report._id}
                      onClick={() => handleVerify(report._id, 'REJECTED', 'Marked as false/spam')}
                      className="px-3.5 py-1 rounded-full border border-red-700/60 hover:bg-red-950/40 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold font-mono text-neutral-400">
                    Status: {report.verificationStatus}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
