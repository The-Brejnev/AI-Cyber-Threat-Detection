import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical, Zap, ShieldAlert, CheckCircle2, Globe, AlertTriangle,
  Server, ArrowRight, Play, RotateCcw, Ban, Sparkles, Activity, MapPin
} from 'lucide-react';
import { threatsAPI, blockedIPsAPI } from '../services/api';
import toast from 'react-hot-toast';
import SeverityBadge from '../components/ui/SeverityBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const PRESETS = [
  {
    name: 'SSH Brute Force Attack',
    type: 'BRUTE_FORCE',
    description: 'Repeated unauthorized credential stuffing against SSH authentication port 22.',
    event: {
      source_ip: '185.220.101.5',
      destination_ip: '10.201.64.21',
      source_port: 51234,
      destination_port: 22,
      protocol: 'TCP',
      bytes_sent: 350,
      bytes_received: 120,
      duration_ms: 450.0,
      flags: 'SYN'
    }
  },
  {
    name: 'Volumetric UDP DDoS Flood',
    type: 'DDOS',
    description: 'High-bandwidth volumetric UDP packet burst designed to overwhelm the web gateway.',
    event: {
      source_ip: '103.203.57.18',
      destination_ip: '10.201.64.21',
      source_port: 44120,
      destination_port: 80,
      protocol: 'UDP',
      bytes_sent: 48500,
      bytes_received: 0,
      duration_ms: 65.0,
      flags: 'NONE'
    }
  },
  {
    name: 'Multi-Port SYN Reconnaissance Scan',
    type: 'PORT_SCAN',
    description: 'Rapid low-byte TCP SYN probing across service ports to map vulnerabilities.',
    event: {
      source_ip: '45.33.32.156',
      destination_ip: '10.201.64.21',
      source_port: 39820,
      destination_port: 445,
      protocol: 'TCP',
      bytes_sent: 64,
      bytes_received: 0,
      duration_ms: 4.5,
      flags: 'SYN'
    }
  },
  {
    name: 'SQL Injection Web Exploit',
    type: 'SQL_INJECTION',
    description: 'Malicious SQL payload targeting backend relational database server on port 3306.',
    event: {
      source_ip: '179.43.155.22',
      destination_ip: '10.201.64.21',
      source_port: 52100,
      destination_port: 3306,
      protocol: 'TCP',
      bytes_sent: 920,
      bytes_received: 2400,
      duration_ms: 85.0,
      flags: 'PSH,ACK'
    }
  },
  {
    name: 'Botnet Command & Control (C2)',
    type: 'BOTNET',
    description: 'Asymmetric beaconing connection to known Command & Control distribution nodes.',
    event: {
      source_ip: '194.26.29.112',
      destination_ip: '10.201.64.21',
      source_port: 60230,
      destination_port: 8080,
      protocol: 'TCP',
      bytes_sent: 180,
      bytes_received: 320,
      duration_ms: 320.0,
      flags: 'SYN,ACK'
    }
  },
  {
    name: 'Legitimate HTTPS Web Traffic',
    type: 'NORMAL',
    description: 'Standard encrypted TLS HTTPS web traffic with symmetrical TCP handshakes.',
    event: {
      source_ip: '157.50.180.145',
      destination_ip: '10.201.64.21',
      source_port: 54100,
      destination_port: 443,
      protocol: 'TCP',
      bytes_sent: 2400,
      bytes_received: 8500,
      duration_ms: 210.0,
      flags: 'ACK'
    }
  }
];

const ThreatTest = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    source_ip: '185.220.101.5',
    destination_ip: '10.201.64.21',
    source_port: 51234,
    destination_port: 22,
    protocol: 'TCP',
    bytes_sent: 350,
    bytes_received: 120,
    duration_ms: 450.0,
    flags: 'SYN'
  });

  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const applyPreset = (preset) => {
    setFormData(preset.event);
    toast.success(`Loaded preset: ${preset.name}`, { icon: '🧪' });
  };

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    setAnalyzing(true);
    setResult(null);

    try {
      const payload = {
        ...formData,
        source_port: parseInt(formData.source_port),
        destination_port: parseInt(formData.destination_port),
        bytes_sent: parseInt(formData.bytes_sent),
        bytes_received: parseInt(formData.bytes_received),
        duration_ms: parseFloat(formData.duration_ms)
      };

      const { data } = await threatsAPI.analyze(payload);
      setResult(data);

      const historyItem = {
        timestamp: new Date().toLocaleTimeString(),
        source_ip: formData.source_ip,
        destination_port: formData.destination_port,
        threat_type: data.prediction?.threat_type || 'NORMAL',
        severity: data.prediction?.severity || 'LOW',
        risk_score: data.prediction?.risk_score || 0,
        auto_blocked: data.auto_blocked || false
      };

      setHistory(prev => [historyItem, ...prev].slice(0, 10));

      if (data.is_threat) {
        toast.error(`AI Model Identified Threat: ${data.prediction.threat_type} (${data.prediction.severity})`, {
          icon: '🚨'
        });
      } else {
        toast.success('AI Model Identified: NORMAL Traffic (No Anomaly)', {
          icon: '✅'
        });
      }
    } catch (err) {
      console.error('Analysis error:', err);
      toast.error(err.response?.data?.detail || 'Failed to execute AI packet analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleQuickBlock = async (ip, reason, threatType) => {
    try {
      await blockedIPsAPI.blockIP({
        ip_address: ip,
        reason: reason || 'Blocked from AI Threat Test Lab',
        threat_type: threatType || 'LAB_INJECTION_TEST'
      });
      toast.success(`Enforced immediate firewall block on ${ip}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to block ${ip}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-pink-400" />
            AI Threat Simulator & Packet Test Lab
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Craft simulated intrusion packets or test exploit signatures against the live trained Random Forest & Isolation Forest ML models
          </p>
        </div>
      </div>

      {/* Exploit Presets Carousel / Quick Buttons */}
      <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyber-blue" />
          1-Click Exploit & Traffic Signature Presets
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(preset)}
              className="p-3 bg-cyber-surface hover:bg-cyber-surface/90 border border-cyber-border hover:border-pink-500/50 rounded-xl text-left transition-all hover:scale-[1.02] flex flex-col justify-between"
            >
              <div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${preset.type === 'NORMAL' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {preset.type}
                </span>
                <p className="text-xs font-bold text-white mt-1.5 line-clamp-1">{preset.name}</p>
              </div>
              <p className="text-[11px] text-gray-400 mt-2 line-clamp-2">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Main Grid: Packet Crafter & Real-Time AI Result */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Custom Packet Crafter Form */}
        <div className="lg:col-span-6 bg-cyber-card border border-cyber-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-cyber-border pb-3">
            <Zap className="w-4 h-4 text-cyber-blue" />
            Network Packet Parameters
          </h2>

          <form onSubmit={handleAnalyze} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Source IP (Attacker Host) *</label>
                <input
                  type="text"
                  required
                  value={formData.source_ip}
                  onChange={e => setFormData({ ...formData, source_ip: e.target.value })}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyber-blue"
                  placeholder="e.g. 185.220.101.5"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Destination IP (Target Host) *</label>
                <input
                  type="text"
                  required
                  value={formData.destination_ip}
                  onChange={e => setFormData({ ...formData, destination_ip: e.target.value })}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-green-400"
                  placeholder="e.g. 10.201.64.21"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Source Port</label>
                <input
                  type="number"
                  required
                  value={formData.source_port}
                  onChange={e => setFormData({ ...formData, source_port: e.target.value })}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyber-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Dest Port (Target)</label>
                <input
                  type="number"
                  required
                  value={formData.destination_port}
                  onChange={e => setFormData({ ...formData, destination_port: e.target.value })}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyber-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Protocol</label>
                <select
                  value={formData.protocol}
                  onChange={e => setFormData({ ...formData, protocol: e.target.value })}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-blue"
                >
                  <option value="TCP">TCP</option>
                  <option value="UDP">UDP</option>
                  <option value="ICMP">ICMP</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Bytes Sent</label>
                <input
                  type="number"
                  required
                  value={formData.bytes_sent}
                  onChange={e => setFormData({ ...formData, bytes_sent: e.target.value })}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyber-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Bytes Received</label>
                <input
                  type="number"
                  required
                  value={formData.bytes_received}
                  onChange={e => setFormData({ ...formData, bytes_received: e.target.value })}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyber-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Duration (ms)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.duration_ms}
                  onChange={e => setFormData({ ...formData, duration_ms: e.target.value })}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyber-blue"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">TCP Control Flags</label>
              <input
                type="text"
                value={formData.flags}
                onChange={e => setFormData({ ...formData, flags: e.target.value })}
                className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyber-blue"
                placeholder="e.g. SYN, ACK, PSH,ACK, RST"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                disabled={analyzing}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Analyzing with ML Engine...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Execute AI Packet Analysis
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Live AI Inference Result Panel */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 flex-1 flex flex-col space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center justify-between border-b border-cyber-border pb-3">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-pink-400" />
                Live AI Inference & Forensic Verdict
              </span>
              {result && (
                <span className="text-[11px] font-mono text-gray-400">
                  Model: Random Forest + IsoForest
                </span>
              )}
            </h2>

            {!result && !analyzing && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-500 space-y-3">
                <div className="p-4 bg-cyber-surface rounded-full border border-cyber-border">
                  <FlaskConical className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-300 font-medium">Ready to inspect network packet</p>
                <p className="text-xs text-gray-500 max-w-sm">
                  Select an exploit preset above or customize packet attributes, then click <strong>"Execute AI Packet Analysis"</strong>.
                </p>
              </div>
            )}

            {analyzing && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
                <LoadingSpinner size="lg" />
                <p className="text-sm text-cyan-400 font-mono animate-pulse">Running 20-feature ML inference vector...</p>
              </div>
            )}

            {result && !analyzing && (
              <div className="space-y-4 animate-fade-in">
                {/* Threat Category & Severity Hero */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  result.prediction?.threat_type === 'NORMAL'
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/40'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${result.prediction?.threat_type === 'NORMAL' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {result.prediction?.threat_type === 'NORMAL' ? <CheckCircle2 className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Classified Category</p>
                      <h3 className="text-lg font-bold text-white font-mono">{result.prediction?.threat_type}</h3>
                    </div>
                  </div>

                  <SeverityBadge severity={result.prediction?.severity} />
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-cyber-surface p-3 rounded-lg border border-cyber-border text-center">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Risk Score</p>
                    <p className="text-base font-bold font-mono text-red-400 mt-0.5">
                      {Math.round(result.prediction?.risk_score > 1 ? result.prediction?.risk_score : result.prediction?.risk_score * 100)}%
                    </p>
                  </div>

                  <div className="bg-cyber-surface p-3 rounded-lg border border-cyber-border text-center">
                    <p className="text-[10px] uppercase font-bold text-gray-400">AI Confidence</p>
                    <p className="text-base font-bold font-mono text-cyber-blue mt-0.5">
                      {Math.round(result.prediction?.confidence > 1 ? result.prediction?.confidence : result.prediction?.confidence * 100)}%
                    </p>
                  </div>

                  <div className="bg-cyber-surface p-3 rounded-lg border border-cyber-border text-center">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Auto-Mitigation</p>
                    <p className={`text-xs font-bold font-mono mt-1 ${result.auto_blocked ? 'text-green-400' : 'text-gray-400'}`}>
                      {result.auto_blocked ? 'ENFORCED' : 'PASSED'}
                    </p>
                  </div>
                </div>

                {/* Detection Reason & Remediation */}
                <div className="bg-cyber-surface p-3.5 rounded-lg border border-cyber-border space-y-2 text-xs text-gray-300">
                  <p><strong className="text-gray-400">Detection Reason:</strong> {result.prediction?.detection_reason || 'Anomalous network distribution matching supervised attack classes.'}</p>
                  <p><strong className="text-gray-400">Recommended Action:</strong> {result.prediction?.recommended_action || 'Monitor host and isolate target port.'}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2.5 pt-2">
                  <button
                    onClick={() => navigate(`/geo-map?focus=${encodeURIComponent(formData.source_ip)}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600/20 border border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-black rounded-lg text-xs font-semibold transition-all"
                  >
                    <Globe className="w-4 h-4" /> Locate on GeoMap Radar
                  </button>

                  <button
                    onClick={() => navigate('/threat-analysis')}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-cyber-surface hover:bg-cyber-border border border-cyber-border text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    View All Forensics
                  </button>

                  {result.is_threat && (
                    <button
                      onClick={() => handleQuickBlock(formData.source_ip, `Test Lab Enforced Block (${result.prediction?.threat_type})`, result.prediction?.threat_type)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" /> Block IP
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session Test History */}
      {history.length > 0 && (
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Session Packet Test History ({history.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-cyber-border text-gray-400">
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Source Host</th>
                  <th className="pb-2">Target Port</th>
                  <th className="pb-2">Classified Type</th>
                  <th className="pb-2">Severity</th>
                  <th className="pb-2">Risk Score</th>
                  <th className="pb-2">Auto-Block</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-border/40 font-mono">
                {history.map((item, i) => (
                  <tr key={i} className="hover:bg-cyber-surface/50">
                    <td className="py-2 text-gray-400">{item.timestamp}</td>
                    <td className="py-2 text-white">{item.source_ip}</td>
                    <td className="py-2 text-gray-300">Port {item.destination_port}</td>
                    <td className="py-2 text-cyan-400 font-bold">{item.threat_type}</td>
                    <td className="py-2"><SeverityBadge severity={item.severity} /></td>
                    <td className="py-2 text-red-400">{Math.round(item.risk_score > 1 ? item.risk_score : item.risk_score * 100)}%</td>
                    <td className="py-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.auto_blocked ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {item.auto_blocked ? 'BLOCKED' : 'PASS'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreatTest;
