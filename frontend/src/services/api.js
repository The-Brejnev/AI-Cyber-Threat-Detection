import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  sendOTP: (email, purpose) => api.post('/auth/send-otp', {email, purpose}),
  verifyOTP: (email, otp, purpose) => api.post('/auth/verify-otp', {email, otp, purpose}),
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => api.post('/auth/login', {email, password}),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  sendForgotPassword: (email) => api.post('/auth/forgot-password', {email}),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

export const threatsAPI = {
  getThreats: (params) => api.get('/threats', {params}),
  getThreat: (id) => api.get(`/threats/${id}`),
  getThreatGeo: (id) => api.get(`/threats/${id}/geo`),
  updateStatus: (id, status) => api.patch(`/threats/${id}/status`, {status}),
  analyze: (event) => api.post('/threats/analyze', event),
};

export const devicesAPI = {
  getDevices: () => api.get('/devices'),
  createDevice: (data) => api.post('/devices', data),
  updateDevice: (id, data) => api.put(`/devices/${id}`, data),
  deleteDevice: (id) => api.delete(`/devices/${id}`),
};

export const analyticsAPI = {
  getSummary: () => api.get('/analytics/summary'),
  getThreatTrends: (period) => api.get('/analytics/threat-trends', {params: {period}}),
  getThreatDistribution: () => api.get('/analytics/threat-distribution'),
  getSeverityDistribution: () => api.get('/analytics/severity-distribution'),
  getTopIPs: () => api.get('/analytics/top-ips'),
  getTopDevices: () => api.get('/analytics/top-devices'),
  getMLMetrics: () => api.get('/analytics/ml-metrics'),
};

export const geoAPI = {
  getThreats: (params) => api.get('/geo/threats', {params}),
  getIPInfo: (ip) => api.get(`/geo/ip/${ip}`),
};

export const notificationsAPI = {
  getNotifications: (params) => api.get('/notifications', {params}),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
};

export const blockedIPsAPI = {
  getBlockedIPs: (params) => api.get('/blocked-ips', {params}),
  blockIP: (data) => api.post('/blocked-ips', data),
  unblockIP: (id) => api.delete(`/blocked-ips/${id}`),
  checkIP: (ip) => api.get(`/blocked-ips/check/${ip}`),
};

export const profileAPI = {
  getProfile: () => api.get('/profile'),
  updateProfile: (data) => api.put('/profile', data),
  changeEmail: (data) => api.put('/profile/change-email', data),
  changePassword: (data) => api.put('/profile/change-password', data),
  deleteAccount: (data) => api.delete('/profile/delete-account', { data }),
};

export const settingsAPI = {
  getSettings: () => api.get('/settings'),
  updateSettings: (data) => api.put('/settings', data),
  getAuditLogs: (params) => api.get('/settings/audit-logs', {params}),
  getLoginHistory: () => api.get('/settings/login-history'),
  logoutAll: () => api.post('/settings/logout-all'),
};

export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', {params}),
  updateRole: (userId, role) => api.patch(`/admin/users/${userId}/role`, {role}),
  toggleStatus: (userId, isActive) => api.patch(`/admin/users/${userId}/status`, {is_active: isActive}),
  sendAuthorizedNotice: (data) => api.post('/admin/notify-user', data),
  getNotificationHistory: (params) => api.get('/admin/notification-history', {params}),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
};

export const aiAPI = {
  getStatus: () => api.get('/ai/status'),
  getAegisFeed: () => api.get('/ai/aegis/feed'),
};
