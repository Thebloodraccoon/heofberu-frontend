import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfilePage from '@/features/profile/pages/ProfilePage.jsx'
import { renderWithProviders } from '@tests/helpers/render.jsx'

const mocks = vi.hoisted(() => {
  const loadUser = vi.fn()
  // Default player state.
  let useAuthResult = {
    user: {
      id: 1,
      username: 'Ария',
      email: 'aria@example.com',
      role: 'player',
      bio: 'Люблю драконов',
      phone: '+380 90 000-00-00',
      discord: '',
      telegram: '@aria',
      created_at: '2026-01-01T00:00:00.000Z',
    },
    isGM: false,
    isFounder: false,
    loadUser,
  }
  return {
    loadUser,
    setUseAuthResult: (r) => {
      useAuthResult = r
    },
    useAuth: () => useAuthResult,
  }
})

vi.mock('@/features/auth/useAuth.js', () => ({
  useAuth: mocks.useAuth,
}))

vi.mock('@/features/users/queries.js', () => ({
  useUpdateMe: () => ({
    mutate: vi.fn((form, opts) => opts?.onSuccess?.(form)),
    isPending: false,
    isSuccess: false,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.setUseAuthResult({
    user: {
      id: 1,
      username: 'Ария',
      email: 'aria@example.com',
      role: 'player',
      bio: 'Люблю драконов',
      phone: '+380 90 000-00-00',
      discord: '',
      telegram: '@aria',
      created_at: '2026-01-01T00:00:00.000Z',
    },
    isGM: false,
    isFounder: false,
    loadUser: mocks.loadUser,
  })
})

describe('ProfilePage', () => {
  it('shows the player profile with contacts and bio but no player panel', () => {
    renderWithProviders(<ProfilePage />)

    expect(screen.getByText('Ария')).toBeInTheDocument()
    expect(screen.getByText('aria@example.com')).toBeInTheDocument()
    expect(screen.getByText('Люблю драконов')).toBeInTheDocument()
    expect(screen.getByText('+380 90 000-00-00')).toBeInTheDocument()
    expect(screen.getByText('@aria')).toBeInTheDocument()
    expect(screen.queryByText('Панель игрока')).not.toBeInTheDocument()
  })

  it('shows placeholders for empty contacts', () => {
    mocks.setUseAuthResult({
      user: {
        ...mocks.useAuth().user,
        phone: '',
        discord: '',
        telegram: '',
      },
      isGM: false,
      isFounder: false,
      loadUser: mocks.loadUser,
    })

    renderWithProviders(<ProfilePage />)

    expect(screen.getAllByText('не указано').length).toBe(3)
  })

  it('switches to edit mode and shows inputs for contacts', async () => {
    mocks.setUseAuthResult({
      user: {
        ...mocks.useAuth().user,
        phone: '',
        discord: '',
        telegram: '',
      },
      isGM: false,
      isFounder: false,
      loadUser: mocks.loadUser,
    })

    renderWithProviders(<ProfilePage />)
    await userEvent.click(screen.getByRole('button', { name: /редактировать/i }))

    expect(screen.getByPlaceholderText('+380 90 000-00-00')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('username#0000')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('@username')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /сохранить/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /отмена/i })).toBeInTheDocument()
  })
})
