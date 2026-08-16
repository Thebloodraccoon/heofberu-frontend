import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request, { decodeToken, getToken, setToken, subscribeToken } from '@/lib/api/httpClient.js'

const TOKEN_KEY = 'heofberu.access_token'

const b64url = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_')
const makeToken = (payload) => `eyJhbGciOiJIUzI1NiJ9.${b64url(payload)}.signature`
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status })
const emptyResponse = (status = 200) => new Response(null, { status })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getToken / setToken', () => {
  beforeEach(() => localStorage.clear())

  it('stores and returns the token', () => {
    expect(getToken()).toBeNull()
    setToken('abc')
    expect(getToken()).toBe('abc')
    expect(localStorage.getItem(TOKEN_KEY)).toBe('abc')
  })

  it('removes the token when cleared with null', () => {
    setToken('abc')
    setToken(null)
    expect(getToken()).toBeNull()
  })

  it('dispatches the token event and returns unsubscribe', () => {
    const cb = vi.fn()
    const unsubscribe = subscribeToken(cb)
    setToken('token')
    expect(cb).toHaveBeenCalledTimes(1)
    setToken('other')
    expect(cb).toHaveBeenCalledTimes(2)
    unsubscribe()
    setToken('third')
    expect(cb).toHaveBeenCalledTimes(2)
  })
})

describe('decodeToken', () => {
  it('returns null for empty input', () => {
    expect(decodeToken(null)).toBeNull()
    expect(decodeToken('')).toBeNull()
  })

  it('decodes a valid JWT payload with fallbacks', () => {
    const token = makeToken({ user_id: 7, role: 'gm', username: 'vasya', email: 'v@test.io' })
    expect(decodeToken(token)).toEqual({ id: 7, role: 'gm', username: 'vasya', email: 'v@test.io' })
  })

  it('falls back to sub and name claims', () => {
    const token = makeToken({ sub: 'sub-1', name: 'Anna' })
    expect(decodeToken(token)).toEqual({ id: 'sub-1', role: null, username: 'Anna', email: null })
  })

  it('extracts the first role from a roles array', () => {
    const token = makeToken({ sub: 1, roles: ['player', 'gm'] })
    expect(decodeToken(token)).toEqual({ id: 1, role: 'player', username: null, email: null })
  })

  it('returns null when no id claim exists', () => {
    const token = makeToken({ role: 'gm', username: 'x' })
    expect(decodeToken(token)).toBeNull()
  })

  it('returns null for malformed tokens', () => {
    expect(decodeToken('not-a-jwt')).toBeNull()
    expect(decodeToken('a.b')).toBeNull()
  })
})

describe('request', () => {
  beforeEach(() => localStorage.clear())

  it('performs a GET with query params, dropping empty values', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    const data = await request('/api/spells', { params: { name: 'fire', limit: 10, skip: undefined, tag: null, q: '' } })

    expect(data).toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url.searchParams.get('name')).toBe('fire')
    expect(url.searchParams.get('limit')).toBe('10')
    expect(url.searchParams.has('skip')).toBe(false)
    expect(url.searchParams.has('tag')).toBe(false)
    expect(url.searchParams.has('q')).toBe(false)
    expect(init.method).toBe('GET')
  })

  it('sends the bearer token when auth is enabled', async () => {
    setToken('secret')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}))
    vi.stubGlobal('fetch', fetchMock)

    await request('/api/users/me')

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers.Authorization).toBe('Bearer secret')
  })

  it('does not send the token when auth is disabled', async () => {
    setToken('secret')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}))
    vi.stubGlobal('fetch', fetchMock)

    await request('/api/auth/login', { method: 'POST', body: { email: 'a', password: 'b' }, auth: false })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers.Authorization).toBeUndefined()
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ email: 'a', password: 'b' })
  })

  it('returns null for 204 responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(emptyResponse(204))
    vi.stubGlobal('fetch', fetchMock)

    expect(await request('/api/auth/logout', { method: 'POST' })).toBeNull()
  })

  it('throws with a string detail message', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ detail: 'Неверные данные' }, 400))
    vi.stubGlobal('fetch', fetchMock)

    await expect(request('/api/x')).rejects.toThrow('Неверные данные')
  })

  it('joins array detail messages', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: [{ msg: 'First' }, { msg: 'Second' }] }, 422))
    vi.stubGlobal('fetch', fetchMock)

    await expect(request('/api/x')).rejects.toThrow('First; Second')
  })

  it('throws a generic status message for unknown errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 500))
    vi.stubGlobal('fetch', fetchMock)

    const err = await request('/api/x').catch((e) => e)
    expect(err.message).toBe('Ошибка 500')
    expect(err.status).toBe(500)
  })

  it('refreshes the token once and retries on 401', async () => {
    setToken('old-token')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ detail: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ access_token: 'new-token' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    const data = await request('/api/me')

    expect(data).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)

    const refreshCall = fetchMock.mock.calls[1]
    expect(refreshCall[0]).toContain('/api/auth/refresh')
    expect(refreshCall[1].method).toBe('POST')
    expect(refreshCall[1].credentials).toBe('include')
    expect(getToken()).toBe('new-token')

    const retryHeaders = fetchMock.mock.calls[2][1].headers
    expect(retryHeaders.Authorization).toBe('Bearer new-token')
  })

  it('does not attempt refresh for auth endpoints on 401', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ detail: 'bad credentials' }, 401))
    vi.stubGlobal('fetch', fetchMock)

    await expect(request('/api/auth/login', { method: 'POST', body: {}, auth: false })).rejects.toThrow(
      'bad credentials',
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
