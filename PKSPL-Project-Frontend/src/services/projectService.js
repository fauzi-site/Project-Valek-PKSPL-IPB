import api from './api'
import { triggerAdminCountsRefresh } from './adminAnalyticsService'

export const getProyekList = async (params = {}) => {
  const response = await api.get('/proyek', { params })
  return response.data?.data || response.data
}

export const getPublicMapProjects = async (params = {}) => {
  const response = await api.get('/public/projects/map', { params, _skipAuthRedirect: true })
  return response.data?.data || response.data
}

export const getPublicProjectDetail = async (idProyek) => {
  const response = await api.get(`/public/projects/${idProyek}`, { _skipAuthRedirect: true })
  return response.data?.data || response.data
}

export const getPublicProjectActivity = async (params = {}) => {
  const response = await api.get('/public/projects/activity', { params, _skipAuthRedirect: true })
  return response.data?.data || response.data
}

export const getProyekById = async (idProyek) => {
  const response = await api.get(`/proyek/${idProyek}`)
  return response.data?.data || response.data
}

export const getNextProyekCode = async () => {
  const response = await api.get('/proyek/next-code')
  return response.data?.next_code || response.data
}

export const createProyek = async (payload) => {
  const response = await api.post('/proyek', payload)
  triggerAdminCountsRefresh()
  return response.data?.data || response.data
}

export const updateProyek = async (idProyek, payload) => {
  if (typeof FormData !== 'undefined' && payload instanceof FormData) {
    if (!payload.has('_method')) {
      payload.append('_method', 'PUT')
    }
    const response = await api.post(`/proyek/${idProyek}`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data?.data || response.data
  }
  const response = await api.put(`/proyek/${idProyek}`, payload)
  return response.data?.data || response.data
}

export const deleteProyek = async (idProyek) => {
  const response = await api.delete(`/proyek/${idProyek}`)
  triggerAdminCountsRefresh()
  return response.data
}

export const deleteProjectShapefileApi = async (idProyek, deleteIndices = false) => {
  const response = await api.delete(`/proyek/${idProyek}/shapefile`, {
    params: { delete_indices: deleteIndices ? 1 : 0 },
  })
  return response.data
}
