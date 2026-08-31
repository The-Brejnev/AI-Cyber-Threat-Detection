import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Search, Filter, Download, Info, ShieldAlert, CheckCircle,
  Clock, Globe, MapPin, Ban, RefreshCw, ArrowRight, Server, Shield
} from 'lucide-react';
import { threatsAPI, blockedIPsAPI } from '../services/api';
import toast from 'react-hot-toast';

import DataTable from '../components/ui/DataTable';
import Pagination from '../components/ui/Pagination';
import SeverityBadge from '../components/ui/SeverityBadge';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const ThreatAnalysis = () => {
  const navigate = useNavigate();
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [filters, setFilters] = useState({ search: '', severity: '', status: '' });
  const [selectedThreat, setSelectedThreat] = useState(null);

  const safeFormatDate = (value, dateFormat = 'MMM dd, HH:mm:ss') => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return format(date, dateFormat);
  };

  const fetchThreats = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await threatsAPI.getThreats({
        page,
        page_size: limit,
        limit,
        offset: (page - 1) * limit,
        ...filters
      });
      setThreats(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
      setTotal(data?.total ?? (Array.isArray(data) ? data.length : 0));
    } catch (error) {
      console.error('Failed to fetch threats:', error);
      toast.error('Failed to fetch threat forensics');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchThreats();
  }, [fetchThreats]);

  const handleUpdateStatus = async (id, status) => {
    try {
      await threatsAPI.updateStatus(id, status);
      toast.success(`Threat status updated to ${status}`);
      fetchThreats();
      if (selectedThreat?.id === id) setSelectedThreat({ ...selectedThreat, status });
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleBlockIP = async (ip, threatType) => {
    try {
      await blockedIPsAPI.blockIP({
        ip_address: ip,
        reason: `Enforced firewall block from Threat Analysis (${threatType || 'ATTACK'})`,
        threat_type: threatType || selectedThreat?.threat_type
      });
      toast.success(`IP ${ip} blocked successfully`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to block IP');
    }
  };

  const navigateToGeoMap = (ip) => {
    navigate(`/geo-map?focus=${encodeURIComponent(ip)}`);
  };

  const exportCSV = () => {
    const headers = ['ID', 'Threat Type', 'Severity', 'Risk Score', 'Source IP (Attacker)', 'Destination IP (Your System)', 'Protocol', 'Port', 'Status', 'Detection Time'];
    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + threats.map(t => [
          t.id,
          t.threat_type,
          t.severity,
          t.risk_score,
          t.source_ip,
          t.destination_ip || t.dest_ip,
          t.protocol,
          t.destination_port || t.dest_port,
          t.status,
          t.created_at || t.detection_time
        ].join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `threat_forensics_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Forensic CSV exported');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-400" />
            Threat Forensics & Attack Analysis
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Deep inspection of inbound cyber attacks with instant GeoMap telemetry</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchThreats}
            className="p-2 bg-cyber-surface border border-cyber-border rounded-lg text-gray-300 hover:text-white transition-colors"
            title="Refresh Threats"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-cyber-surface border border-cyber-border rounded-lg text-sm text-white hover:bg-cyber-border transition-colors font-medium"
          >
            <Download className="w-4 h-4 text-cyber-blue" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-cyber-card border border-cyber-border rounded-xl p-5">
        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search Attacker IP, Destination, or Threat Category..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-9 pr-4 py-2 bg-cyber-surface border border-cyber-border rounded-lg text-sm text-white focus:outline-none focus:border-cyber-blue placeholder-gray-500"
            />
          </div>
          <select
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            className="px-3 py-2 bg-cyber-surface border border-cyber-border rounded-lg text-sm text-white focus:outline-none focus:border-cyber-blue"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 bg-cyber-surface border border-cyber-border rounded-lg text-sm text-white focus:outline-none focus:border-cyber-blue"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="false_positive">False Positive</option>
          </select>
        </div>

        {/* Threats Table */}
        <DataTable
          isLoading={loading}
          data={threats}
          onRowClick={(row) => setSelectedThreat(row)}
          columns={[
            {
              header: 'Detected Time',
              cell: (r) => (
                <span className="font-mono text-xs text-gray-400">
                  {safeFormatDate(r.created_at || r.detection_time)}
                </span>
              )
            },
            {
              header: 'Threat Category',
              cell: (r) => (
                <span className="font-semibold text-white text-xs">
                  {r.threat_type}
                </span>
              )
            },
            {
              header: 'Severity',
              cell: (r) => <SeverityBadge severity={r.severity} />
            },
            {
              header: 'Risk Score',
              cell: (r) => {
                const score = r.risk_score > 1 ? Math.round(r.risk_score) : Math.round(r.risk_score * 100);
                return (
                  <span className={`font-mono text-xs font-bold ${score > 75 ? 'text-red-400' : (score > 50 ? 'text-orange-400' : 'text-yellow-400')}`}>
                    {score}%
                  </span>
                );
              }
            },
            {
              header: 'Attacker (Source IP)',
              cell: (r) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToGeoMap(r.source_ip);
                  }}
                  className="group flex items-center gap-1.5 font-mono text-xs text-red-400 hover:text-cyber-blue bg-red-500/10 hover:bg-cyber-blue/10 px-2 py-1 rounded border border-red-500/30 hover:border-cyber-blue/50 transition-all text-left"
                  title="Click to track and locate on Global Threat GeoMap"
                >
                  <MapPin className="w-3.5 h-3.5 text-red-400 group-hover:text-cyber-blue group-hover:scale-110 transition-transform" />
                  <span className="font-semibold">{r.source_ip}</span>
                  <Globe className="w-3 h-3 text-gray-500 opacity-60 ml-0.5" />
                </button>
              )
            },
            {
              header: 'Destination (Your System)',
              cell: (r) => (
                <div className="flex items-center gap-1.5 font-mono text-xs text-gray-300">
                  <Server className="w-3.5 h-3.5 text-green-400" />
                  <span>{r.destination_ip || r.dest_ip || '192.168.1.105'}</span>
                  <span className="text-gray-500 text-[10px]">:{r.destination_port || r.dest_port || 22}</span>
                </div>
              )
            },
            {
              header: 'Status',
              cell: (r) => (
                <span className={`px-2 py-0.5 text-xs rounded-full border font-medium ${
                  r.status === 'resolved'
                    ? 'border-green-500/40 text-green-400 bg-green-500/10'
                    : (r.status === 'investigating'
                        ? 'border-blue-500/40 text-blue-400 bg-blue-500/10'
                        : 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10')
                }`}>
                  {r.status?.replace('_', ' ').toUpperCase()}
                </span>
              )
            },
            {
              header: 'Quick Action',
              cell: (r) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToGeoMap(r.source_ip);
                  }}
                  className="flex items-center gap-1 text-xs text-cyber-blue hover:text-white px-2 py-1 rounded bg-blue-500/10 border border-cyber-blue/30 hover:bg-blue-600 transition-colors"
                >
                  <Globe className="w-3 h-3" /> Map Radar
                </button>
              )
            }
          ]}
        />

        {!loading && total > limit && (
          <div className="mt-4">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(total / limit)}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Forensic Modal Dialog */}
      <Modal isOpen={!!selectedThreat} onClose={() => setSelectedThreat(null)} title="Threat Forensic Investigation" maxWidth="max-w-3xl">
        {selectedThreat && (
          <div className="space-y-5">
            {/* Header row in modal */}
            <div className="flex items-center justify-between border-b border-cyber-border pb-3">
              <div className="flex items-center gap-3">
                <ShieldAlert className={`w-8 h-8 ${selectedThreat.severity === 'CRITICAL' ? 'text-red-500' : 'text-orange-500'}`} />
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedThreat.threat_type}</h2>
                  <p className="text-gray-400 text-xs mt-0.5">Detected: {safeFormatDate(selectedThreat.created_at || selectedThreat.detection_time, 'PPP p')}</p>
                </div>
              </div>
              <SeverityBadge severity={selectedThreat.severity} />
            </div>

            {/* Source to Destination Flow Indicator */}
            <div className="bg-cyber-surface border border-cyber-border rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Attacker Source */}
              <div className="text-center sm:text-left">
                <p className="text-[11px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1 justify-center sm:justify-start">
                  <MapPin className="w-3 h-3" /> Attacker Source (Public IP)
                </p>
                <p className="font-mono text-base font-bold text-white mt-0.5">{selectedThreat.source_ip}</p>
                <p className="text-xs text-gray-400 mt-0.5">Port: {selectedThreat.source_port || selectedThreat.src_port || 'Random Dynamic'}</p>
              </div>

              {/* Trajectory Arrow */}
              <div className="flex flex-col items-center justify-center px-3">
                <span className="text-[10px] font-mono text-red-400 font-bold mb-0.5">INBOUND INTRUSION</span>
                <ArrowRight className="w-6 h-6 text-red-500 animate-pulse" />
                <span className="text-[10px] font-mono text-gray-500">{selectedThreat.protocol || 'TCP'}</span>
              </div>

              {/* Protected Destination */}
              <div className="text-center sm:text-right">
                <p className="text-[11px] font-bold uppercase tracking-wider text-green-400 flex items-center gap-1 justify-center sm:justify-end">
                  <Server className="w-3 h-3" /> Target (Your Monitored Asset)
                </p>
                <p className="font-mono text-base font-bold text-white mt-0.5">{selectedThreat.destination_ip || selectedThreat.dest_ip || '192.168.1.105'}</p>
                <p className="text-xs text-gray-400 mt-0.5">Port: {selectedThreat.destination_port || selectedThreat.dest_port || 22} ({selectedThreat.device_name || 'Protected Gateway'})</p>
              </div>
            </div>

            {/* 4 KPI metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-cyber-surface p-3 rounded-lg border border-cyber-border text-center">
                <p className="text-[11px] text-gray-400 mb-0.5">Risk Score</p>
                <p className="font-mono text-lg font-bold text-red-400">
                  {selectedThreat.risk_score > 1 ? Math.round(selectedThreat.risk_score) : Math.round(selectedThreat.risk_score * 100)}%
                </p>
              </div>
              <div className="bg-cyber-surface p-3 rounded-lg border border-cyber-border text-center">
                <p className="text-[11px] text-gray-400 mb-0.5">AI Confidence</p>
                <p className="font-mono text-lg font-bold text-cyber-blue">
                  {selectedThreat.confidence > 1 ? Math.round(selectedThreat.confidence) : Math.round(selectedThreat.confidence * 100)}%
                </p>
              </div>
              <div className="bg-cyber-surface p-3 rounded-lg border border-cyber-border text-center">
                <p className="text-[11px] text-gray-400 mb-0.5">ML Classifier</p>
                <p className="font-mono text-xs font-semibold text-white mt-1">{selectedThreat.ml_model || 'Random Forest'}</p>
              </div>
              <div className="bg-cyber-surface p-3 rounded-lg border border-cyber-border text-center">
                <p className="text-[11px] text-gray-400 mb-0.5">Current Status</p>
                <p className="font-mono text-xs font-bold text-yellow-400 capitalize mt-1">{selectedThreat.status}</p>
              </div>
            </div>

            {/* Forensic Technical Details */}
            <div className="bg-cyber-surface p-4 rounded-lg border border-cyber-border space-y-2 text-xs text-gray-300 font-sans">
              <h3 className="font-semibold text-white text-sm mb-1 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-cyber-blue" />
                AI Inference & Remediation
              </h3>
              <p><strong className="text-gray-400">Detection Reason:</strong> {selectedThreat.detection_reason || 'Anomalous byte asymmetry and pattern matching supervised exploit signatures.'}</p>
              <p><strong className="text-gray-400">Recommended Action:</strong> {selectedThreat.recommended_action || 'Enforce immediate firewall block and isolate affected destination subnet.'}</p>
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-cyber-border">
              <button
                onClick={() => navigateToGeoMap(selectedThreat.source_ip)}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyber-blue text-black font-semibold text-xs rounded-lg hover:bg-cyan-300 transition-colors"
              >
                <Globe className="w-4 h-4" />
                Track & Locate on GeoMap Radar
              </button>

              <div className="flex items-center gap-2.5">
                <select
                  value={selectedThreat.status}
                  onChange={(e) => handleUpdateStatus(selectedThreat.id, e.target.value)}
                  className="px-3 py-2 bg-cyber-surface border border-cyber-border rounded-lg text-xs text-white focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="false_positive">False Positive</option>
                </select>
                <button
                  onClick={() => handleBlockIP(selectedThreat.source_ip, selectedThreat.threat_type)}
                  className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <Ban className="w-3.5 h-3.5" /> Block IP
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ThreatAnalysis;
