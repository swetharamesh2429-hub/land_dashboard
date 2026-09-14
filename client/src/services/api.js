import axios from 'axios';
import { loadingTracker } from '../utils/loadingTracker';

/**
 * Resolves the backend API base URL from environment variables
 * Supports full URLs (e.g., https://raksha-api.onrender.com) and relative paths (/api)
 */
export const getBaseURL = () => {
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (!envApiUrl || envApiUrl.trim() === '') {
    return '/api';
  }
  const cleanUrl = envApiUrl.trim().replace(/\/+$/, '');
  if (cleanUrl.startsWith('/')) {
    return cleanUrl;
  }
  if (cleanUrl.endsWith('/api')) {
    return cleanUrl;
  }
  return `${cleanUrl}/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Attach JWT Token and trigger loading bar
api.interceptors.request.use(
  (config) => {
    loadingTracker.start();
    const token = localStorage.getItem('raksha_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    loadingTracker.stop();
    return Promise.reject(error);
  }
);

// Response Interceptor: Stop loading bar, uniform error extraction & automatic session expiry redirect
api.interceptors.response.use(
  (response) => {
    loadingTracker.stop();
    return response;
  },
  (error) => {
    loadingTracker.stop();
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');

    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('raksha_auth_token');
      localStorage.removeItem('raksha_user_data');
      localStorage.removeItem('raksha_is_guest');

      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=1';
      }
    }

    const customError = {
      message: error.response?.data?.message || error.message || 'Network request failed',
      status: error.response?.status || 500,
      data: error.response?.data,
    };
    return Promise.reject(customError);
  }
);

export default api;

