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
    // If request explicitly opts out of automatic auth redirect (e.g. /auth/me or /statistics),
    // do not wipe storage or force-redirect here. Let the caller handle the error.
    if (error.config?._skipAuthRedirect) {
      return Promise.reject(error);
    }

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isProtectedRoute =
      currentPath.startsWith('/admin') ||
      currentPath.startsWith('/peneliti') ||
      currentPath.startsWith('/projects') ||
      currentPath.startsWith('/valuasi');

    // Clean up stale credentials on 401
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('pkspl_user');
    sessionStorage.removeItem('pkspl_user');
    localStorage.removeItem('pkspl_last_activity');

    // Only force redirect to /login if user was actively on a protected route.
    // Public routes (such as '/', '/login', etc.) must NEVER be redirected.
    if (isProtectedRoute && !isRedirectingToLogin) {
      isRedirectingToLogin = true;
      window.location.href = '/login';
    }
  }
  return Promise.reject(error);
});

export default api;
