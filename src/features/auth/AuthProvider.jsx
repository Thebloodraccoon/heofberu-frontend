import { useCallback, useEffect, useState } from 'react'
import { authApi } from './api.js'
import { usersApi } from '@/features/users/api.js'
import { getToken, setToken, subscribeToken, decodeToken } from '@/lib/api/httpClient.js'
import { AuthContext } from './AuthContext.js'

const USER_KEY = 'heofberu.user'

function readCachedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(() => Boolean(getToken()))
  const [user, setUser] = useState(() => {
    const token = getToken()
    if (!token) return null
    return readCachedUser() || decodeToken(token)
  })
  const [busy, setBusy] = useState(false)

  const loadUser = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      localStorage.removeItem(USER_KEY)
      return null
    }
    const decoded = decodeToken(token)
    if (!decoded) {
      setUser(null)
      return null
    }
    try {
      const profile = await usersApi.me()
      setUser(profile)
      localStorage.setItem(USER_KEY, JSON.stringify(profile))
      return profile
    } catch {
      try {
        const profile = await usersApi.get(decoded.id)
        setUser(profile)
        localStorage.setItem(USER_KEY, JSON.stringify(profile))
        return profile
      } catch {
        setUser(decoded)
        return decoded
      }
    }
  }, [])

  useEffect(
    () =>
      subscribeToken(() => {
        const token = getToken()
        setAuthenticated(Boolean(token))
        if (token) loadUser()
        else {
          setUser(null)
          localStorage.removeItem(USER_KEY)
        }
      }),
    [loadUser],
  )

  const login = useCallback(async (email, password) => {
    setBusy(true)
    try {
      const data = await authApi.login({ email, password })
      setToken(data.access_token)
      await loadUser()
      return data
    } finally {
      setBusy(false)
    }
  }, [loadUser])

  const register = useCallback(async (username, email, password) => {
    setBusy(true)
    try {
      const data = await authApi.register({ username, email, password })
      setToken(data.access_token)
      await loadUser()
      return data
    } finally {
      setBusy(false)
    }
  }, [loadUser])

  const logout = useCallback(async () => {
    setBusy(true)
    try {
      await authApi.logout()
    } catch {
      // ignore network errors on logout
    } finally {
      setToken(null)
      setBusy(false)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        authenticated,
        user,
        isGM: user?.role === 'gm' || user?.role === 'found_father',
        isFounder: user?.role === 'found_father',
        busy,
        login,
        register,
        logout,
        loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
