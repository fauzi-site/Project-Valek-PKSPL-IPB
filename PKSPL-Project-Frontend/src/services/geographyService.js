import api from './api'

const boundaryCache = new Map()

export const getProvinsi = async (params = {}) => {
  const response = await api.get('/provinsi', {
    params: { per_page: 'all', ...params },
  })
  return response.data?.data || response.data
}

export const getKabupatenKota = async (idProvinsi, params = {}) => {
  const response = await api.get('/kabupaten-kota', {
    params: { id_provinsi: idProvinsi, per_page: 'all', ...params },
  })
  return response.data?.data || response.data
}

export const getKecamatan = async (idKabupatenKota, params = {}) => {
  const response = await api.get('/kecamatan', {
    params: { id_kabupaten_kota: idKabupatenKota, per_page: 'all', ...params },
  })
  return response.data?.data || response.data
}

export const getDesaKelurahan = async (idKecamatan, params = {}) => {
  const response = await api.get('/desa-kelurahan', {
    params: { id_kecamatan: idKecamatan, per_page: 'all', ...params },
  })
  return response.data?.data || response.data
}

export const lookupBoundary = async (level, code) => {
  const cacheKey = `${level}_${code}`
  if (boundaryCache.has(cacheKey)) {
    return boundaryCache.get(cacheKey)
  }

  try {
    const response = await api.get('/boundary-lookup', {
      params: { level, code },
    })

    if (response.data?.found) {
      boundaryCache.set(cacheKey, response.data)
    }

    return response.data
  } catch (err) {
    if (err.response && err.response.data) {
      return err.response.data
    }
    return { found: false }
  }
}
