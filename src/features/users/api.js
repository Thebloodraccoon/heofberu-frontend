import request from '@/lib/api/httpClient.js'

export const usersApi = {
  list: (params) => request('/users', { params }),
  create: (body) => request('/users', { method: 'POST', body }),
  me: () => request('/users/me'),
  updateMe: (body) => request('/users/me', { method: 'PUT', body }),
  get: (id) => request(`/users/${id}`),
  update: (id, body) => request(`/users/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  flushCache: () => request('/admin/cache', { method: 'DELETE' }),
}
