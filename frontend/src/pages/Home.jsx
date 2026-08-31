import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, LayoutDashboard, AlertTriangle, Globe, BarChart3,
  Ban, Settings as SettingsIcon, User, FlaskConical, Zap,
  Activity, ArrowRight, Server, Radio, Lock, Terminal, Users as UsersIcon,
  ShieldCheck, Database, FileCode, CheckCircle2, UserCheck, Bot
} from 'lucide-react';
import { dashboardAPI, geoAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SentinelMasterCard from '../components/ai/SentinelMasterCard';
import AegisGuardianCard from '../components/ai/AegisGuardianCard';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [geoSummary, setGeoSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuickData = async () => {
      try {
        const [dashRes, geoRes] = await Promise.allSettled([
          dashboardAPI.getStats(),
          geoAPI.getThreats()
        ]);
        if (dashRes.status === 'fulfilled') setStats(dashRes.value.data);
        if (geoRes.status === 'fulfilled') {
          const raw = geoRes.value.data;
          const list = Array.isArray(raw) ? raw : (raw?.threats || raw?.items || []);
          setGeoSummary({
            total_mapped_ips: list.length,
            countries_count: new Set(list.map(t => t?.country_code).filter(Boolean)).size
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchQuickData();
  }, []);

  const isAdminOrSubAdmin = user?.role === 'admin' || user?.role === 'sub_admin';

  const menuModules = [
    {
      id: 'dashboard',
      title: 'SOC Live Dashboard',
      subtitle: 'Real-Time Monitoring & Telemetry',
      description: 'Live threat stream, data protection metrics, intruder rates, and attacking IP metrics.',
      userTitle: 'Security Dashboard',
      userSubtitle: 'Live Protection Status',
      userDescription: 'See live protection status, defended hacker attempts, and system safety.',
      icon: LayoutDashboard,
      color: 'from-blue-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30',
      badge: `${stats?.total_threats ?? 'Live'} Threats`,
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      path: '/dashboard'
    },
    {
      id: 'threat-test',
      title: 'AI Threat Test Lab',
      subtitle: 'Packet Simulator & Exploit Tester',
      description: 'Craft custom network packets or test 1-click exploit presets against the trained Random Forest & Isolation Forest ML models.',
      userTitle: 'AI Threat Test Lab',
      userSubtitle: 'Testing Simulator',
      userDescription: 'Testing tools for administrators.',
      icon: FlaskConical,
      color: 'from-purple-500/20 to-pink-500/20 text-pink-400 border-pink-500/30',
      badge: 'Interactive Lab',
      badgeColor: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
      path: '/threat-test',
      roles: ['admin', 'sub_admin']
    },
    {
      id: 'threat-analysis',
      title: 'Threat Forensics',
      subtitle: 'Inbound Attack Deep Inspection',
      description: 'Forensic inspection of security events, source-to-destination vector mapping, status workflows, and GeoMap linking.',
      userTitle: 'Blocked Attacks',
      userSubtitle: 'Attack History & Details',
      userDescription: 'Review all hacker attempts and attacks that were blocked on your account.',
      icon: AlertTriangle,
      color: 'from-red-500/20 to-orange-500/20 text-red-400 border-red-500/30',
      badge: `${stats?.critical_threats ?? 0} Blocked`,
      badgeColor: 'bg-red-500/10 text-red-400 border-red-500/30',
      path: '/threat-analysis'
    },
    {
      id: 'geo-map',
      title: 'Global Threat Radar',
      subtitle: 'Geographic Attack Trajectory Vectors',
      description: 'Interactive Leaflet radar map tracking public attacker host coordinates streaming into your protected system.',
      userTitle: 'Attack Map',
      userSubtitle: 'Hacker World Map',
      userDescription: 'Interactive world map showing locations where blocked hacker attempts originated.',
      icon: Globe,
      color: 'from-blue-600/20 to-indigo-600/20 text-cyber-blue border-cyber-blue/30',
      badge: `${geoSummary?.total_mapped_ips ?? 97} Locations`,
      badgeColor: 'bg-blue-500/10 text-cyber-blue border-cyber-blue/30',
      path: '/geo-map'
    },
    {
      id: 'analytics',
      title: 'Threat Analytics',
      subtitle: 'ML Model Performance & Time Trends',
      description: '6-dimensional analytical views: 24h/7d/30d trends, attack category breakdown, targeted assets, and ML accuracy metrics.',
      userTitle: 'Security Reports',
      userSubtitle: 'Charts & Statistics',
      userDescription: 'Easy charts and visual reports showing defense trends and protection history.',
      icon: BarChart3,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
      badge: `${stats?.detection_accuracy ? Math.round(stats.detection_accuracy * 100) : 100}% Accuracy`,
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      path: '/analytics'
    },
    {
      id: 'blocked-ips',
      title: 'Firewall & Blocked IPs',
      subtitle: 'Access Control & Auto-Defense',
      description: 'Active firewall rules, automated mitigation enforcements, manual host blocking, and unblock management.',
      userTitle: 'Blocked Hackers',
      userSubtitle: 'Blocked IP Addresses',
      userDescription: 'View the list of hacker IP addresses that were blocked by active defense.',
      icon: Ban,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
      badge: `${stats?.blocked_ips ?? 0} Blocked`,
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      path: '/blocked-ips'
    },
    {
      id: 'users',
      title: 'User Authority & Access',
      subtitle: 'Role Hierarchy & Sub-Admin Control',
      description: 'Review system users, grant elevated Sub-Admin (Read-Only) permissions, and administer SOC team accounts.',
      userTitle: 'Users & Authority',
      userSubtitle: 'Team Accounts',
      userDescription: 'Manage user access permissions.',
      icon: UsersIcon,
      color: 'from-blue-500/20 to-indigo-500/20 text-cyber-blue border-cyber-blue/30',
      badge: 'Admin Authority',
      badgeColor: 'bg-cyan-500/10 text-cyber-blue border-cyber-blue/30',
      path: '/users',
      roles: ['admin', 'sub_admin']
    },
    {
      id: 'settings',
      title: 'Security Policies & Defense',
      subtitle: 'Automated AI Defense & Notifications',
      description: 'Configure auto-blocking severity cutoffs, risk sensitivity thresholds, Gmail SMTP alert channels, and session management.',
      userTitle: 'Settings',
      userSubtitle: 'Notification & Security Preferences',
      userDescription: 'Manage email alert notifications, dashboard refresh rate, and security preferences.',
      icon: SettingsIcon,
      color: 'from-gray-500/20 to-slate-500/20 text-gray-300 border-gray-500/30',
      badge: 'Active',
      badgeColor: 'bg-green-500/10 text-green-400 border-green-500/30',
      path: '/settings'
    },
    {
      id: 'profile',
      title: 'Operator Profile',
      subtitle: 'Account & Credential Security',
      description: 'Manage SOC analyst profile details, email address, password updates, and account security.',
      userTitle: 'My Profile',
      userSubtitle: 'Account & Password',
      userDescription: 'Manage your name, phone number, email address, and update your account password.',
      icon: User,
      color: 'from-sky-500/20 to-blue-500/20 text-sky-400 border-sky-500/30',
      badge: 'Account',
      badgeColor: 'bg-blue-500/10 text-sky-400 border-sky-500/30',
      path: '/profile'
    }
  ];

  const visibleModules = menuModules.filter(mod => !mod.roles || mod.roles.includes(user?.role));

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-950/40 via-cyber-card to-cyber-card border border-cyber-border rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                <Radio className="w-3 h-3 animate-pulse text-cyan-400" />
                {isAdminOrSubAdmin ? 'SYSTEM ACTIVE & DEFENDING' : 'ACTIVE & PROTECTED'}
              </span>
              {user?.role === 'admin' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                  PRIMARY ADMIN
                </span>
              )}
              {user?.role === 'sub_admin' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                  SUB-ADMIN (READ-ONLY)
                </span>
              )}
              {user?.role === 'user' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  USER ACCOUNT
                </span>
              )}
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">{user?.email?.split('@')[0] || 'User'}</span>
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl">
              {isAdminOrSubAdmin 
                ? 'AI/ML Cyber Threat Detection & Active Defense Command Center. All defensive neural models, telemetry streams, and firewalls are operational.'
                : 'Your account is actively protected against hacker data tampering, data theft, and data deletion.'}
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex items-center gap-3 bg-cyber-surface/80 p-3.5 rounded-xl border border-cyber-border/80 backdrop-blur-sm self-start md:self-auto font-mono text-xs">
            <div className="p-2 bg-blue-500/10 rounded-lg text-cyber-blue">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <p className="text-gray-400 text-[10px] uppercase font-bold">Protected Device</p>
              <p className="text-xs font-mono font-bold text-white">System IP: 10.201.64.21</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dual AI Section: Admin Sentinel Master AI vs User Aegis Guardian AI */}
      {isAdminOrSubAdmin ? (
        <SentinelMasterCard />
      ) : (
        <AegisGuardianCard />
      )}

      {/* Main Module Navigation Menu Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyber-blue" />
            {isAdminOrSubAdmin ? 'Security Modules & Operations' : 'Main Security Features'}
          </h2>
          <span className="text-xs text-gray-400 font-mono">Select a feature to open</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleModules.map((mod) => {
            const Icon = mod.icon;
            const cardTitle = isAdminOrSubAdmin ? mod.title : mod.userTitle;
            const cardSubtitle = isAdminOrSubAdmin ? mod.subtitle : mod.userSubtitle;
            const cardDesc = isAdminOrSubAdmin ? mod.description : mod.userDescription;

            return (
              <div
                key={mod.id}
                onClick={() => navigate(mod.path)}
                className="group bg-cyber-card hover:bg-cyber-surface/80 border border-cyber-border hover:border-cyber-blue/60 rounded-xl p-5 cursor-pointer transition-all duration-300 flex flex-col justify-between hover:shadow-xl hover:shadow-cyan-500/5 relative overflow-hidden"
              >
                {/* Subtle Hover Gradient Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-cyber-blue/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="space-y-3 relative z-10">
                  <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${mod.color} border flex items-center justify-center group-hover:scale-105 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${mod.badgeColor}`}>
                      {mod.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyber-blue transition-colors">
                      {cardTitle}
                    </h3>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                      {cardSubtitle}
                    </p>
                  </div>

                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {cardDesc}
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-cyber-border/60 flex items-center justify-between text-xs font-semibold text-gray-400 group-hover:text-cyber-blue transition-colors relative z-10">
                  <span>Open</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin/Sub-Admin Quick Launch Threat Test Banner */}
      {isAdminOrSubAdmin && (
        <div className="bg-gradient-to-r from-purple-950/30 via-cyber-card to-cyber-card border border-pink-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-pink-500/20 rounded-xl border border-pink-500/40 text-pink-400">
              <FlaskConical className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Need to verify AI detection against live attack signatures?</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Launch the AI Threat Test Lab to simulate SSH brute force, UDP DDoS, SQL injection, and packet anomalies.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/threat-test')}
            className="whitespace-nowrap px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-pink-500/20"
          >
            Open Threat Test Lab &rarr;
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
