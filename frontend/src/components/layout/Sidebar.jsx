import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Shield, LayoutDashboard, AlertTriangle, Globe, BarChart3,
  Ban, Settings as SettingsIcon, User, FlaskConical, Users as UsersIcon,
  LogOut, Home as HomeIcon, Lock, ShieldCheck, ChevronRight, X, Bell, UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { name: 'Home Command Hub', userFriendlyName: 'Home', path: '/home', icon: HomeIcon },
  { name: 'SOC Live Dashboard', userFriendlyName: 'Security Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'AI Threat Test Lab', userFriendlyName: 'AI Threat Test Lab', path: '/threat-test', icon: FlaskConical, roles: ['admin', 'sub_admin'] },
  { name: 'Threat Forensics', userFriendlyName: 'Blocked Attacks', path: '/threat-analysis', icon: AlertTriangle },
  { name: 'Global Threat Radar', userFriendlyName: 'Attack Map', path: '/geo-map', icon: Globe },
  { name: 'Threat Analytics', userFriendlyName: 'Security Reports', path: '/analytics', icon: BarChart3 },
  { name: 'Firewall & Blocked IPs', userFriendlyName: 'Blocked Hackers', path: '/blocked-ips', icon: Ban },
  { name: 'Users & Authority', userFriendlyName: 'Users & Authority', path: '/users', icon: UsersIcon, roles: ['admin', 'sub_admin'] },
  { name: 'Directive & Alert History', userFriendlyName: 'Notification History', path: '/notifications-history', icon: Bell, roles: ['admin', 'sub_admin'] },
  { name: 'Security & Auto-Defense', userFriendlyName: 'Settings', path: '/settings', icon: SettingsIcon },
  { name: 'Operator Profile', userFriendlyName: 'My Profile', path: '/profile', icon: User },
];

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isSubAdmin = user?.role === 'sub_admin';
  const isAdmin = user?.role === 'admin';
  const isStandardUser = user?.role === 'user';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-cyber-card border-r border-cyber-border flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Brand & Role Banner */}
        <div className="p-4 border-b border-cyber-border/80">
          <div className="flex items-center justify-between">
            <NavLink to="/home" className="flex items-center gap-2.5 group">
              <div className="p-2 rounded-xl bg-blue-500/20 border border-cyber-blue/40 text-cyber-blue group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-white tracking-wide">
                  CyberGuard <span className="text-cyber-blue">AI</span>
                </h1>
                <p className="text-[10px] text-gray-400 font-mono">
                  {isAdmin || isSubAdmin ? 'SOC THREAT DEFENSE' : 'DATA PROTECTION'}
                </p>
              </div>
            </NavLink>

            {/* Mobile close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-cyber-surface"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Role Badge in Sidebar */}
          <div className="mt-3">
            {isAdmin && (
              <div className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between text-[11px] font-bold text-cyber-blue">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> PRIMARY ADMIN
                </span>
                <span className="text-[9px] bg-cyan-500/20 px-1.5 py-0.2 rounded font-mono">FULL</span>
              </div>
            )}
            {isSubAdmin && (
              <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-[11px] font-bold text-amber-400">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> SUB-ADMIN
                </span>
                <span className="text-[9px] bg-amber-500/20 px-1.5 py-0.2 rounded font-mono">READ-ONLY</span>
              </div>
            )}
            {isStandardUser && (
              <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-[11px] font-bold text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" /> User Account
                </span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">PROTECTED</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            if (item.roles && !item.roles.includes(user?.role)) {
              return null; // Hide if role not permitted
            }

            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const displayName = isStandardUser ? item.userFriendlyName : item.name;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/30 to-cyan-600/20 text-cyber-blue border border-cyber-blue/40 shadow-lg shadow-cyan-500/5'
                    : 'text-gray-400 hover:text-white hover:bg-cyber-surface/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-cyber-blue' : 'text-gray-400 group-hover:text-white'
                  }`} />
                  <span>{displayName}</span>
                </div>

                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyber-blue animate-pulse" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom User Profile Section & Logout */}
        <div className="p-3 border-t border-cyber-border/80 space-y-2 bg-cyber-dark/40">
          <NavLink
            to="/profile"
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-cyber-surface transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyber-blue/30 flex items-center justify-center font-bold text-cyber-blue font-mono text-xs">
              {user?.email ? user.email[0].toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate group-hover:text-cyber-blue transition-colors">
                {user?.email?.split('@')[0] || 'Operator'}
              </p>
              <p className="text-[11px] text-gray-400 truncate font-mono">
                {user?.email || 'operator@cyberguard.dev'}
              </p>
            </div>
          </NavLink>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-cyber-surface hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-cyber-border hover:border-red-500/30 rounded-xl text-xs font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
