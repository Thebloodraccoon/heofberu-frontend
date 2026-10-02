import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UsersPage from '@/features/users/pages/UsersPage.jsx'

const mocks = vi.hoisted(() => ({ update: vi.fn(), flush: vi.fn(), list: vi.fn(), remove: vi.fn() }))
vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => ({ user: { id: 1 } }) }))
vi.mock('@/features/users/queries.js', () => ({
  useUsersPage: (params) => { mocks.list(params); return { data: { total: 2, items: [
    { id: 1, username: 'Отец', email: 'f@x.io', role: 'found_father', created_at: '2026-01-01' },
    { id: 2, username: 'Астра', email: 'a@x.io', role: 'player', created_at: '2026-01-01' },
  ] } } },
  useUpdateUser: () => ({ mutate: mocks.update, isPending: false }),
  useDeleteUser: () => ({ mutate: mocks.remove, isPending: false, reset: vi.fn() }),
  useFlushCache: () => ({ mutate: mocks.flush, isPending: false }),
  useCreateUser: () => ({ mutate: vi.fn(), isPending: false }),
}))

beforeEach(() => vi.clearAllMocks())

describe('UsersPage (admin)', () => {
  it('deletes other users after confirmation but never offers deleting yourself', async () => {
    const user = userEvent.setup()
    render(<UsersPage />)
    expect(screen.getAllByRole('button', { name: 'Удалить' })).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    await user.click(screen.getByRole('button', { name: 'Да, удалить' }))
    expect(mocks.remove).toHaveBeenCalledWith(2, expect.any(Object))
  })

  it('lets the founder promote a player to GM but never offers the founder role', async () => {
    const user = userEvent.setup()
    render(<UsersPage />)
    expect(screen.queryByRole('button', { name: 'Роль Отец' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Роль Астра' }))
    expect(screen.queryByRole('option', { name: 'Основатель' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: 'Гейм-мастер' }))
    expect(mocks.update).toHaveBeenCalledWith({ id: 2, role: 'gm' }, expect.any(Object))
  })

  it('flushes the cache after confirmation and sends search to the API', async () => {
    const user = userEvent.setup()
    render(<UsersPage />)
    await user.click(screen.getByRole('button', { name: 'Сбросить кеш' }))
    await user.click(screen.getByRole('button', { name: 'Сбросить' }))
    expect(mocks.flush).toHaveBeenCalled()
    await user.type(screen.getByRole('searchbox'), 'ast')
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith({ page: 1, size: 20, search: 'ast' }))
  })
})
