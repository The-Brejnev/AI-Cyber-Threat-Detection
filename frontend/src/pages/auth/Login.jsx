import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      toast.success('Authentication successful! Welcome back.');
      navigate('/home');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed. Please check your credentials.');
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
          CyberGuard <span className="text-cyber-blue">AI</span>
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Sign in to access your security intelligence command center
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-cyber-card py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-cyber-border space-y-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                Email Address
              </label>
              <div className="mt-1.5">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="appearance-none block w-full px-3.5 py-2.5 border border-cyber-border rounded-xl shadow-sm bg-cyber-surface text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                Password
              </label>
              <div className="mt-1.5">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="appearance-none block w-full px-3.5 py-2.5 border border-cyber-border rounded-xl shadow-sm bg-cyber-surface text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue text-sm font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs">
                <Link to="/forgot-password" className="font-medium text-cyber-blue hover:underline">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-lg shadow-cyan-500/20 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 focus:outline-none disabled:opacity-50 transition-all"
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Authenticate & Sign In'}
              </button>
            </div>
          </form>

          <div className="pt-2 border-t border-cyber-border/80 text-center text-xs text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-cyber-blue hover:underline">
              Register with OTP
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
