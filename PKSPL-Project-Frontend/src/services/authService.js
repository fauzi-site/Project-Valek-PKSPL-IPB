import api from './api';

export const login = async (identity, password) => {
  const response = await api.post('/auth/login', { identity, password }, { _skipAuthRedirect: true });
  return response.data;
};

export const register = async (nama, email, password) => {
  const response = await api.post('/auth/register', { nama, email, password }, { _skipAuthRedirect: true });
  return response.data;
};

export const logout = async () => {
  const response = await api.post('/auth/logout', {}, { _skipAuthRedirect: true });
  return response?.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me', { _skipAuthRedirect: true });
  return response.data;
};

export const getGoogleRedirectUrl = async () => {
  const response = await api.get('/auth/google/redirect', { _skipAuthRedirect: true });
  return response.data;
};

export const resendVerificationEmail = async (email) => {
  const response = await api.post('/auth/email/resend', { email }, { _skipAuthRedirect: true });
  return response.data;
};

export const verifyEmailApi = async (id, hash, searchString = '') => {
  const response = await api.get(`/auth/email/verify/${id}/${hash}${searchString}`, { _skipAuthRedirect: true });
  return response.data;
};

export const sendPresenceHeartbeat = async () => {
  const response = await api.post('/profile/presence', {}, { _skipAuthRedirect: true });
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await api.post('/auth/forgot-password', { email }, { _skipAuthRedirect: true });
  return response.data;
};

export const resetPassword = async (payload) => {
  const response = await api.post('/auth/reset-password', payload, { _skipAuthRedirect: true });
  return response.data;
};

