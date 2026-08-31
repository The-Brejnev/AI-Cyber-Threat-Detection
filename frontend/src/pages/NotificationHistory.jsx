import React, { useState, useEffect } from 'react';
import {
  Bell, Search, RefreshCw, Filter, Mail, Database, Send,
  ShieldCheck, AlertTriangle, User, Clock, CheckCircle2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import SeverityBadge from '../components/ui/SeverityBadge';

const NotificationHistory = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 20 };
      if (search) params.search = search;
      if (severityFilter) params.severity = severityFilter;
      if (typeFilter) params.notification_type = typeFilter;

      const { data } = await adminAPI.getNotificationHistory(params);
      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error('Failed to fetch notification history:', err);
      toast.error('Failed to load notification history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, severityFilter, typeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-cyber-blue" />
            Admin &amp; Sub-Admin Notification &amp; Directive History
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Comprehensive audit log of all security directives, Sentinel AI relays, and threat alerts sent to user databases &amp; emails
          </p>
        </div>

        <div className="flex items-center gap-2 bg-cyber-card border border-cyber-border px-3.5 py-2 rounded-xl text-xs font-mono">
          <span className="text-gray-400">Total System Dispatches:</span>
          <span className="font-bold text-cyber-blue">{total} Records</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user email, directive title, or message keyword..."
              className="w-full bg-cyber-surface border border-cyber-border rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            className="bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-blue font-mono"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">🔴 CRITICAL</option>
            <option value="HIGH">🟠 HIGH</option>
            <option value="MEDIUM">🟡 MEDIUM</option>
            <option value="LOW">🟢 LOW</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-blue font-mono"
          >
            <option value="">All Types</option>
            <option value="admin_directive">🛡️ Admin Directives</option>
            <option value="threat">⚠️ Threat Alerts</option>
            <option value="system">⚙️ System Notices</option>
          </select>

          <button
            onClick={fetchHistory}
            className="p-2 bg-cyber-surface hover:bg-cyber-border border border-cyber-border text-gray-300 hover:text-white rounded-lg transition-colors"
            title="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-cyber-card border border-cyber-border rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-cyber-surface text-gray-400 uppercase font-mono border-b border-cyber-border">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Target Recipient</th>
                <th className="py-3 px-4">Directive / Alert Title</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Delivery Channels</th>
                <th className="py-3 px-4">Message Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyber-border/40">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center">
                    <LoadingSpinner size="md" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-500">
                    No notification records found matching criteria
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-cyber-surface/50 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-gray-400 whitespace-nowrap">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}
                    </td>

                    {/* Target Recipient */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-cyber-blue/40 flex items-center justify-center font-bold text-cyber-blue font-mono text-[10px]">
                          {item.target_email ? item.target_email[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">{item.target_email}</p>
                          <span className="text-[10px] text-gray-400 font-mono uppercase">{item.target_role}</span>
                        </div>
                      </div>
                    </td>

                    {/* Title */}
                    <td className="py-3 px-4">
                      <p className="font-bold text-white text-xs">{item.title}</p>
                      <span className="text-[10px] font-mono text-cyan-400">
                        {item.notification_type === 'admin_directive' ? '🛡️ OFFICIAL DIRECTIVE' : '⚠️ THREAT NOTIFICATION'}
                      </span>
                    </td>

                    {/* Severity */}
                    <td className="py-3 px-4">
                      <SeverityBadge severity={item.severity} />
                    </td>

                    {/* Channels */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          <Database className="w-3 h-3" /> User Database (Saved)
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                          <Mail className="w-3 h-3" /> Inbox Email (Dispatched)
                        </span>
                      </div>
                    </td>

                    {/* Message Summary */}
                    <td className="py-3 px-4 text-gray-300 text-[11px] max-w-xs truncate leading-relaxed">
                      {item.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-cyber-border flex items-center justify-between text-xs text-gray-400 font-mono">
            <span>Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 bg-cyber-surface hover:bg-cyber-border rounded-lg border border-cyber-border text-white disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 bg-cyber-surface hover:bg-cyber-border rounded-lg border border-cyber-border text-white disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationHistory;
