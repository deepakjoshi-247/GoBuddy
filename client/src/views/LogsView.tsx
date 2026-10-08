import React, { useState, useEffect } from 'react';
import {
  Shield,
  Search,
  RotateCcw,
  ArrowLeft,
  Filter,
  CheckCircle,
  XCircle,
  PlusCircle,
  UserCheck,
  Flag,
  Clock,
} from 'lucide-react';
import { AuditLog, AuditEventType } from '../types';
import { api } from '../services/api';

interface LogsViewProps {
  onBack?: () => void;
}

export const LogsView: React.FC<LogsViewProps> = ({ onBack }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.getAuditLogs(selectedEvent);
      setLogs(res.logs || []);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      setError('Failed to load audit logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedEvent]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedEvent]);

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.user_name.toLowerCase().includes(q) ||
      log.ride_id.toLowerCase().includes(q) ||
      (log.details && log.details.toLowerCase().includes(q))
    );
  });

  const getEventBadge = (event: AuditEventType) => {
    switch (event) {
      case 'RIDE_CREATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-zinc-800 text-[#6366F1] border border-amber-500/30">
            <PlusCircle className="w-3 h-3 text-[#6366F1]" />
            RIDE_CREATED
          </span>
        );
      case 'JOIN_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-zinc-800 text-[#6366F1] border border-[#222634]">
            <Clock className="w-3 h-3 text-[#6366F1]" />
            JOIN_REQUESTED
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
            <UserCheck className="w-3 h-3 text-emerald-400" />
            APPROVED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-950/60 text-rose-300 border border-rose-800">
            <XCircle className="w-3 h-3 text-rose-400" />
            CANCELLED
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-zinc-800 text-zinc-200 border border-zinc-600">
            <CheckCircle className="w-3 h-3 text-[#6366F1]" />
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-zinc-800 text-zinc-300 border border-[#222634]">
            {event}
          </span>
        );
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const filterOptions = [
    { label: 'All Events', value: 'ALL' },
    { label: 'Created', value: 'RIDE_CREATED' },
    { label: 'Requested', value: 'JOIN_REQUESTED' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Cancelled', value: 'CANCELLED' },
    { label: 'Completed', value: 'COMPLETED' },
  ];

  return (
    <div className="min-h-screen bg-[#0F1117] text-[#F4F4F5] flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-[#0F1117] text-[#F4F4F5] border-b border-[#222634] px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to App</span>
              </button>
            ) : (
              <a
                href="/"
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to App</span>
              </a>
            )}
            <div className="h-5 w-px bg-[#3F3F46]" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#6366F1] text-zinc-950 flex items-center justify-center font-bold text-xs">
                AL
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-[#F4F4F5] flex items-center gap-1.5">
                  Production Audit Logs
                  <span className="text-[10px] bg-zinc-800 text-[#6366F1] px-1.5 py-0.2 rounded border border-[#222634]">
                    Admin Record
                  </span>
                </h1>
                <p className="text-[10px] text-[#A1A1AA]">
                  Lifecycle events: Creation, Join Requests, Approvals, Cancellations & Completion
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                autoRefresh
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-400'
                  : 'bg-zinc-800 border-[#222634] text-zinc-400 hover:text-white'
              }`}
            >
              {autoRefresh ? '● Live Polling (3s)' : '○ Paused'}
            </button>
            <button
              type="button"
              onClick={fetchLogs}
              disabled={isLoading}
              title="Refresh logs"
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-[#222634] transition-colors"
            >
              <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#6366F1]' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Controls: Filter Tabs & Search Bar */}
        <div className="bg-[#27272A] rounded-xl border border-[#222634] p-4 shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-zinc-400 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-zinc-400" />
                Filter:
              </span>
              {filterOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedEvent(opt.value)}
                  className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
                    selectedEvent === opt.value
                      ? 'bg-[#6366F1] text-zinc-950 font-bold shadow-sm'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-[#222634]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user, ride ID, details..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#0F1117] border border-[#222634] rounded-lg text-xs text-[#F4F4F5] placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Audit Log Table */}
        <div className="bg-[#27272A] rounded-xl border border-[#222634] shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#222634] flex items-center justify-between bg-zinc-900/70">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              Audit Trail Entries
            </h2>
            <span className="text-xs font-medium text-zinc-400">
              Showing {filteredLogs.length} of {logs.length} logged events
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900/90 border-b border-[#222634] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Event Type</th>
                  <th className="py-2.5 px-4">Ride Identifier</th>
                  <th className="py-2.5 px-4">Initiator / User</th>
                  <th className="py-2.5 px-4">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3F3F46] text-xs text-zinc-300">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-500 text-xs">
                      No audit logs found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-zinc-800/60 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap text-zinc-400 font-mono text-[11px]">
                        {formatDate(log.timestamp)}
                      </td>

                      {/* Event Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getEventBadge(log.event)}
                      </td>

                      {/* Ride ID */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] bg-[#0F1117] text-[#6366F1] px-2 py-0.5 rounded border border-[#222634]">
                          {log.ride_id || 'N/A'}
                        </span>
                      </td>

                      {/* User Name */}
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-[#F4F4F5]">
                        {log.user_name}
                      </td>

                      {/* Details */}
                      <td className="py-3 px-4 text-zinc-300 max-w-md truncate">
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LogsView;
