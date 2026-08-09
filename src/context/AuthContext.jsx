/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../api/endpoints.js'
import { getToken, setToken, subscribeToken, decodeToken } from '../api/client.js'

const AuthContext = createContext(null)
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
      const profile = await api.users.me()
      setUser(profile)
      localStorage.setItem(USER_KEY, JSON.stringify(profile))
      return profile
    } catch {
      try {
        const profile = await api.users.get(decoded.id)
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
      const data = await api.auth.login({ email, password })
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
      const data = await api.auth.register({ username, email, password })
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
      await api.auth.logout()
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

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
