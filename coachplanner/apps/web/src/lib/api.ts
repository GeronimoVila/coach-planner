import axios from 'axios';
import * as Sentry from "@sentry/nextjs";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const statusCode = error.response?.status;
    const errorMessage = error.response?.data?.message || 'Ocurrió un error inesperado';

    if (statusCode === 401 || statusCode === 403) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        console.warn('⛔ Sesión invalidada. Redirigiendo al login...');
        
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';

        window.location.href = '/login?reason=session_expired';
        return Promise.reject(error);
      }
    }

    if (!statusCode || statusCode >= 500) {
      Sentry.captureException(error);
    }

    if (statusCode !== 401) {
      toast.error('Error del sistema', {
        description: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage,
      });
    }
    
    return Promise.reject(error);
  }
);

const students = {
  getAvailableCategories: async (token?: string) => {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    const { data } = await axiosInstance.get('/students/me/available-categories', config);
    return data;
  },

  updateCategory: async (token: string, categoryId: number) => {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    const { data } = await axiosInstance.patch('/students/me/category', { categoryId }, config);
    return data;
  }
};

const auth = {
  refreshSession: async (token?: string) => {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    const { data } = await axiosInstance.get('/auth/refresh', config);
    return data;
  }
};

export const api = Object.assign(axiosInstance, {
  students,
  auth
});