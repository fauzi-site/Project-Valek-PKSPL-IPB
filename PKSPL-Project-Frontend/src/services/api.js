import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

let isRedirectingToLogin = false;

api.interceptors.response.use(response => {
  return response;
}, error => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('pkspl_last_activity');

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isAuthRoute =
      currentPath === '/login' ||
      currentPath.startsWith('/login') ||
      currentPath === '/register' ||
      currentPath.startsWith('/register') ||
      currentPath === '/forgot-password' ||
      currentPath === '/reset-password' ||
      currentPath.startsWith('/auth/');

    if (!error.config?._skipAuthRedirect && !isAuthRoute && !isRedirectingToLogin) {
      isRedirectingToLogin = true;
      window.location.href = '/login';
    }
  }
  return Promise.reject(error);
});

export default api;
