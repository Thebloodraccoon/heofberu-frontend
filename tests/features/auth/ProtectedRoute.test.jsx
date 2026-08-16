import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute, { GMRoute } from '@/features/auth/ProtectedRoute.jsx'

const { mockAuth } = vi.hoisted(() => ({ mockAuth: { authenticated: true, isGM: true } }))

vi.mock('@/features/auth/useAuth.js', () => ({
  useAuth: () => mockAuth,
}))

const renderProtected = (initialEntry) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/characters" element={<div>Защищённый контент</div>} />
        </Route>
        <Route path="/login" element={<div>Страница входа</div>} />
        <Route path="/profile" element={<div>Страница профиля</div>} />
      </Routes>
    </MemoryRouter>,
  )

const renderGm = (initialEntry) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/gm" element={<GMRoute><div>GM контент</div></GMRoute>} />
        <Route path="/login" element={<div>Страница входа</div>} />
        <Route path="/profile" element={<div>Страница профиля</div>} />
      </Routes>
    </MemoryRouter>,
  )

describe('ProtectedRoute', () => {
  it('renders the outlet when authenticated', () => {
    mockAuth.authenticated = true
    renderProtected('/characters')
    expect(screen.getByText('Защищённый контент')).toBeInTheDocument()
  })

  it('redirects to /login when unauthenticated', () => {
    mockAuth.authenticated = false
    renderProtected('/characters')
    expect(screen.getByText('Страница входа')).toBeInTheDocument()
  })
})

describe('GMRoute', () => {
  it('renders children for GM users', () => {
    mockAuth.authenticated = true
    mockAuth.isGM = true
    renderGm('/gm')
    expect(screen.getByText('GM контент')).toBeInTheDocument()
  })

  it('redirects non-GM users to /profile', () => {
    mockAuth.authenticated = true
    mockAuth.isGM = false
    renderGm('/gm')
    expect(screen.getByText('Страница профиля')).toBeInTheDocument()
  })

  it('redirects unauthenticated users to /login', () => {
    mockAuth.authenticated = false
    mockAuth.isGM = false
    renderGm('/gm')
    expect(screen.getByText('Страница входа')).toBeInTheDocument()
  })
})
