import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState({ password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const { sendOTP, verifyOTP, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await sendOTP(email, 'password_reset');
      const msg = res.data?.message || 'OTP sent successfully';
      toast.success(msg, { duration: 6000 });
      if (res.data?.dev_otp) {
        setOtp(res.data.dev_otp);
      }
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyOTP(email, otp, 'password_reset');
      toast.success('Email verified');
      setStep(3);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      return toast.error('Passwords do not match');
    }
    setLoading(true);
    try {
      await resetPassword({ email, otp, new_password: formData.password });
      toast.success('Password reset successfully');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <Shield className="w-16 h-16 text-cyber-blue" />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-white">Reset Password</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-cyber-card py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-cyber-border">
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300">Email address</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-cyber-border rounded-md bg-cyber-surface text-white sm:text-sm" />
              </div>
              <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                {loading ? <LoadingSpinner size="sm" /> : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300">Enter OTP</label>
                <input type="text" required value={otp} onChange={(e) => setOtp(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-cyber-border rounded-md bg-cyber-surface text-white sm:text-sm tracking-widest text-center text-lg" maxLength={6} />
              </div>
              <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                {loading ? <LoadingSpinner size="sm" /> : 'Verify OTP'}
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300">New Password</label>
                <input type="password" required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-cyber-border rounded-md bg-cyber-surface text-white sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Confirm New Password</label>
                <input type="password" required value={formData.confirm_password} onChange={(e) => setFormData({...formData, confirm_password: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-cyber-border rounded-md bg-cyber-surface text-white sm:text-sm" />
              </div>
              <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                {loading ? <LoadingSpinner size="sm" /> : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-cyber-blue hover:text-blue-400">Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
