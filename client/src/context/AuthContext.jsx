import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('raksha_auth_token');
      const savedUser = localStorage.getItem('raksha_user_data');
      const guestFlag = localStorage.getItem('raksha_is_guest');

      if (guestFlag === 'true') {
        setIsGuest(true);
        setUser({
          role: 'CITIZEN',
          name: 'Guest Citizen',
          isGuest: true,
          jurisdiction: { state: 'Meghalaya', district: 'East Khasi Hills', districtId: 'EKH', village: 'Sohra' },
        });
        setLoading(false);
        return;
      }

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('raksha_user_data', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('Token validation failed:', err.message);
          localStorage.removeItem('raksha_auth_token');
          localStorage.removeItem('raksha_user_data');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (identifier, password, portalRole) => {
    const res = await api.post('/auth/login', {
      identifier,
      password,
      portalRole,
    });

    if (res.data.success) {
      localStorage.setItem('raksha_auth_token', res.data.token);
      localStorage.setItem('raksha_user_data', JSON.stringify(res.data.user));
      localStorage.removeItem('raksha_is_guest');
      setUser(res.data.user);
      setIsGuest(false);
      return res.data;
    }
  };

  const register = async (formData) => {
    const res = await api.post('/auth/register', formData);
    if (res.data.success && res.data.token) {
      localStorage.setItem('raksha_auth_token', res.data.token);
      localStorage.setItem('raksha_user_data', JSON.stringify(res.data.user));
      localStorage.removeItem('raksha_is_guest');
      setUser(res.data.user);
      setIsGuest(false);
    }
    return res.data;
  };

  const loginAsGuest = (districtId = 'EKH', village = 'Sohra') => {
    const guestObj = {
      role: 'CITIZEN',
      name: 'Guest Citizen',
      isGuest: true,
      jurisdiction: {
        state: districtId === 'DH' ? 'Assam' : 'Meghalaya',
        district: districtId === 'DH' ? 'Dima Hasao' : 'East Khasi Hills',
        districtId,
        village,
      },
    };
    localStorage.setItem('raksha_is_guest', 'true');
    localStorage.setItem('raksha_user_data', JSON.stringify(guestObj));
    localStorage.removeItem('raksha_auth_token');
    setUser(guestObj);
    setIsGuest(true);
  };

  const logout = () => {
    localStorage.removeItem('raksha_auth_token');
    localStorage.removeItem('raksha_user_data');
    localStorage.removeItem('raksha_is_guest');
    setUser(null);
    setIsGuest(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isGuest, login, register, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
