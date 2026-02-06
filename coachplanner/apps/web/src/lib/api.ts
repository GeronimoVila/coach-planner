import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3001', 
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        console.warn('⛔ Sesión invalidada. Redirigiendo al login...');
        
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';

        window.location.href = '/login?reason=session_expired';
      }
    }
    
    return Promise.reject(error);
  }
);