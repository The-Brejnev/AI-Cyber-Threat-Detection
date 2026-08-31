import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { notificationsAPI } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [adminNotices, setAdminNotices] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [ws, setWs] = useState(null);

  const isStandardUser = user?.role === 'user';
  const isAdminOrSubAdmin = user?.role === 'admin' || user?.role === 'sub_admin';

  const connect = useCallback(() => {
    if (!token) return;
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    const websocket = new WebSocket(`${wsUrl}/ws/${token}`);

    websocket.onopen = () => console.log('WS Connected');
    websocket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        // 1. Official Authorized Security Directive from Admin/Sub-Admin
        if (payload.type === 'admin_notice') {
          const notice = payload.data || {};
          setAdminNotices(prev => [notice, ...prev].slice(0, 10));
          setNotifications(prev => [payload, ...prev].slice(0, 50));
          setUnreadCount(prev => prev + 1);

          // ONLY Admin/Sub-Admin gets popup toasts; Standard users have 0 popup noise
          if (isAdminOrSubAdmin) {
            toast.success(`🛡️ Directive Dispatched: ${notice.title}`, {
              duration: 5000,
              icon: '📢',
              style: {
                background: '#0f1729',
                color: '#ffffff',
                border: '1px solid #00d4ff'
              }
            });
          }
          return;
        }

        // 2. Real-time User Threat Update for Admins & Sub-Admins
        if (payload.type === 'user_threat_update' && isAdminOrSubAdmin) {
          const item = payload.data || {};
          toast(`⚠️ Intrusion Target: ${item.user_email || 'User'} (${item.threat_type} from ${item.source_ip})`, {
            duration: 5000,
            icon: '🛡️',
            style: {
              background: '#141d35',
              color: '#00d4ff',
              border: '1px solid #1e2d4a'
            }
          });
          return;
        }

        // 3. Auto-block Enforcements
        if (payload.type === 'auto_blocked') {
          const blockInfo = payload.data || {};
          setNotifications(prev => [payload, ...prev].slice(0, 50));
          setUnreadCount(prev => prev + 1);

          // Only pop up toast for Admins
          if (isAdminOrSubAdmin) {
            toast.success(`🛡️ AI Auto-Block Enforced: ${blockInfo.ip_address} neutralized (${blockInfo.threat_type})!`, {
              duration: 5000,
              style: {
                background: '#0f1729',
                color: '#ffffff',
                border: '1px solid #ef4444'
              }
            });
          }
          return;
        }

        // 4. Standard Threat Alerts & Dual AI alerts
        if (payload.type === 'notification' || payload.type === 'threat' || payload.type === 'dual_ai_alert') {
          const item = payload.data || payload;
          const threatType = item.threat_type || 'THREAT';

          setNotifications(prev => [payload, ...prev].slice(0, 50));
          setUnreadCount(prev => prev + 1);
          
          // Popups strictly restricted to Admins / Sub-Admins only!
          if (isAdminOrSubAdmin && (item.severity === 'CRITICAL' || item.severity === 'HIGH')) {
            const userLabel = item.user_email ? ` [Target: ${item.user_email}]` : '';
            toast.error(`🚨 ${item.severity} Intrusion: ${threatType} from ${item.source_ip || 'host'}${userLabel}!`, {
              duration: 5000
            });
          }
        }
      } catch (e) {}
    };
    websocket.onclose = () => {
      setTimeout(connect, 5000);
    };
    setWs(websocket);
  }, [token, isStandardUser, isAdminOrSubAdmin]);

  useEffect(() => {
    connect();
    return () => ws?.close();
  }, [connect]);

  useEffect(() => {
    if (token) {
      notificationsAPI.getUnreadCount().then(({ data }) => setUnreadCount(data.count)).catch(() => {});
      notificationsAPI.getNotifications({ page_size: 20 }).then(({ data }) => {
        const list = data.items || [];
        setNotifications(list);
        const directives = list.filter(n => n.notification_type === 'admin_directive');
        setAdminNotices(directives);
      }).catch(() => {});
    }
  }, [token]);

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setUnreadCount(0);
    } catch (e) {}
  };

  return (
    <NotificationContext.Provider value={{ notifications, adminNotices, unreadCount, markAsRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};
