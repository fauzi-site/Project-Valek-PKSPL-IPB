import api from './api'

const getData = async (path, params = {}) => {
  const response = await api.get(path, { params: { per_page: 100, ...params } })
  return Array.isArray(response.data?.data) ? response.data.data : []
}

export const getDataMaster = async (params = {}) => {
  const [provisioning, regulating, supporting, cultural] = await Promise.all([
    getData('/provisioning-services', params),
    getData('/regulating-services', params),
    getData('/supporting-services', params),
    getData('/cultural-services', params),
  ])

  return { provisioning, regulating, supporting, cultural }
}

/**
 * Mengambil data master proyek aktif (Peneliti) yang terisolasi wilayah proyek.
 */
export const getProjectDataMaster = async (projectId) => {
  const response = await api.get(`/proyek/${projectId}/data-master`)
  return response.data
}

/**
 * Menyimpan data master proyek aktif (Peneliti).
 */
export const storeProjectDataMaster = async (projectId, payload) => {
  const response = await api.post(`/proyek/${projectId}/data-master`, payload)
  return response.data
}

/**
 * Mengambil data master global nasional untuk Super Admin / Admin Pusat
 * Mendukung filter: provinsi_id, kabupaten_kota_id, category, search, page, per_page
 */
export const getAdminMasterData = async (params = {}) => {
  const response = await api.get('/admin/master-data', { params })
  return response.data
}

/**
 * Menyimpan data master global baru (Admin).
 */
export const storeAdminMasterData = async (payload) => {
  const response = await api.post('/admin/master-data', payload)
  return response.data
}

/**
 * Memperbarui data master global yang ada (Admin).
 */
export const updateAdminMasterData = async (category, id, payload) => {
  const response = await api.put(`/admin/master-data/${category}/${id}`, payload)
  return response.data
}

/**
 * Menghapus data master global (Admin).
 */
export const deleteAdminMasterData = async (category, id) => {
  const response = await api.delete(`/admin/master-data/${category}/${id}`)
  return response.data
}

export default {
  getDataMaster,
  getProjectDataMaster,
  storeProjectDataMaster,
  getAdminMasterData,
  storeAdminMasterData,
  updateAdminMasterData,
  deleteAdminMasterData,
}
