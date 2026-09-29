import api from './api'

export const getLandingStatistics = async () => {
  const response = await api.get('/statistics', { _skipAuthRedirect: true })
  return response.data?.data || response.data
}

export const getPublicProjectActivity = async (params = {}) => {
  const response = await api.get('/public/projects/activity', { params, _skipAuthRedirect: true })
  return response.data?.data || response.data
}
