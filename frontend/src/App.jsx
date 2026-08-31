import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import MainLayout from './components/layout/MainLayout';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import Home from './pages/Home';
import ThreatTest from './pages/ThreatTest';
import Dashboard from './pages/Dashboard';
import ThreatAnalysis from './pages/ThreatAnalysis';
import GeoMap from './pages/GeoMap';
import Analytics from './pages/Analytics';
import BlockedIPs from './pages/BlockedIPs';
import Users from './pages/Users';
import NotificationHistory from './pages/NotificationHistory';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

const ProtectedRoute = ({ children }) => {
  const { token, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-cyber-dark text-cyan-400 font-mono">
        Initializing CyberGuard AI...
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const RoleProtectedRoute = ({ allowedRoles, children }) => {
  const { user } = useAuth();
  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/home" replace />;
  }
  return children;
};

const App = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <NotificationProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'bg-cyber-card text-white border border-cyber-border font-sans text-xs',
              duration: 4000
            }}
          />
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Authenticated Application Routes with Left Sidebar */}
            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/home" replace />} />
              <Route path="home" element={<Home />} />
              <Route path="dashboard" element={<Dashboard />} />
              
              {/* Threat Test Lab restricted to Admin & Sub-Admin */}
              <Route
                path="threat-test"
                element={
                  <RoleProtectedRoute allowedRoles={['admin', 'sub_admin']}>
                    <ThreatTest />
                  </RoleProtectedRoute>
                }
              />
              
              <Route path="threat-analysis" element={<ThreatAnalysis />} />
              <Route path="geo-map" element={<GeoMap />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="blocked-ips" element={<BlockedIPs />} />
              
              {/* Users & Authority restricted to Admin & Sub-Admin */}
              <Route
                path="users"
                element={
                  <RoleProtectedRoute allowedRoles={['admin', 'sub_admin']}>
                    <Users />
                  </RoleProtectedRoute>
                }
              />

              {/* Notification History restricted to Admin & Sub-Admin */}
              <Route
                path="notifications-history"
                element={
                  <RoleProtectedRoute allowedRoles={['admin', 'sub_admin']}>
                    <NotificationHistory />
                  </RoleProtectedRoute>
                }
              />
              
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Route>
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
