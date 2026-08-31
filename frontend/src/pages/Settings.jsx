import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Settings as SettingsIcon, Bell, Shield, Monitor,
  Zap, AlertOctagon, CheckCircle2, Server, Globe, Lock, Sliders
} from 'lucide-react';
import { settingsAPI } from '../services/api';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('defense');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    email_notifications: true,
    sms_notifications: false,
    critical_alerts: true,
    high_alerts: true,
    medium_alerts: false,
    low_alerts: false,
    dashboard_refresh: 30,
    theme: 'dark',
    auto_block_enabled: true,
    auto_block_severity: 'CRITICAL',
    auto_block_threshold: 80
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await settingsAPI.getSettings();
        setSettings(prev => ({
          ...prev,
          ...data
        }));
      } catch (e) {
        console.error('Failed to load settings:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateSettings(settings);
      toast.success('Security policies and settings updated successfully');
    } catch (e) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutAll = async () => {
    try {
      await settingsAPI.logoutAll();
      toast.success('Logged out of all active sessions');
    } catch (e) {
      toast.error('Action failed');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-cyber-blue" />
            Security & Defense Settings
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Configure AI automated intrusion mitigation, real system telemetry, and alert thresholds</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-cyber-border">
        <button
          onClick={() => setActiveTab('defense')}
          className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'defense' ? 'border-cyber-blue text-cyber-blue' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4 text-cyber-blue" /> AI Active Defense
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'notifications' ? 'border-cyber-blue text-cyber-blue' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" /> Notifications
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'security' ? 'border-cyber-blue text-cyber-blue' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" /> Host & Sessions
        </button>
        <button
          onClick={() => setActiveTab('application')}
          className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'application' ? 'border-cyber-blue text-cyber-blue' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Monitor className="w-4 h-4" /> Telemetry
        </button>
      </div>

      <div className="bg-cyber-card border border-cyber-border rounded-xl p-6">
        {/* Tab 1: AI Active Defense & Auto-Blocking */}
        {activeTab === 'defense' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-950/40 via-cyber-surface to-cyber-surface border border-cyber-blue/30 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-cyber-blue animate-pulse" />
                  Automated AI Firewall Mitigation (Auto-Blocking)
                </h2>
                <p className="text-xs text-gray-300 mt-1 max-w-xl">
                  When enabled, high-confidence attacks identified by the Random Forest & Isolation Forest ML engine will be automatically neutralized and placed onto the firewall blocklist in real time.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.auto_block_enabled}
                  onChange={e => setSettings({ ...settings, auto_block_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-cyber-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyber-blue"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div className="bg-cyber-surface border border-cyber-border rounded-xl p-4 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                  Minimum Severity Threshold for Auto-Block
                </label>
                <p className="text-xs text-gray-400">
                  Select which incoming threat severity levels should trigger immediate automated firewall rules.
                </p>
                <select
                  value={settings.auto_block_severity}
                  onChange={e => setSettings({ ...settings, auto_block_severity: e.target.value })}
                  disabled={!settings.auto_block_enabled}
                  className="w-full bg-cyber-card border border-cyber-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-blue disabled:opacity-50"
                >
                  <option value="CRITICAL">Critical Severity Only (Recommended)</option>
                  <option value="HIGH">Critical & High Severities</option>
                  <option value="MEDIUM">Critical, High & Medium Severities</option>
                </select>
              </div>

              <div className="bg-cyber-surface border border-cyber-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                    AI Risk Score Cutoff: <span className="text-cyber-blue font-mono font-bold">{settings.auto_block_threshold}%</span>
                  </label>
                  <span className="text-[11px] text-gray-400">0 - 100% Scale</span>
                </div>
                <p className="text-xs text-gray-400">
                  Attacks with risk scores equal to or higher than this threshold will be auto-blocked regardless of category.
                </p>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={settings.auto_block_threshold}
                  onChange={e => setSettings({ ...settings, auto_block_threshold: parseInt(e.target.value) })}
                  disabled={!settings.auto_block_enabled}
                  className="w-full accent-cyber-blue cursor-pointer disabled:opacity-50"
                />
              </div>
            </div>

            {/* Real System Telemetry Card */}
            <div className="bg-cyber-surface border border-cyber-border rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-green-400 flex items-center gap-1.5">
                <Server className="w-4 h-4" />
                Detected Protected Host System Telemetry
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-gray-400 text-[11px]">Real Public IP</p>
                  <p className="font-mono text-white font-bold mt-0.5">157.50.180.145</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[11px]">Local Interface Subnet</p>
                  <p className="font-mono text-green-400 font-bold mt-0.5">10.201.64.21</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[11px]">Geolocation Node</p>
                  <p className="font-mono text-white mt-0.5">Bengaluru, India</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[11px]">Internet Carrier</p>
                  <p className="font-mono text-gray-300 mt-0.5">Reliance Jio Infocomm</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 max-w-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Alert Dispatch Channels</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3.5 bg-cyber-surface rounded-lg border border-cyber-border">
                <div>
                  <span className="text-white text-xs font-medium">Real-Time Email Alerts (Gmail SMTP)</span>
                  <p className="text-gray-400 text-[11px]">Sends instant email notices for critical security intrusions</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.email_notifications}
                  onChange={e => setSettings({ ...settings, email_notifications: e.target.checked })}
                  className="accent-cyber-blue w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 bg-cyber-surface rounded-lg border border-cyber-border">
                <div>
                  <span className="text-white text-xs font-medium">SMS Emergency Dispatch (Twilio)</span>
                  <p className="text-gray-400 text-[11px]">Sends SMS messages to verified admin mobile</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.sms_notifications}
                  onChange={e => setSettings({ ...settings, sms_notifications: e.target.checked })}
                  className="accent-cyber-blue w-4 h-4"
                />
              </label>
            </div>

            <h3 className="text-sm font-bold uppercase tracking-wider text-white pt-3">Severity Trigger Filters</h3>
            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-3 bg-cyber-surface rounded-lg border border-cyber-border">
                <span className="text-red-400 text-xs font-medium">Critical Threats Notification</span>
                <input
                  type="checkbox"
                  checked={settings.critical_alerts}
                  onChange={e => setSettings({ ...settings, critical_alerts: e.target.checked })}
                  className="accent-red-500 w-4 h-4"
                />
              </label>
              <label className="flex items-center justify-between p-3 bg-cyber-surface rounded-lg border border-cyber-border">
                <span className="text-orange-400 text-xs font-medium">High Threats Notification</span>
                <input
                  type="checkbox"
                  checked={settings.high_alerts}
                  onChange={e => setSettings({ ...settings, high_alerts: e.target.checked })}
                  className="accent-orange-500 w-4 h-4"
                />
              </label>
            </div>
          </div>
        )}

        {/* Tab 3: Security & Session */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-1">Active SOC Session Management</h3>
              <p className="text-xs text-gray-400 mb-4">Invalidate all existing session JWT tokens across all browsers.</p>
              <button
                onClick={handleLogoutAll}
                className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/40 hover:bg-red-600/40 text-xs font-medium rounded-lg transition-colors"
              >
                Revoke All Active Sessions
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Application & Refresh */}
        {activeTab === 'application' && (
          <div className="space-y-5 max-w-lg">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Telemetry & Refresh Settings</h3>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Dashboard Refresh Interval</label>
              <select
                value={settings.dashboard_refresh}
                onChange={e => setSettings({ ...settings, dashboard_refresh: parseInt(e.target.value) })}
                className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-blue"
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
