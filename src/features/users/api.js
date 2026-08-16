import request from '@/lib/api/httpClient.js'

export const usersApi = {
  list: (params) => request('/api/users', { params }),
  create: (body) => request('/api/users', { method: 'POST', body }),
  me: () => request('/api/users/me'),
  updateMe: (body) => request('/api/users/me', { method: 'PUT', body }),
  get: (id) => request(`/api/users/${id}`),
  update: (id, body) => request(`/api/users/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/api/users/${id}`, { method: 'DELETE' }),
}
