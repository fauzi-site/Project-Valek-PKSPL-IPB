import api from './api';

/**
 * Update profile (nama and/or foto).
 * Uses FormData for multipart file upload.
 */
export const updateProfile = async (formData) => {
  const response = await api.post('/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/**
 * Update password.
 */
export const updatePassword = async ({ current_password, password, password_confirmation }) => {
  const response = await api.post('/profile/password', {
    current_password,
    password,
    password_confirmation,
  });
  return response.data;
};
