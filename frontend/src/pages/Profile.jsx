import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  User, Mail, Phone, Clock, Key, ShieldCheck, Lock,
  UserCheck, CheckCircle2, AlertCircle, RefreshCw, Trash2, AlertTriangle
} from 'lucide-react';
import { profileAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';

const Profile = () => {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Action loading states
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({ full_name: '', phone: '', timezone: 'UTC' });
  const [emailData, setEmailData] = useState({ new_email: '', password: '' });
  const [passData, setPassData] = useState({ current_password: '', new_password: '', confirm_password: '' });

  // Delete account modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePass, setDeletePass] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const fetchProfile = async () => {
    try {
      const { data } = await profileAPI.getProfile();
      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        phone: data.phone || '',
        timezone: data.timezone || 'UTC'
      });
    } catch (error) {
      toast.error('Failed to load profile details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await profileAPI.updateProfile(formData);
      toast.success('Profile details updated successfully');
      setProfile(prev => ({ ...prev, ...formData }));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (!emailData.new_email || !emailData.password) {
      return toast.error('Please enter your new email address and current password.');
    }
    if (emailData.new_email.toLowerCase() === profile?.email?.toLowerCase()) {
      return toast.error('New email cannot be identical to your current email.');
    }

    setChangingEmail(true);
    try {
      const { data } = await profileAPI.changeEmail({
        new_email: emailData.new_email.trim().toLowerCase(),
        password: emailData.password
      });
      toast.success(data.message || 'Email updated successfully!');
      setProfile(prev => ({ ...prev, email: emailData.new_email.trim().toLowerCase() }));
      setEmailData({ new_email: '', password: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update email. Please verify your password.');
    } finally {
      setChangingEmail(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!passData.current_password || !passData.new_password) {
      return toast.error('Please fill in both current and new password');
    }
    if (passData.new_password !== passData.confirm_password) {
      return toast.error('New passwords do not match');
    }
    if (passData.new_password.length < 8) {
      return toast.error('New password must be at least 8 characters long');
    }

    setChangingPass(true);
    try {
      const payload = {
        current_password: passData.current_password,
        new_password: passData.new_password,
        confirm_password: passData.confirm_password,
      };
      await profileAPI.changePassword(payload);
      toast.success('Password updated successfully');
      setPassData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update password');
    } finally {
      setChangingPass(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePass) {
      return toast.error('Please enter your password to confirm deletion.');
    }
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      return toast.error("Please type 'DELETE' in all caps to confirm.");
    }

    setDeletingAccount(true);
    try {
      await profileAPI.deleteAccount({
        password: deletePass,
        confirmation: deleteConfirmText.trim().toUpperCase()
      });
      toast.success('Your account has been permanently deleted.');
      setDeleteModalOpen(false);
      logout();
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete account. Verify your password.');
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const isSubAdmin = profile?.role === 'sub_admin';
  const isAdmin = profile?.role === 'admin';
  const isStandardUser = profile?.role === 'user';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <User className="w-6 h-6 text-cyber-blue" />
            {isStandardUser ? 'My Profile' : 'Operator Profile'}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {isStandardUser ? 'Manage your account details and password' : 'Manage your identity credentials, assigned role permissions, and security'}
          </p>
        </div>

        <button
          onClick={fetchProfile}
          className="p-2 bg-cyber-surface hover:bg-cyber-border border border-cyber-border text-gray-300 hover:text-white rounded-lg transition-colors self-start sm:self-auto"
          title="Refresh Profile"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-cyber-card border border-cyber-border rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white text-3xl font-extrabold font-mono shadow-lg shadow-cyan-500/20 border-2 border-white/20 shrink-0">
            {profile?.email ? profile.email[0].toUpperCase() : 'U'}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-xl font-bold text-white">
                {profile?.full_name || profile?.email?.split('@')[0]}
              </h2>
              <div>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5" /> PRIMARY ADMIN
                  </span>
                )}
                {isSubAdmin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                    <Lock className="w-3.5 h-3.5" /> SUB-ADMIN (READ-ONLY)
                  </span>
                )}
                {isStandardUser && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                    <UserCheck className="w-3.5 h-3.5" /> USER ACCOUNT
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-gray-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyber-blue" />
                {profile?.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyber-blue" />
                Joined: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
              </span>
              <span className="flex items-center gap-1.5 text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Account Status: Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Edit Profile Form */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-cyber-border pb-3">
              <User className="w-4 h-4 text-cyber-blue" />
              General Profile Info
            </h3>
            <form id="profile-form" onSubmit={handleUpdateProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white focus:border-cyber-blue focus:outline-none"
                  placeholder="e.g. Kiran Rao"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-cyber-blue focus:outline-none"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Timezone</label>
                <select
                  value={formData.timezone}
                  onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white focus:border-cyber-blue focus:outline-none font-mono"
                >
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Chicago">America/Chicago (CST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                </select>
              </div>
            </form>
          </div>
          <button
            type="submit"
            form="profile-form"
            disabled={savingProfile}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 mt-4"
          >
            {savingProfile ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>

        {/* 2. Change Email Form */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-cyber-border pb-3">
              <Mail className="w-4 h-4 text-cyan-400" />
              Update Email Address
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Updating your email will change your sign-in address. Password confirmation is required.
            </p>
            <form id="email-form" onSubmit={handleUpdateEmail} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Current Email</label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || ''}
                  className="w-full bg-cyber-surface/50 border border-cyber-border/60 rounded-lg px-3 py-2 text-xs text-gray-400 font-mono cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">New Email Address *</label>
                <input
                  type="email"
                  required
                  value={emailData.new_email}
                  onChange={e => setEmailData({ ...emailData, new_email: e.target.value })}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
                  placeholder="newemail@domain.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Current Password *</label>
                <input
                  type="password"
                  required
                  value={emailData.password}
                  onChange={e => setEmailData({ ...emailData, password: e.target.value })}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </form>
          </div>
          <button
            type="submit"
            form="email-form"
            disabled={changingEmail}
            className="w-full py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50 mt-4"
          >
            {changingEmail ? 'Updating Email...' : 'Update Email Address'}
          </button>
        </div>

        {/* 3. Change Password Form */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-cyber-border pb-3">
              <Key className="w-4 h-4 text-pink-400" />
              Update Password
            </h3>
            <form id="pass-form" onSubmit={handleUpdatePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Current Password *</label>
                <input
                  type="password"
                  required
                  value={passData.current_password}
                  onChange={e => setPassData({ ...passData, current_password: e.target.value })}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-cyber-blue focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">New Password (Min 8 chars) *</label>
                <input
                  type="password"
                  required
                  value={passData.new_password}
                  onChange={e => setPassData({ ...passData, new_password: e.target.value })}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-cyber-blue focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  value={passData.confirm_password}
                  onChange={e => setPassData({ ...passData, confirm_password: e.target.value })}
                  className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-cyber-blue focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </form>
          </div>
          <button
            type="submit"
            form="pass-form"
            disabled={changingPass}
            className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-pink-500/20 disabled:opacity-50 mt-4"
          >
            {changingPass ? 'Updating Password...' : 'Update Password'}
          </button>
        </div>

        {/* 4. Danger Zone: Delete Account */}
        <div className="bg-cyber-card border border-red-500/30 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-red-400 flex items-center gap-2 border-b border-red-500/20 pb-3">
              <Trash2 className="w-4 h-4 text-red-400" />
              Delete Account
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Permanently remove your account and all associated personal data, settings, and logs. This action cannot be undone.
            </p>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Permanent Deletion Warning:
              </p>
              <p className="text-[11px] text-gray-400">
                Once deleted, your account cannot be recovered.
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setDeleteModalOpen(true)}
            className="w-full py-2 bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-300 hover:text-white rounded-lg text-xs font-bold transition-all mt-4 flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete My Account</span>
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {deleteModalOpen && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Confirm Account Deletion"
        >
          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-white">This action is irreversible.</p>
                <p className="text-gray-400">
                  Your account <strong className="text-white">({profile?.email})</strong> and all associated data will be deleted permanently.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Enter Your Current Password *
              </label>
              <input
                type="password"
                required
                value={deletePass}
                onChange={e => setDeletePass(e.target.value)}
                className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-red-400 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Type <strong className="text-red-400 font-mono">DELETE</strong> to confirm *
              </label>
              <input
                type="text"
                required
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-red-400 focus:outline-none"
                placeholder="DELETE"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 bg-cyber-surface hover:bg-cyber-border text-gray-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deletingAccount || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-40"
              >
                {deletingAccount ? 'Deleting Account...' : 'Permanently Delete'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Profile;
