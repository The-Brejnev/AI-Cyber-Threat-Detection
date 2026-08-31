import { useEffect, useState, useRef } from 'react';
import { useAuth } from './useAuth';

export const useWebSocket = (endpoint = '') => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    
    let retryCount = 0;
    const maxRetries = 5;
    
    const connect = () => {
      const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
      const wsUrl = `${baseUrl}${endpoint}?token=${token}`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        retryCount = 0;
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          setData(parsed);
        } catch (e) {}
      };
      
      wsRef.current.onclose = () => {
        setIsConnected(false);
        if (retryCount < maxRetries) {
          setTimeout(connect, Math.min(1000 * Math.pow(2, retryCount), 10000));
          retryCount++;
        }
      };
    };
    
    connect();
    
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [token, endpoint]);
  
  return { data, isConnected };
};
