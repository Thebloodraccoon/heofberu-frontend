import { API } from '@/config/api.js'

const TOKEN_KEY = 'heofberu.access_token'
const TOKEN_EVENT = 'heofberu:token'

const API_BASE = API.baseURL.replace(/\/+$/, '')

let refreshPromise = null

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
  window.dispatchEvent(new Event(TOKEN_EVENT))
}

export function subscribeToken(cb) {
  window.addEventListener(TOKEN_EVENT, cb)
  return () => window.removeEventListener(TOKEN_EVENT, cb)
}

export function decodeToken(token) {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    const id = claims.user_id ?? claims.sub ?? claims.id
    if (!id) return null
    return {
      id,
      role: claims.role ?? claims.user_role ?? (Array.isArray(claims.roles) ? claims.roles[0] : null),
      username: claims.username ?? claims.name ?? null,
      email: claims.email ?? null,
    }
  } catch {
    return null
  }
}

async function request(path, { method = 'GET', body, params, auth = true } = {}) {
  const url = new URL(API_BASE + path, window.location.origin)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item !== undefined && item !== null && item !== '') url.searchParams.append(k, item)
        }
      } else {
        url.searchParams.set(k, v)
      }
    }
  }

  const headers = { Accept: 'application/json' }
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? body
          : JSON.stringify(body),
    credentials: 'omit',
  })

  if (res.status === 401 && auth && !path.startsWith('/api/auth/')) {
    const refreshed = await refreshAccessToken()
    if (refreshed) return request(path, { method, body, params, auth })
  }

  if (res.status === 204) return null

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '60', 10)
    const limit = res.headers.get('X-RateLimit-Limit')
    const remaining = res.headers.get('X-RateLimit-Remaining')
    const reset = res.headers.get('X-RateLimit-Reset')

    window.dispatchEvent(
      new CustomEvent('heofberu:rate-limit', {
        detail: { retryAfter, limit: limit ? Number(limit) : null, remaining: remaining ? Number(remaining) : null, reset: reset ? Number(reset) : null },
      }),
    )

    const error = new Error(`Слишком много запросов. Повторите через ${retryAfter} сек.`)
    error.status = 429
    error.retryAfter = retryAfter
    error.rateLimit = { limit: limit ? Number(limit) : null, remaining: remaining ? Number(remaining) : null, reset: reset ? Number(reset) : null }
    throw error
  }

  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    const detail =
      (data?.error?.message && typeof data.error.message === 'string' && data.error.message) ||
      (data?.detail && typeof data.detail === 'string' && data.detail) ||
      (Array.isArray(data?.detail) ? data.detail.map((e) => e.msg).join('; ') : '') ||
      `Ошибка ${res.status}`
    const error = new Error(detail)
    error.status = res.status
    error.data = data
    throw error
  }

  return data
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('refresh failed')
        const data = await res.json()
        setToken(data.access_token)
        return true
      })
      .catch(() => {
        setToken(null)
        return false
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

export default request
