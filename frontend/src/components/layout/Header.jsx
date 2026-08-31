import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, Bell, LogOut, User, Activity, Server, ShieldCheck, Lock, UserCheck, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

const ADMIN_PAGE_TITLES = {
  '/home': 'Home Command Hub',
  '/dashboard': 'SOC Live Threat Dashboard',
  '/threat-test': 'AI Threat Simulator & Test Lab',
  '/threat-analysis': 'Threat Forensics & Deep Analysis',
  '/geo-map': 'Global Threat Trajectory Radar',
  '/analytics': 'Threat Analytics & ML Metrics',
  '/blocked-ips': 'Firewall & Blocked IP Rules',
  '/users': 'User Authority & Access Management',
  '/notifications-history': 'Admin & Sub-Admin Directive History',
  '/settings': 'Security Policies & Auto-Defense',
  '/profile': 'Operator Profile & Credentials'
};

const USER_PAGE_TITLES = {
  '/home': 'Home',
  '/dashboard': 'Security Dashboard',
  '/threat-analysis': 'Blocked Attacks',
  '/geo-map': 'Attack Map',
  '/analytics': 'Security Reports',
  '/blocked-ips': 'Blocked Hackers',
  '/settings': 'Settings',
  '/profile': 'My Profile'
};

const USER_FRIENDLY_LABELS = {
  DATA_TAMPERING: '🛡️ Unauthorized Data Edit Blocked',
  DATA_DELETION: '🛡️ Data Deletion / Wipe Prevented',
  DATA_EXFILTRATION: '🛡️ Data Theft Attempt Blocked',
  SQL_INJECTION: '🛡️ Database Breach Blocked',
  BRUTE_FORCE: '🛡️ Hacker Login Attack Blocked',
  MALWARE: '🛡️ Malicious Payload Quarantined',
  PORT_SCAN: '🛡️ Port Scan Blocked',
  DDOS: '🛡️ Traffic Flood Mitigated'
};

const Header = ({ toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllRead } = useNotifications();

  const [showNotifications, setShowNotifications] = useState(false);

  const isSubAdmin = user?.role === 'sub_admin';
  const isAdmin = user?.role === 'admin';
  const isStandardUser = user?.role === 'user';
  const isAdminOrSubAdmin = isAdmin || isSubAdmin;

  const titlesMap = isStandardUser ? USER_PAGE_TITLES : ADMIN_PAGE_TITLES;
  const title = titlesMap[location.pathname] || (isStandardUser ? 'Security Defense' : 'Cyber Threat Defense');

  return (
    <header className="bg-cyber-card border-b border-cyber-border h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-md">
      {/* Left: Hamburger menu toggle for Sidebar & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 bg-cyber-surface hover:bg-cyber-border text-gray-300 hover:text-white rounded-lg border border-cyber-border lg:hidden transition-colors"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5 text-cyber-blue" />
        </button>

        <div>
          <h2 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
            {title}
            {isAdmin && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                <ShieldCheck className="w-3 h-3" /> ADMIN
              </span>
            )}
            {isSubAdmin && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                <Lock className="w-3 h-3" /> READ-ONLY
              </span>
            )}
            {isStandardUser && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                <UserCheck className="w-3 h-3" /> PROTECTED
              </span>
            )}
          </h2>
        </div>
      </div>

      {/* Right: Telemetry Status, Notifications (Admin/Sub-Admin only), Profile */}
      <div className="flex items-center gap-3">
        {/* Real-time AI Health Beacon */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-cyber-surface rounded-full border border-green-500/30 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
          <span className="text-green-400 font-semibold">{isStandardUser ? 'ACTIVE & PROTECTED' : 'AI ACTIVE'}</span>
        </div>

        {/* Notifications Dropdown: Strictly restricted to Admin & Sub-Admin ONLY */}
        {isAdminOrSubAdmin && (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 bg-cyber-surface hover:bg-cyber-border text-gray-300 hover:text-white rounded-lg border border-cyber-border transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-cyber-card animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-cyber-card border border-cyber-border rounded-xl shadow-2xl py-2 z-50 animate-fade-in">
                <div className="px-4 py-2.5 border-b border-cyber-border flex justify-between items-center">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                    Live Intrusion &amp; Sentinel Alerts
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] text-cyber-blue hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-cyber-border/40">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-xs text-gray-500 text-center">
                      No active security alerts
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n, idx) => {
                      const isAutoBlock = n.type === 'auto_blocked';
                      const rawType = n.data?.threat_type || n.title || 'THREAT';
                      const alertTitle = isAutoBlock ? '🛡️ AI Auto-Block Enforced' : (n.title || rawType);
                      const msg = isAutoBlock ? `${n.data?.ip_address} was blocked` : (n.message || `Threat detected from ${n.data?.source_ip || 'host'}`);

                      return (
                        <div key={idx} className="p-3 text-xs hover:bg-cyber-surface/60 transition-colors">
                          <p className="font-bold text-white text-xs">{alertTitle}</p>
                          <p className="text-gray-400 text-[11px] mt-0.5 leading-relaxed">{msg}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Admin & Sub-Admin Full History Link */}
                <div className="pt-2 pb-1 px-4 border-t border-cyber-border/80 text-center">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/notifications-history');
                    }}
                    className="w-full py-1 text-xs font-bold text-cyber-blue hover:text-cyan-300 transition-colors flex items-center justify-center gap-1 font-mono"
                  >
                    <span>View Full Notification History</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile Avatar */}
        <NavLink
          to="/profile"
          className="flex items-center gap-2 p-1.5 bg-cyber-surface hover:bg-cyber-border border border-cyber-border rounded-lg text-xs text-white transition-colors"
          title={isStandardUser ? 'My Profile' : 'Operator Profile'}
        >
          <div className="w-6 h-6 rounded-full bg-cyber-blue/20 border border-cyber-blue/50 flex items-center justify-center text-cyber-blue font-bold text-xs font-mono">
            {user?.email ? user.email[0].toUpperCase() : 'U'}
          </div>
          <span className="hidden md:inline font-mono text-[11px] text-gray-300">
            {user?.email?.split('@')[0]}
          </span>
        </NavLink>
      </div>
    </header>
  );
};

export default Header;
