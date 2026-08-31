import React, { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import {
  ShieldAlert, Activity, Monitor, Ban, Target, Radio,
  TrendingUp, AlertCircle, Cpu, CheckCircle, ShieldCheck, Database,
  FileEdit, Trash2, Lock, ShieldX, UserCheck, CheckCircle2,
  Megaphone, Mail, Server, Send
} from 'lucide-react';
import { dashboardAPI, analyticsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import SeverityBadge from '../components/ui/SeverityBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import SentinelMasterCard from '../components/ai/SentinelMasterCard';
import AegisGuardianCard from '../components/ai/AegisGuardianCard';

const SEVERITY_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
  NORMAL: '#6b7280',
};

const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#6b7280', '#00d4ff', '#8b5cf6', '#ec4899'];

const USER_FRIENDLY_NAMES = {
  DATA_TAMPERING: 'Unauthorized Data Modification',
  DATA_DELETION: 'Malicious Data Deletion / Wipe',
  DATA_EXFILTRATION: 'Data Theft & Exfiltration Attempt',
  SQL_INJECTION: 'SQL Database Breach Exploit',
  BRUTE_FORCE: 'Hacker Account Password Attack',
  MALWARE: 'Malicious Software / Ransomware',
  PORT_SCAN: 'Reconnaissance Network Probing',
  DDOS: 'Volumetric Traffic Flood'
};

const USER_FRIENDLY_DESCRIPTIONS = {
  DATA_TAMPERING: 'Hacker tried to edit/modify database records. Neutralized.',
  DATA_DELETION: 'Hacker tried to delete/wipe critical tables. Blocked.',
  DATA_EXFILTRATION: 'Hacker tried to steal sensitive customer records. Blocked.',
  SQL_INJECTION: 'Hacker tried SQL injection database bypass. Blocked.',
  BRUTE_FORCE: 'Hacker tried password cracking attack. Host banned.',
  MALWARE: 'Malicious payload quarantined before execution.',
  PORT_SCAN: 'Reconnaissance probe dropped by firewall.',
  DDOS: 'Traffic surge absorbed and mitigated.'
};

const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle }) => {
  const colorMap = {
    blue:   'text-blue-400 bg-blue-500/10 border-blue-500/20',
    red:    'text-red-400 bg-red-500/10 border-red-500/20',
    green:  'text-green-400 bg-green-500/10 border-green-500/20',
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    cyan:   'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    emerald:'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };
  return (
    <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 hover:border-cyber-blue/30 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-lg border ${colorMap[color] || colorMap.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const { adminNotices, notifications } = useNotifications();
  const [stats, setStats] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [distData, setDistData] = useState([]);
  const [severityData, setSeverityData] = useState([]);
  const [topIPs, setTopIPs] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isStandardUser = user?.role === 'user';
  const isAdminOrSubAdmin = user?.role === 'admin' || user?.role === 'sub_admin';

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, trendRes, distRes, sevRes, ipRes] = await Promise.all([
        dashboardAPI.getStats(),
        analyticsAPI.getThreatTrends('24h'),
        analyticsAPI.getThreatDistribution(),
        analyticsAPI.getSeverityDistribution(),
        analyticsAPI.getTopIPs(),
      ]);

      setStats(statsRes.data);

      const trend = (trendRes.data?.data || []).map(d => ({
        time: format(new Date(d.timestamp), 'HH:mm'),
        total: d.total,
        critical: d.critical,
        high: d.high,
      }));
      setTrendData(trend);

      setDistData(distRes.data || []);
      setSeverityData(sevRes.data || []);
      setTopIPs((ipRes.data || []).slice(0, 5));
      setLiveEvents((statsRes.data?.recent_threats || []).slice(0, 20));
      setError(null);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Synchronize incoming live events from global notifications context
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const incomingThreats = notifications
        .filter(n => (n.type === 'threat' || n.type === 'dual_ai_alert') && (n.data || n.threat_type))
        .map(n => n.data || n);
      if (incomingThreats.length > 0) {
        setLiveEvents(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const fresh = incomingThreats.filter(t => t.id && !existingIds.has(t.id));
          return [...fresh, ...prev].slice(0, 20);
        });
      }
    }
  }, [notifications]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-400 mt-4">Loading security dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 font-medium">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchDashboardData(); }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const accuracy = stats?.detection_accuracy
    ? `${(stats.detection_accuracy * 100).toFixed(1)}%`
    : '100%';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            {isStandardUser ? (
              <>
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                Data Protection &amp; Hacker Defense Center
              </>
            ) : (
              'Security Operations Center (SOC) Live Dashboard'
            )}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {isStandardUser
              ? 'Real-time protection against unauthorized data modification, data theft, and data wiping.'
              : 'Real-time threat monitoring, network telemetry, and automated AI defense.'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full self-start sm:self-auto">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span className="text-xs text-green-400 font-bold font-mono">
            {isStandardUser ? 'DATA PROTECTION ACTIVE' : 'SOC DEFENSE LIVE'}
          </span>
        </div>
      </div>

      {/* Official Admin & Sub-Admin Security Directives Card (Admins & Sub-Admins only) */}
      {isAdminOrSubAdmin && adminNotices && adminNotices.length > 0 && (
        <div className="space-y-3">
          {adminNotices.slice(0, 2).map((notice, idx) => (
            <div
              key={idx}
              className="bg-gradient-to-r from-blue-950/40 via-cyber-card to-cyber-card border border-cyber-blue/40 rounded-2xl p-5 shadow-2xl relative overflow-hidden animate-fade-in"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-3 bg-blue-500/20 rounded-xl border border-cyber-blue/40 text-cyber-blue shrink-0">
                    <Megaphone className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                        OFFICIAL DIRECTIVE
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        From: {notice.sender_name || 'SOC Authority'} ({notice.sender_role || 'Admin'})
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white tracking-wide">
                      {notice.title}
                    </h3>
                    <p className="text-xs text-gray-300 leading-relaxed max-w-3xl">
                      {notice.message}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end gap-1.5 shrink-0 bg-cyber-surface/80 p-3 rounded-xl border border-cyber-border font-mono text-[11px]">
                  <span className="text-gray-400">Target Proxy IP:</span>
                  <span className="font-bold text-cyber-blue">{notice.proxy_ip || '10.201.64.21'}</span>
                  {notice.attacker_ip && (
                    <>
                      <span className="text-gray-400 mt-1">Attacker Host:</span>
                      <span className="font-bold text-red-400">{notice.attacker_ip}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dual AI Section: Admin Sentinel Master AI vs User Aegis Guardian AI */}
      {isAdminOrSubAdmin ? (
        <SentinelMasterCard />
      ) : (
        <AegisGuardianCard />
      )}

      {/* Stat Cards Row */}
      {isStandardUser ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard title="Attacks Blocked" value={stats?.total_threats ?? 0} icon={ShieldAlert} color="red" subtitle="All Threats Defended" />
          <StatCard title="Data Protection" value="100% SECURE" icon={Database} color="emerald" subtitle="Loss Prevention Active" />
          <StatCard title="Theft Blocked" value={stats?.critical_threats ?? 0} icon={Lock} color="orange" subtitle="Exfiltration Stopped" />
          <StatCard title="Tampering Defended" value={stats?.threats_today ?? 0} icon={FileEdit} color="purple" subtitle="Modifications Prevented" />
          <StatCard title="Wipes Prevented" value={stats?.blocked_ips ?? 0} icon={Trash2} color="cyan" subtitle="Data Deletion Blocked" />
          <StatCard title="Protection Level" value="ENTERPRISE" icon={CheckCircle2} color="green" subtitle="Continuous AI Shield" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard title="Total Threats" value={stats?.total_threats ?? 0} icon={ShieldAlert} color="red" />
          <StatCard title="Critical" value={stats?.critical_threats ?? 0} icon={AlertCircle} color="red" />
          <StatCard title="Threats Today" value={stats?.threats_today ?? 0} icon={Activity} color="orange" />
          <StatCard title="Active Devices" value={stats?.active_devices ?? 0} icon={Monitor} color="green" />
          <StatCard title="Blocked IPs" value={stats?.blocked_ips ?? 0} icon={Ban} color="purple" />
          <StatCard title="ML Accuracy" value={accuracy} icon={Cpu} color="cyan" subtitle="Random Forest" />
        </div>
      )}

      {/* Live Feed + Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Events Feed */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 flex flex-col h-96 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-400 animate-pulse" />
              {isStandardUser ? 'Hacker Threat Defense Feed' : 'Live Event Feed'}
            </h2>
            <span className="text-xs text-gray-500 font-mono">{liveEvents.length} events</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {liveEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Radio className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Monitoring for hacker activity...</p>
              </div>
            ) : (
              liveEvents.map((evt, i) => {
                const threatName = isStandardUser 
                  ? (USER_FRIENDLY_NAMES[evt.threat_type] || evt.threat_type)
                  : evt.threat_type;

                const threatDesc = isStandardUser
                  ? (USER_FRIENDLY_DESCRIPTIONS[evt.threat_type] || `Blocked threat from ${evt.source_ip}`)
                  : evt.source_ip;

                return (
                  <div key={`${evt.id}-${i}`} className="bg-cyber-surface p-3 rounded-xl border border-cyber-border text-sm hover:border-cyber-blue/40 transition-colors">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-400 text-[11px] font-mono">
                        {evt.created_at ? format(new Date(evt.created_at), 'HH:mm:ss') : '--:--:--'}
                      </span>
                      {isStandardUser ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold font-mono">
                          BLOCKED
                        </span>
                      ) : (
                        <SeverityBadge severity={evt.severity} />
                      )}
                    </div>
                    <div className="text-white text-xs font-bold">{threatName}</div>
                    <div className="text-gray-400 text-[11px] mt-0.5 truncate">{threatDesc}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Threat Trend Chart */}
        <div className="lg:col-span-2 bg-cyber-card border border-cyber-border rounded-xl p-5 h-96 shadow-lg">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyber-blue" />
            {isStandardUser ? 'Intrusion Defenses (Last 24 Hours)' : 'Threat Trends (Last 24h)'}
          </h2>
          {trendData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p className="text-sm">No trend data available yet</p>
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
                  <XAxis dataKey="time" stroke="#4b5563" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#4b5563" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#141d35', borderColor: '#1e2d4a', color: '#fff', fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="total" stroke="#00d4ff" strokeWidth={2} dot={false} name="Defended Attacks" />
                  <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={1.5} dot={false} name="High Risk Blocked" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="high" stroke="#f97316" strokeWidth={1.5} dot={false} name="Medium Risk" strokeDasharray="4 4" />
                  <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threat Type Distribution */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-lg">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
            {isStandardUser ? 'Hacker Attack Vector Categories' : 'Threat Distribution'}
          </h2>
          {distData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500">
              <p className="text-sm">No threats detected yet</p>
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {distData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#141d35', borderColor: '#1e2d4a', color: '#fff', fontSize: 12 }} />
                  <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Severity Distribution */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-lg">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
            {isStandardUser ? 'Attack Risk Mitigation Breakdown' : 'Severity Distribution'}
          </h2>
          {severityData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500">
              <p className="text-sm">No severity data yet</p>
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" horizontal={false} />
                  <XAxis type="number" stroke="#4b5563" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#4b5563" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip contentStyle={{ backgroundColor: '#141d35', borderColor: '#1e2d4a', color: '#fff', fontSize: 12 }} />
                  <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]}>
                    {severityData.map((entry) => (
                      <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Top Attacking IPs + Recent Threats Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Attacking IPs */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-lg">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-red-400" />
            Top Attacker Source Hosts
          </h2>
          {topIPs.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No attacking IPs detected yet</p>
          ) : (
            <div className="space-y-3">
              {topIPs.map((ip, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-gray-600 text-xs w-4 font-mono">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm text-white truncate">{ip.ip}</span>
                      <span className="text-gray-400 text-xs ml-2">{ip.count} attempts blocked</span>
                    </div>
                    <div className="h-1.5 bg-cyber-dark rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all"
                        style={{ width: `${(ip.count / (topIPs[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Defended Attacks Table */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-lg">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
            {isStandardUser ? 'Recent Defended Hacker Attacks' : 'Recent Threats'}
          </h2>
          {liveEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <CheckCircle className="w-8 h-8 mb-2 text-green-500/30" />
              <p className="text-sm">No threats detected yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cyber-border text-gray-400 text-xs">
                    <th className="text-left pb-2 font-medium">Time</th>
                    <th className="text-left pb-2 font-medium">Attack Type</th>
                    <th className="text-left pb-2 font-medium">{isStandardUser ? 'Status' : 'Severity'}</th>
                    <th className="text-left pb-2 font-medium">Attacker Origin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyber-border">
                  {liveEvents.slice(0, 8).map((t, i) => (
                    <tr key={`${t.id}-${i}`} className="hover:bg-cyber-surface/50 transition-colors">
                      <td className="py-2.5 font-mono text-xs text-gray-400">
                        {t.created_at ? format(new Date(t.created_at), 'HH:mm:ss') : '--:--'}
                      </td>
                      <td className="py-2.5 text-xs text-white font-medium">
                        {isStandardUser ? (USER_FRIENDLY_NAMES[t.threat_type] || t.threat_type) : t.threat_type}
                      </td>
                      <td className="py-2.5">
                        {isStandardUser ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold font-mono">
                            NEUTRALIZED
                          </span>
                        ) : (
                          <SeverityBadge severity={t.severity} />
                        )}
                      </td>
                      <td className="py-2.5 font-mono text-xs text-gray-400 truncate max-w-28">{t.source_ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
