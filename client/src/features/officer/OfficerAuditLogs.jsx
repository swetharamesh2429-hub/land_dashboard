import React, { useState, useEffect } from 'react';
import { Shield, Clock, UserCheck, AlertOctagon, Radio, Activity, Filter } from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { TableSkeleton } from '../../components/common/Skeleton';
import { formatRelativeTime } from '../../utils/formatters';

export const OfficerAuditLogs = ({ districtId = 'ALL' }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get(`/analytics/audit-logs?district=${districtId}`);
        if (res.data.success) {
          setLogs(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [districtId]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-[-0.6px] flex items-center gap-2.5">
          <Shield className="w-7 h-7 text-sky-400" />
          Government Audit Trail & Response Traceability
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Immutable event log of hazard predictions, human officer verifications, and public alert dispatches
        </p>
      </div>

      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)]">
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={6} />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-xs">No audit records recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-neutral-300">
              <thead className="bg-[#050505] text-[11px] text-neutral-400 uppercase font-mono tracking-wider border-b border-neutral-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor & Role</th>
                  <th className="px-4 py-3">Action Event</th>
                  <th className="px-4 py-3">Details & Audit Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-sans">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-neutral-900/50 transition-colors">
                    <td className="px-4 py-3.5 text-neutral-400 font-mono text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}{' '}
                      <span className="text-[10px] text-neutral-500 block">
                        {formatRelativeTime(log.timestamp)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-white tracking-[-0.2px]">{log.userName}</div>
                      <span className="text-[10px] font-mono text-sky-400 px-2 py-0.5 rounded-full bg-sky-950/60 border border-sky-800/40 inline-block mt-0.5">
                        {log.userRole}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-neutral-200">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-neutral-300 text-xs max-w-md leading-relaxed">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
