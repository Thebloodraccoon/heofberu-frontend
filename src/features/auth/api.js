import request from '@/lib/api/httpClient.js'

export const authApi = {
  login: (body) => request('/api/auth/login', { method: 'POST', body, auth: false }),
  register: (body) => request('/api/auth/register', { method: 'POST', body, auth: false }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
}
