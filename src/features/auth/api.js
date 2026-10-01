import request from '@/lib/api/httpClient.js'

export const authApi = {
  login: (body) => request('/auth/login', { method: 'POST', body, auth: false }),
  register: (body) => request('/auth/register', { method: 'POST', body, auth: false }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  forgotPassword: (body) => request('/auth/forgot-password', { method: 'POST', body, auth: false }),
  resetPassword: (body) => request('/auth/reset-password', { method: 'POST', body, auth: false }),
}
