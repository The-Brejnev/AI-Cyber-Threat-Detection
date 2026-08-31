import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, ShieldCheck, Lock, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const Register = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    password: '',
    confirm_password: '',
    role: 'admin' // Default selection
  });
  const [loading, setLoading] = useState(false);
  const { sendOTP, verifyOTP, register } = useAuth();
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await sendOTP(email.trim().toLowerCase(), 'registration');
      const msg = res.data?.message || 'Verification OTP sent to your email';
      toast.success(msg, { duration: 6000 });
      if (res.data?.dev_otp) {
        setOtp(res.data.dev_otp);
      }
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyOTP(email.trim().toLowerCase(), otp, 'registration');
      toast.success('Email verified successfully!');
      setStep(3);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        full_name: formData.full_name,
        email: email.trim().toLowerCase(),
        phone: formData.phone || null,
        password: formData.password,
        confirm_password: formData.confirm_password,
        role: formData.role,
        otp: otp
      };

      await register(payload);
      toast.success(`Account registered successfully as ${formData.role.toUpperCase()}! Please sign in.`);
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.detail || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-blue-500/20 rounded-2xl border border-cyber-blue/40 text-cyber-blue shadow-lg shadow-cyan-500/10">
            <Shield className="w-12 h-12" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-white tracking-tight">
          Create SOC Account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Register with email verification and assign your security operational role
        </p>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className={`w-8 h-1.5 rounded-full ${step >= 1 ? 'bg-cyber-blue' : 'bg-gray-700'}`} />
          <span className={`w-8 h-1.5 rounded-full ${step >= 2 ? 'bg-cyber-blue' : 'bg-gray-700'}`} />
          <span className={`w-8 h-1.5 rounded-full ${step >= 3 ? 'bg-cyber-blue' : 'bg-gray-700'}`} />
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-cyber-card py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-cyber-border space-y-6">
          
          {/* Step 1: Send OTP */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                  Work / Email Address
                </label>
                <div className="mt-1.5">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. analyst@company.com"
                    className="appearance-none block w-full px-3.5 py-2.5 border border-cyber-border rounded-xl shadow-sm bg-cyber-surface text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue text-sm font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-lg shadow-cyan-500/20 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 transition-all"
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Send Verification OTP'}
              </button>
            </form>
          )}

          {/* Step 2: Verify OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                    Enter 6-Digit Email OTP
                  </label>
                  <span className="text-xs text-gray-400 font-mono">{email}</span>
                </div>
                <div className="mt-1.5">
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="appearance-none block w-full px-3.5 py-3 border border-cyber-border rounded-xl shadow-sm bg-cyber-surface text-cyan-400 placeholder-gray-500 focus:outline-none focus:border-cyber-blue text-center text-xl font-mono tracking-widest"
                    maxLength={6}
                    placeholder="••••••"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1 text-center">
                  Check your Gmail inbox/spam for the OTP code
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 bg-cyber-surface hover:bg-cyber-border border border-cyber-border rounded-xl text-xs text-gray-300"
                >
                  Change Email
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl shadow-lg shadow-cyan-500/20 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 transition-all"
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Verify Code & Proceed'}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Account Details & Role Selection */}
          {step === 3 && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="mt-1 block w-full px-3 py-2 border border-cyber-border rounded-lg bg-cyber-surface text-white text-xs focus:outline-none focus:border-cyber-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="mt-1 block w-full px-3 py-2 border border-cyber-border rounded-lg bg-cyber-surface text-white text-xs focus:outline-none focus:border-cyber-blue"
                  />
                </div>
              </div>

              {/* Role Selection Option Cards (Without exposing key passwords) */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                  Select Security Role & Authority Level *
                </label>
                
                <div className="grid grid-cols-1 gap-2">
                  {/* Admin Selection Card */}
                  <label className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    formData.role === 'admin' ? 'bg-cyan-500/10 border-cyber-blue text-white' : 'bg-cyber-surface border-cyber-border text-gray-400 hover:border-gray-600'
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={formData.role === 'admin'}
                      onChange={() => setFormData({ ...formData, role: 'admin' })}
                      className="mt-1 text-cyber-blue focus:ring-cyber-blue"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-cyber-blue" /> Primary Administrator
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300">
                          Full Authority
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Full read/write authority, manage and promote user roles, control firewall rules, and policy settings.
                      </p>
                    </div>
                  </label>

                  {/* Sub-Admin Selection Card */}
                  <label className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    formData.role === 'sub_admin' ? 'bg-amber-500/10 border-amber-500 text-white' : 'bg-cyber-surface border-cyber-border text-gray-400 hover:border-gray-600'
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="sub_admin"
                      checked={formData.role === 'sub_admin'}
                      onChange={() => setFormData({ ...formData, role: 'sub_admin' })}
                      className="mt-1 text-amber-500 focus:ring-amber-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Lock className="w-4 h-4 text-amber-400" /> Sub-Administrator
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300">
                          Read-Only Oversight
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Full visibility across all system-wide threats, maps, and logs, with strict write protection.
                      </p>
                    </div>
                  </label>

                  {/* Analyst Selection Card */}
                  <label className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    formData.role === 'user' ? 'bg-emerald-500/10 border-emerald-500 text-white' : 'bg-cyber-surface border-cyber-border text-gray-400 hover:border-gray-600'
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="user"
                      checked={formData.role === 'user'}
                      onChange={() => setFormData({ ...formData, role: 'user' })}
                      className="mt-1 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-emerald-400" /> Security Analyst
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300">
                          Standard Access
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Standard telemetry monitoring and packet analysis for assigned assets.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Unique Password Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="mt-1 block w-full px-3 py-2 border border-cyber-border rounded-lg bg-cyber-surface text-white text-xs focus:outline-none focus:border-cyber-blue font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    placeholder="••••••••"
                    className="mt-1 block w-full px-3 py-2 border border-cyber-border rounded-lg bg-cyber-surface text-white text-xs focus:outline-none focus:border-cyber-blue font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-lg shadow-cyan-500/20 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 transition-all"
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Complete Registration & Create Account'}
                </button>
              </div>
            </form>
          )}

          <div className="pt-2 border-t border-cyber-border/80 text-center text-xs text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-cyber-blue hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
