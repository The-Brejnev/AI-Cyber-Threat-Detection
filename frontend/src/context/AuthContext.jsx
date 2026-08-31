import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        try {
          const { data } = await authAPI.getMe();
          setUser(data);
        } catch (error) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    validateToken();
  }, [token]);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiry = payload.exp * 1000;
        const timeout = expiry - Date.now();
        if (timeout > 0) {
          const timer = setTimeout(() => logout(), timeout);
          return () => clearTimeout(timer);
        } else {
          logout();
        }
      } catch (e) {
        // invalid token
      }
    }
  }, [token]);

  const login = async (email, password) => {
    const { data } = await authAPI.login(email, password);

    setToken(data.access_token);
    setUser(data.user);

    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    authAPI.logout().catch(() => { });
  };

  const register = async (data) => authAPI.register(data);
  const sendOTP = async (email, purpose) => authAPI.sendOTP(email, purpose);
  const verifyOTP = async (email, otp, purpose) => authAPI.verifyOTP(email, otp, purpose);
  const forgotPassword = async (email) => authAPI.sendForgotPassword(email);
  const resetPassword = async (data) => authAPI.resetPassword(data);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, register, sendOTP, verifyOTP, forgotPassword, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
