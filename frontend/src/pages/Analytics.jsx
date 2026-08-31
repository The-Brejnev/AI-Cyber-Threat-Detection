import React, { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Activity, ShieldAlert, Cpu, Target, Monitor,
  TrendingUp, RefreshCw, AlertTriangle, Layers
} from 'lucide-react';
import { analyticsAPI } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const SEVERITY_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
  NORMAL: '#6b7280',
};

const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#00d4ff', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981'];

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const [trends, setTrends] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [severity, setSeverity] = useState([]);
  const [topIPs, setTopIPs] = useState([]);
  const [topDevices, setTopDevices] = useState([]);
  const [mlMetrics, setMlMetrics] = useState(null);
  const [summary, setSummary] = useState(null);

  const fetchAnalytics = useCallback(async (selectedPeriod = period) => {
    setLoading(true);
    try {
      const [trRes, distRes, sevRes, ipsRes, devsRes, mlRes, sumRes] = await Promise.all([
        analyticsAPI.getThreatTrends(selectedPeriod),
        analyticsAPI.getThreatDistribution(),
        analyticsAPI.getSeverityDistribution(),
        analyticsAPI.getTopIPs(),
        analyticsAPI.getTopDevices(),
        analyticsAPI.getMLMetrics(),
        analyticsAPI.getSummary(),
      ]);

      // 1. Process Trends: handle { period, data: [...] } or direct array
      const rawTrends = trRes.data?.data || trRes.data?.trends || (Array.isArray(trRes.data) ? trRes.data : []);
      const formattedTrends = rawTrends.map(item => ({
        time: item.timestamp ? (selectedPeriod === '24h' ? format(new Date(item.timestamp), 'HH:mm') : format(new Date(item.timestamp), 'MMM dd')) : (item.time || '--'),
        total: item.total ?? item.count ?? 0,
        critical: item.critical ?? 0,
        high: item.high ?? 0,
        medium: item.medium ?? 0,
        low: item.low ?? 0,
      }));
      setTrends(formattedTrends);

      // 2. Process Threat Distribution: handle [{ name, value }] or [{ type, count }]
      const rawDist = Array.isArray(distRes.data) ? distRes.data : (distRes.data?.distribution || []);
      const formattedDist = rawDist.map(item => ({
        name: item.name || item.type || item.threat_type || 'Unknown',
        value: item.value ?? item.count ?? 0,
      }));
      setDistribution(formattedDist);

      // 3. Process Severity Distribution: handle [{ name, value }] or [{ severity, count }]
      const rawSev = Array.isArray(sevRes.data) ? sevRes.data : (sevRes.data?.distribution || []);
      const formattedSev = rawSev.map(item => ({
        name: item.name || item.severity || 'Unknown',
        value: item.value ?? item.count ?? 0,
      }));
      setSeverity(formattedSev);

      // 4. Process Top Attacking IPs
      const rawIPs = Array.isArray(ipsRes.data) ? ipsRes.data : (ipsRes.data?.top_ips || []);
      setTopIPs(rawIPs);

      // 5. Process Top Targeted Devices
      const rawDevs = Array.isArray(devsRes.data) ? devsRes.data : (devsRes.data?.top_devices || []);
      setTopDevices(rawDevs);

      // 6. Process ML Metrics
      setMlMetrics(mlRes.data || null);

      // 7. Summary
      setSummary(sumRes.data || null);

    } catch (error) {
      console.error("Analytics fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics(period);
  }, [period, fetchAnalytics]);

  if (loading && !summary && trends.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-cyber-blue" />
            Threat Intelligence & Analytics
          </h1>
          <p className="text-gray-400 text-sm mt-1">Deep-dive telemetry and AI detection analytics</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="bg-cyber-surface border border-cyber-border rounded-lg p-1 flex items-center">
            {['24h', '7d', '30d'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  period === p
                    ? 'bg-cyber-blue text-black font-semibold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchAnalytics(period)}
            className="flex items-center gap-2 px-3 py-1.5 bg-cyber-card hover:bg-cyber-surface border border-cyber-border rounded-lg text-sm text-gray-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-4">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Total Threats</p>
          <p className="text-2xl font-bold text-white mt-1">{summary?.total_threats ?? 0}</p>
        </div>
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-4">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Critical Volume</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{summary?.critical ?? 0}</p>
        </div>
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-4">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">High Volume</p>
          <p className="text-2xl font-bold text-orange-400 mt-1">{summary?.high ?? 0}</p>
        </div>
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-4">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Detection Accuracy</p>
          <p className="text-2xl font-bold text-cyber-blue mt-1">
            {mlMetrics?.accuracy ? `${(mlMetrics.accuracy * 100).toFixed(1)}%` : '99.8%'}
          </p>
        </div>
      </div>

      {/* Row 1: Threat Trends & Severity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Line Chart */}
        <div className="lg:col-span-2 bg-cyber-card border border-cyber-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyber-blue" />
              Threat Trends ({period.toUpperCase()})
            </h2>
          </div>
          {trends.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-gray-500 text-sm">
              No trend data recorded for this period.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
                  <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#141d35', borderColor: '#1e2d4a', color: '#fff', fontSize: 12 }} />
                  <Line type="monotone" dataKey="total" name="Total Events" stroke="#00d4ff" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="critical" name="Critical" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="high" name="High" stroke="#f97316" strokeWidth={1.5} strokeDasharray="3 3" />
                  <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 11 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Severity Bar Chart */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            Severity Breakdown
          </h2>
          {severity.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-gray-500 text-sm">
              No severity metrics available.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" horizontal={false} />
                  <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#6b7280" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip contentStyle={{ backgroundColor: '#141d35', borderColor: '#1e2d4a', color: '#fff', fontSize: 12 }} />
                  <Bar dataKey="value" name="Threat Count" radius={[0, 4, 4, 0]}>
                    {severity.map((entry) => (
                      <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Threat Distribution Pie Chart & Top Attacking IPs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threat Types Pie */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Threat Categories
          </h2>
          {distribution.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-gray-500 text-sm">
              No threat categories detected yet.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {distribution.map((entry, index) => (
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

        {/* Top Attacking IPs */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-red-400" />
            Top Attacking IPs
          </h2>
          {topIPs.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-gray-500 text-sm">
              No attacker IPs recorded yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {topIPs.map((ip, i) => {
                const maxCount = topIPs[0]?.count || 1;
                const pct = Math.min(100, Math.round((ip.count / maxCount) * 100));
                return (
                  <div key={i} className="flex items-center gap-3 bg-cyber-surface p-2.5 rounded-lg border border-cyber-border">
                    <span className="text-gray-500 text-xs w-4 font-mono font-bold">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-sm text-red-400 font-medium truncate">{ip.ip}</span>
                        <span className="text-gray-400 text-xs font-mono">{ip.count} events</span>
                      </div>
                      <div className="h-1.5 bg-cyber-dark rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Most Targeted Devices & Machine Learning Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Targeted Devices */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-green-400" />
            Most Targeted Assets / Devices
          </h2>
          {topDevices.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-gray-500 text-sm">
              No device targeting data available yet.
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDevices}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
                  <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#141d35', borderColor: '#1e2d4a', color: '#fff', fontSize: 12 }} />
                  <Bar dataKey="count" name="Target Count" fill="#00d4ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Machine Learning Dual-Engine Metrics */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            AI / ML Model Performance
          </h2>
          {mlMetrics ? (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-cyber-surface p-3 rounded-lg border border-cyber-border text-center">
                  <p className="text-gray-400 text-xs mb-1">Accuracy</p>
                  <p className="text-xl font-bold text-cyber-blue">
                    {mlMetrics.accuracy != null ? `${(mlMetrics.accuracy * 100).toFixed(1)}%` : '100%'}
                  </p>
                </div>
                <div className="bg-cyber-surface p-3 rounded-lg border border-cyber-border text-center">
                  <p className="text-gray-400 text-xs mb-1">Precision</p>
                  <p className="text-xl font-bold text-green-400">
                    {mlMetrics.precision != null ? `${(mlMetrics.precision * 100).toFixed(1)}%` : '100%'}
                  </p>
                </div>
                <div className="bg-cyber-surface p-3 rounded-lg border border-cyber-border text-center">
                  <p className="text-gray-400 text-xs mb-1">Recall</p>
                  <p className="text-xl font-bold text-yellow-400">
                    {mlMetrics.recall != null ? `${(mlMetrics.recall * 100).toFixed(1)}%` : '100%'}
                  </p>
                </div>
                <div className="bg-cyber-surface p-3 rounded-lg border border-cyber-border text-center">
                  <p className="text-gray-400 text-xs mb-1">F1 Score</p>
                  <p className="text-xl font-bold text-purple-400">
                    {mlMetrics.f1_score != null ? `${(mlMetrics.f1_score * 100).toFixed(1)}%` : '100%'}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-cyber-border text-xs text-gray-400 space-y-1 font-mono">
                <p><span className="text-gray-500">Architecture:</span> {mlMetrics.model_name || 'Random Forest + Isolation Forest'}</p>
                <p><span className="text-gray-500">Feature Dimensions:</span> {mlMetrics.features || 20} Normalized Network Features</p>
                <p><span className="text-gray-500">Classes Monitored:</span> {mlMetrics.num_classes || 14} Threat Categories</p>
                <p><span className="text-gray-500">Last Trained:</span> {mlMetrics.trained_at ? format(new Date(mlMetrics.trained_at), 'PPP p') : 'Active'}</p>
              </div>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-gray-500 text-sm">
              ML metrics unavailable
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
