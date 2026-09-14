import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const getSocketURL = () => {
  if (import.meta.env.VITE_SOCKET_URL && import.meta.env.VITE_SOCKET_URL.trim() !== '') {
    return import.meta.env.VITE_SOCKET_URL.trim();
  }
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && (apiUrl.startsWith('http://') || apiUrl.startsWith('https://'))) {
    try {
      const parsed = new URL(apiUrl);
      return parsed.origin;
    } catch (e) {
      return apiUrl.replace(/\/api\/?$/, '');
    }
  }
  return typeof window !== 'undefined' ? window.location.origin : undefined;
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('OFFLINE'); // LIVE, RECONNECTING, OFFLINE
  const [liveActivities, setLiveActivities] = useState([
    { id: 1, text: 'Officer confirmed alert ALT-WRN-6202', time: '12m ago', type: 'ALERT_CONFIRMED' },
    { id: 2, text: 'Field report received for Sohra slope', time: '18m ago', type: 'FIELD_REPORT' },
    { id: 3, text: 'Sensor SENS-EKH-04 anomaly flagged', time: '24m ago', type: 'SENSOR_ANOMALY' },
    { id: 4, text: 'AI raised Danger risk for Haflong Ridge', time: '35m ago', type: 'RISK_ESCALATED' },
  ]);
  const [activeSOS, setActiveSOS] = useState(null);
  const [dangerAlertBroadcast, setDangerAlertBroadcast] = useState(null);

  useEffect(() => {
    const socketTarget = getSocketURL();
    const socketInstance = io(socketTarget, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 2000,
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Connected to RAKSHA-NER Real-Time Stream:', socketInstance.id);
      setConnectionStatus('LIVE');

      if (user?.jurisdiction?.districtId) {
        socketInstance.emit('join_district', user.jurisdiction.districtId);
      }
    });

    socketInstance.on('disconnect', () => {
      setConnectionStatus('OFFLINE');
    });

    socketInstance.on('connect_error', () => {
      setConnectionStatus('RECONNECTING');
    });

    // Real-Time Event Handlers
    socketInstance.on('ALERT_CREATED', (data) => {
      addActivity(`New ${data.tier} alert generated for ${data.villageName}`, 'ALERT_CREATED');
    });

    socketInstance.on('ALERT_ESCALATED_TO_DANGER', (data) => {
      addActivity(`🚨 High-risk hazard in ${data.zone?.name || 'zone'}. Awaiting Officer review.`, 'DANGER_ESCALATED');
    });

    socketInstance.on('ALERT_CONFIRMED_DISPATCHED', (data) => {
      addActivity(`Officer confirmed & dispatched ${data.tier} alert for ${data.villageName}`, 'ALERT_DISPATCHED');
      if (data.tier === 'DANGER') {
        setDangerAlertBroadcast(data);
      }
    });

    socketInstance.on('EMERGENCY_DANGER_BROADCAST', (data) => {
      setDangerAlertBroadcast(data);
    });

    socketInstance.on('ALERT_DISMISSED_FALSE_POSITIVE', (data) => {
      addActivity(`Alert ${data.alertCode} dismissed as False Positive by ${data.dismissedBy}`, 'ALERT_DISMISSED');
    });

    socketInstance.on('SENSOR_STATUS_CHANGED', (data) => {
      addActivity(`Sensor ${data.sensorCode || data.name} status: ${data.status}`, 'SENSOR_STATUS');
    });

    socketInstance.on('CITIZEN_REPORT_SUBMITTED', (data) => {
      addActivity(`Citizen report received from ${data.villageName} (${data.category})`, 'CITIZEN_REPORT');
    });

    socketInstance.on('FIELD_VERIFICATION_SUBMITTED', (data) => {
      addActivity(`Field officer ${data.fieldOfficerName} submitted evidence for ${data.villageName}`, 'FIELD_VERIFICATION');
    });

    socketInstance.on('CITIZEN_SOS_TRIGGERED', (data) => {
      addActivity(`🚨 EMERGENCY SOS from ${data.citizenName} (${data.villageName})`, 'SOS_TRIGGERED');
      setActiveSOS(data);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  const addActivity = (text, type) => {
    const newEntry = {
      id: Date.now() + Math.random(),
      text,
      time: 'Just now',
      timestamp: new Date(),
      type,
    };
    setLiveActivities((prev) => [newEntry, ...prev.slice(0, 19)]);
  };

  const clearSOS = () => setActiveSOS(null);
  const clearDangerBroadcast = () => setDangerAlertBroadcast(null);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connectionStatus,
        liveActivities,
        activeSOS,
        dangerAlertBroadcast,
        clearSOS,
        clearDangerBroadcast,
        addActivity,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
