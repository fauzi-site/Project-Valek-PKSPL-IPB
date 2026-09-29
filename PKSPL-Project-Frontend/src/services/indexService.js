import api from './api'

const unwrap = (response) => response.data?.data || response.data

export const createIndexApi = async (payload) => {
  const response = await api.post('/indexes', payload)
  return unwrap(response)
}

export const getIndexesApi = async (params = {}) => {
  const response = await api.get('/indexes', { params })
  return response.data?.data || response.data
}

export const updateIndexApi = async (id, payload) => {
  const response = await api.put(`/indexes/${id}`, payload)
  return unwrap(response)
}

export const updateLandCoverApi = async (id, payload) => {
  const response = await api.put(`/jenis-tutupan-lahan/${id}`, payload)
  return unwrap(response)
}


export const deleteLandCoverApi = async (id) => {
  await api.delete(`/jenis-tutupan-lahan/${id}`)
}

export const deleteIndexApi = async (id) => {
  await api.delete(`/indexes/${id}`)
}

export const createLandCoverApi = async (payload) => {
  const response = await api.post('/jenis-tutupan-lahan', payload)
  return unwrap(response)
}
