import React, { useState, useEffect } from 'react';
import {
  Users as UsersIcon, ShieldCheck, ShieldAlert, UserCheck,
  Search, RefreshCw, UserPlus, Lock, CheckCircle2, XCircle,
  Clock, Server, AlertTriangle, ArrowUpDown, Send, Mail, Radio, KeyRound, Trash2
} from 'lucide-react';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';

const ADVISORY_TEMPLATES = [
  {
    name: 'Proxy Server Security Advisory',
    title: 'Protected Proxy Endpoint Incident Advisory',
    message: 'SOC Defense detected repeated reconnaissance probing targeting your authorized proxy server endpoint. AI automated firewalls have mitigated the threats and isolated the attacker hosts.',
    severity: 'HIGH'
  },
  {
    name: 'Data Protection & Integrity Notice',
    title: 'Data Loss Prevention & Tampering Defense Alert',
    message: 'Active defense shields successfully blocked unauthorized hacker attempts to modify or exfiltrate database records. Your account and stored assets remain 100% secure.',
    severity: 'CRITICAL'
  },
  {
    name: 'Authorized Credential Hygiene Directive',
    title: 'SOC Routine Security Credential Notice',
    message: 'Please review your active SOC operator profile and ensure your multi-factor verification credentials and authorized recovery emails are up to date.',
    severity: 'MEDIUM'
  }
];

const Users = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const isSubAdmin = currentUser?.role === 'sub_admin';

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, admin_count: 0, sub_admin_count: 0, standard_user_count: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
  // Role change modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [targetRole, setTargetRole] = useState('sub_admin');
  const [updating, setUpdating] = useState(false);

  // User Deletion state
  const [userToDelete, setUserToDelete] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Authorized Security Notice Modal state
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [noticeTargetUser, setNoticeTargetUser] = useState('all'); // 'all' or user_id
  const [noticeForm, setNoticeForm] = useState({
    title: 'Protected Proxy Endpoint Incident Advisory',
    message: 'SOC Defense detected repeated reconnaissance probing targeting your authorized proxy server endpoint. AI automated firewalls have mitigated the threats and isolated the attacker hosts.',
    severity: 'HIGH',
    proxy_ip: '10.201.64.21',
    attacker_ip: '',
    send_email: true
  });
  const [sendingNotice, setSendingNotice] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const { data } = await adminAPI.getUsers(params);
      setUsers(data.users || []);
      setStats({
        total: data.total || 0,
        admin_count: data.admin_count || 0,
        sub_admin_count: data.sub_admin_count || 0,
        standard_user_count: data.standard_user_count || 0
      });
    } catch (err) {
      console.error('Failed to fetch users:', err);
      toast.error(err.response?.data?.detail || 'Failed to load users list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleRoleChange = async () => {
    if (!selectedUser) return;
    setUpdating(true);
    try {
      await adminAPI.updateRole(selectedUser.id, targetRole);
      toast.success(`Successfully changed ${selectedUser.email} role to ${targetRole.toUpperCase()}`);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update user role.');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleStatus = async (userObj) => {
    if (!isAdmin) {
      toast.error('Sub-Admin has Read-Only permissions.');
      return;
    }
    const newStatus = !userObj.is_active;
    try {
      await adminAPI.toggleStatus(userObj.id, newStatus);
      toast.success(`User ${userObj.email} is now ${newStatus ? 'Active' : 'Deactivated'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to toggle status.');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);
    try {
      await adminAPI.deleteUser(userToDelete.id);
      toast.success(`User ${userToDelete.email} has been permanently deleted.`);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete user account.');
    } finally {
      setDeletingUser(false);
    }
  };

  const handleSendNotice = async (e) => {
    e.preventDefault();
    setSendingNotice(true);
    try {
      const payload = {
        target_user_id: noticeTargetUser === 'all' ? null : noticeTargetUser,
        title: noticeForm.title,
        message: noticeForm.message,
        severity: noticeForm.severity,
        proxy_ip: noticeForm.proxy_ip,
        attacker_ip: noticeForm.attacker_ip || null,
        send_email: noticeForm.send_email
      };
      const res = await adminAPI.sendAuthorizedNotice(payload);
      toast.success(res.data?.message || 'Authorized directive dispatched successfully!');
      setNoticeModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send security advisory.');
    } finally {
      setSendingNotice(false);
    }
  };

  const applyTemplate = (tpl) => {
    setNoticeForm(prev => ({
      ...prev,
      title: tpl.title,
      message: tpl.message,
      severity: tpl.severity
    }));
    toast.success(`Applied "${tpl.name}" template`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <UsersIcon className="w-6 h-6 text-cyber-blue" />
            User Access &amp; Authority Management
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            View all registered SOC operators, promote roles, and dispatch authorized security advisories
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Send Official Advisory Button */}
          <button
            onClick={() => {
              setNoticeTargetUser('all');
              setNoticeModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-500/20"
          >
            <Send className="w-4 h-4" />
            <span>Send Official Security Advisory</span>
          </button>

          {isSubAdmin && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs text-amber-400 font-medium">
              <Lock className="w-4 h-4" />
              <span>Sub-Admin: Read-Only Mode</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Total Operators</p>
            <h3 className="text-2xl font-bold text-white mt-1 font-mono">{stats.total}</h3>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-cyan-400 border border-cyan-500/20">
            <UsersIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Primary Admins</p>
            <h3 className="text-2xl font-bold text-cyber-blue mt-1 font-mono">{stats.admin_count}</h3>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyber-blue border border-cyber-blue/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Sub-Admins (Read-Only)</p>
            <h3 className="text-2xl font-bold text-amber-400 mt-1 font-mono">{stats.sub_admin_count}</h3>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Standard Analysts</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{stats.standard_user_count}</h3>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email..."
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

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-blue"
          >
            <option value="">All Roles</option>
            <option value="admin">Admins</option>
            <option value="sub_admin">Sub-Admins</option>
            <option value="user">Standard Users</option>
          </select>

          <button
            onClick={fetchUsers}
            className="p-2 bg-cyber-surface hover:bg-cyber-border border border-cyber-border text-gray-300 hover:text-white rounded-lg transition-colors"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-cyber-card border border-cyber-border rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-cyber-surface text-gray-400 uppercase font-mono border-b border-cyber-border">
              <tr>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Role &amp; Authority</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Targeted Threats</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyber-border/40">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center">
                    <LoadingSpinner size="md" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-500">
                    No users matching criteria
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-cyber-surface/50 transition-colors">
                      {/* User details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-cyber-blue/40 flex items-center justify-center font-bold text-cyber-blue font-mono text-xs">
                            {u.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-white flex items-center gap-1.5">
                              {u.full_name !== 'N/A' ? u.full_name : u.email.split('@')[0]}
                              {isCurrent && (
                                <span className="text-[10px] bg-cyber-blue/20 text-cyber-blue px-1.5 py-0.2 rounded font-mono font-normal">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-gray-400 font-mono text-[11px]">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {u.role === 'admin' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyber-blue border border-cyber-blue/30">
                            <ShieldCheck className="w-3.5 h-3.5" /> PRIMARY ADMIN
                          </span>
                        )}
                        {u.role === 'sub_admin' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <Lock className="w-3.5 h-3.5" /> SUB-ADMIN (READ-ONLY)
                          </span>
                        )}
                        {u.role === 'user' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gray-500/10 text-gray-300 border border-gray-500/30">
                            <UserCheck className="w-3.5 h-3.5" /> STANDARD ANALYST
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                          u.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}>
                          {u.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                        </span>
                      </td>

                      {/* Threats count */}
                      <td className="py-3.5 px-4 font-mono text-cyan-400 font-bold">
                        {u.threat_count} Events
                      </td>

                      {/* Registered Date */}
                      <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* Administrative Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setNoticeTargetUser(u.id);
                              setNoticeModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-cyber-surface hover:bg-cyber-border border border-cyan-500/30 text-xs font-semibold text-cyan-400 rounded-lg transition-colors flex items-center gap-1"
                            title="Send Direct Security Advisory"
                          >
                            <Send className="w-3 h-3" />
                            <span>Notify</span>
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setTargetRole(u.role === 'sub_admin' ? 'user' : 'sub_admin');
                                }}
                                className="px-2.5 py-1 bg-cyber-surface hover:bg-cyber-border border border-cyber-border hover:border-cyber-blue text-xs font-semibold text-cyber-blue rounded-lg transition-colors"
                              >
                                Change Role
                              </button>

                              {!isCurrent && (
                                <>
                                  <button
                                    onClick={() => handleToggleStatus(u)}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                                      u.is_active
                                        ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                                        : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                                    }`}
                                  >
                                    {u.is_active ? 'Disable' : 'Enable'}
                                  </button>

                                  <button
                                    onClick={() => setUserToDelete(u)}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1"
                                    title="Permanently Delete Account"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete</span>
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Change Modal */}
      {selectedUser && (
        <Modal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title="Promote / Demote User Role"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Update operational authority for <strong className="text-white">{selectedUser.email}</strong>.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-gray-400">Select Target Role</label>
              
              <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                targetRole === 'sub_admin' ? 'bg-amber-500/10 border-amber-500 text-white' : 'bg-cyber-surface border-cyber-border text-gray-400'
              }`}>
                <input
                  type="radio"
                  name="modal_role"
                  value="sub_admin"
                  checked={targetRole === 'sub_admin'}
                  onChange={() => setTargetRole('sub_admin')}
                  className="text-amber-500"
                />
                <div>
                  <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Sub-Administrator (Read-Only)
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Can view all system-wide threats, maps, and logs. Cannot modify rules or settings.
                  </p>
                </div>
              </label>

              <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                targetRole === 'admin' ? 'bg-cyan-500/10 border-cyber-blue text-white' : 'bg-cyber-surface border-cyber-border text-gray-400'
              }`}>
                <input
                  type="radio"
                  name="modal_role"
                  value="admin"
                  checked={targetRole === 'admin'}
                  onChange={() => setTargetRole('admin')}
                  className="text-cyber-blue"
                />
                <div>
                  <p className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Primary Administrator (Full Control)
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Full authority to view, modify, block IPs, and manage user roles.
                  </p>
                </div>
              </label>

              <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                targetRole === 'user' ? 'bg-emerald-500/10 border-emerald-500 text-white' : 'bg-cyber-surface border-cyber-border text-gray-400'
              }`}>
                <input
                  type="radio"
                  name="modal_role"
                  value="user"
                  checked={targetRole === 'user'}
                  onChange={() => setTargetRole('user')}
                  className="text-emerald-500"
                />
                <div>
                  <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" /> Security Analyst (Standard User)
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Standard access isolated to own monitored assets.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-cyber-border">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-cyber-surface hover:bg-cyber-border text-gray-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChange}
                disabled={updating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Confirm Role Update'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Official Security Advisory Dispatch Modal */}
      {noticeModalOpen && (
        <Modal
          isOpen={noticeModalOpen}
          onClose={() => setNoticeModalOpen(false)}
          title="Dispatch Official Security Advisory / Directive"
        >
          <form onSubmit={handleSendNotice} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                Select Advisory Preset Template
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {ADVISORY_TEMPLATES.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="text-left p-2.5 bg-cyber-surface hover:bg-cyber-border border border-cyber-border rounded-lg text-xs transition-colors flex items-center justify-between group"
                  >
                    <span className="font-bold text-white group-hover:text-cyber-blue">{tpl.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{tpl.severity}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Recipient</label>
                <select
                  value={noticeTargetUser}
                  onChange={(e) => setNoticeTargetUser(e.target.value)}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-blue font-mono"
                >
                  <option value="all">📢 Broadcast to All Operators ({users.length})</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      👤 {u.email} ({u.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Priority Severity</label>
                <select
                  value={noticeForm.severity}
                  onChange={(e) => setNoticeForm({ ...noticeForm, severity: e.target.value })}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-blue font-mono"
                >
                  <option value="CRITICAL">🔴 CRITICAL</option>
                  <option value="HIGH">🟠 HIGH</option>
                  <option value="MEDIUM">🟡 MEDIUM</option>
                  <option value="LOW">🟢 LOW / INFO</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Advisory Title *</label>
              <input
                type="text"
                required
                value={noticeForm.title}
                onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-blue font-semibold"
                placeholder="e.g. Proxy Server Threat Incident Notice"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Advisory Message Content *</label>
              <textarea
                rows={3}
                required
                value={noticeForm.message}
                onChange={(e) => setNoticeForm({ ...noticeForm, message: e.target.value })}
                className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-blue leading-relaxed"
                placeholder="Type official directive message..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Authorized Proxy Server IP</label>
                <input
                  type="text"
                  value={noticeForm.proxy_ip}
                  onChange={(e) => setNoticeForm({ ...noticeForm, proxy_ip: e.target.value })}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyber-blue"
                  placeholder="10.201.64.21"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Flagged Attacker IP (Optional)</label>
                <input
                  type="text"
                  value={noticeForm.attacker_ip}
                  onChange={(e) => setNoticeForm({ ...noticeForm, attacker_ip: e.target.value })}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyber-blue"
                  placeholder="e.g. 185.220.101.5"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="send_email_check"
                checked={noticeForm.send_email}
                onChange={(e) => setNoticeForm({ ...noticeForm, send_email: e.target.checked })}
                className="rounded border-cyber-border bg-cyber-surface text-cyber-blue focus:ring-cyber-blue"
              />
              <label htmlFor="send_email_check" className="text-xs text-gray-300 flex items-center gap-1.5 cursor-pointer">
                <Mail className="w-3.5 h-3.5 text-cyber-blue" />
                Dispatch official email advisory to recipient's inbox via Gmail SMTP
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-cyber-border">
              <button
                type="button"
                onClick={() => setNoticeModalOpen(false)}
                className="px-4 py-2 bg-cyber-surface hover:bg-cyber-border text-gray-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sendingNotice}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingNotice ? 'Dispatching...' : 'Dispatch Authorized Directive'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <Modal
          isOpen={!!userToDelete}
          onClose={() => setUserToDelete(null)}
          title="Confirm Permanent User Account Deletion"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-white">Warning: Irreversible Account Wipe</p>
                <p className="text-gray-400 leading-relaxed">
                  Are you sure you want to permanently delete user <strong className="text-white">{userToDelete.email}</strong> ({userToDelete.role})? All associated network events, profile settings, and alerts will be wiped immediately.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-cyber-surface hover:bg-cyber-border text-gray-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingUser}
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingUser ? 'Deleting User...' : 'Permanently Delete User'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Users;
