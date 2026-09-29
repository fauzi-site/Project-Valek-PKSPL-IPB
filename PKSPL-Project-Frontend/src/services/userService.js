import api from './api';

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data?.data ?? [];
};

export const getUserById = async (userId) => {
  const response = await api.get(`/users/${userId}`);
  return response.data?.data ?? response.data;
};

export const getRoles = async () => {
  const response = await api.get('/roles');
  return response.data?.data ?? [];
};

export const createUser = async ({ nama, email, password, id_role, status = 'Aktif' }) => {
  const response = await api.post('/users', {
    nama,
    email,
    password,
    id_role,
    status,
  });

  return response.data;
};

export const updateUser = async (userId, payload) => {
  const response = await api.put(`/users/${userId}`, payload);
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/users/${userId}`);
  return response.data;
};
