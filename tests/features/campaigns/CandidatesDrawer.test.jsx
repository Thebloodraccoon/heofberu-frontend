import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import CandidatesDrawer from '@/features/campaigns/components/CandidatesDrawer.jsx'
import { campaignsApi } from '@/features/campaigns/api.js'

const state = vi.hoisted(() => ({ add: vi.fn(), pending: false }))
vi.mock('@/features/campaigns/queries.js', () => ({
  useAddToRoster: () => ({ mutate: state.add, isPending: state.pending }),
}))

const candidates = [
  { id: 1, name: 'Эйра', owner: { username: 'Ария' }, level: 3, class_name: 'Волшебник', race_name: 'Эльф' },
  { id: 2, name: 'Бор', owner: { username: 'Олег' }, level: 5, class_name: 'Воин', race_name: 'Человек' },
]
const campaign = { id: 10, title: 'Маяк', viewer_role: 'gm', status: 'active', archived_at: null }
function setup(patch = {}) {
  const onClose = vi.fn()
  const result = renderWithProviders(<CandidatesDrawer campaign={{ ...campaign, ...patch }} onClose={onClose} />, { auth: false })
  return { ...result, user: userEvent.setup(), onClose }
}

describe('character selection for a table', () => {
  beforeEach(() => {
    state.add = vi.fn()
    state.pending = false
    vi.spyOn(campaignsApi.roster, 'candidates').mockReset().mockResolvedValue({ items: candidates, total: 2 })
  })

  it('selects a card without writing and adds only the selected character from the footer', async () => {
    const { user, onClose } = setup()
    const addButton = screen.getByRole('button', { name: 'Добавить', exact: true })
    expect(addButton).toBeDisabled()
    expect(await screen.findByText('@Ария')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /Эйра/ }))
    expect(screen.getByRole('button', { name: /Эйра/ })).toHaveAttribute('aria-pressed', 'true')
    expect(state.add).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /Бор/ }))
    await user.click(addButton)
    expect(state.add).toHaveBeenCalledWith(2, expect.any(Object))
    act(() => state.add.mock.calls[0][1].onSuccess())
    expect(screen.queryByRole('button', { name: /Бор/ })).not.toBeInTheDocument()
    expect(addButton).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Персонаж «Бор» добавлен в состав')
    expect(screen.getByRole('searchbox', { name: 'Имя персонажа' })).toHaveFocus()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('searches by name and optional username on the server and clears the selection', async () => {
    const { user } = setup()
    await user.click(await screen.findByRole('button', { name: /Эйра/ }))
    await user.type(screen.getByRole('searchbox', { name: 'Имя персонажа' }), ' Эйра ')
    await user.click(screen.getByRole('button', { name: 'Найти персонажей' }))
    await waitFor(() => expect(campaignsApi.roster.candidates).toHaveBeenLastCalledWith(10, expect.objectContaining({ q: 'Эйра', page: 1, size: 10 })))
    expect(screen.getByRole('button', { name: 'Добавить', exact: true })).toBeDisabled()
    await user.click(screen.getByText('Ник игрока', { selector: 'summary span' }))
    await user.type(screen.getByRole('textbox', { name: 'Ник игрока' }), ' @Ария ')
    await user.click(screen.getByRole('button', { name: 'Найти игрока' }))
    await waitFor(() => expect(campaignsApi.roster.candidates).toHaveBeenLastCalledWith(10, expect.objectContaining({ q: 'Эйра', player: 'Ария', page: 1 })))
  })

  it('loads the next page when the list is scrolled to the bottom', async () => {
    campaignsApi.roster.candidates.mockImplementation((_id, { page }) => Promise.resolve({ items: page === 1 ? candidates : [{ id: 3, name: 'Лия' }], total: 3 }))
    setup()
    await screen.findByRole('button', { name: /Эйра/ })
    const list = screen.getByRole('list', { name: 'Свободные персонажи' }).parentElement
    act(() => { list.dispatchEvent(new Event('scroll')) })
    expect(await screen.findByRole('button', { name: /Лия/ })).toBeInTheDocument()
    expect(campaignsApi.roster.candidates).toHaveBeenLastCalledWith(10, expect.objectContaining({ page: 2 }))
  })

  it('keeps the selection on a server conflict and allows retry', async () => {
    const { user } = setup()
    await user.click(await screen.findByRole('button', { name: /Эйра/ }))
    await user.click(screen.getByRole('button', { name: 'Добавить', exact: true }))
    act(() => state.add.mock.calls[0][1].onError({ message: 'Conflict', data: { error: { type: 'CharacterNotFreeException' } } }))
    expect(screen.getByRole('alert')).toHaveTextContent('Персонаж уже играет в другой кампании.')
    expect(screen.getByRole('button', { name: /Эйра/ })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(state.add).toHaveBeenLastCalledWith(1, expect.any(Object))
  })

  it('shows errors with retry and empty results', async () => {
    campaignsApi.roster.candidates.mockRejectedValueOnce(new Error('Сервер недоступен'))
    const { user } = setup()
    expect(await screen.findByText('Сервер недоступен')).toBeVisible()
    campaignsApi.roster.candidates.mockResolvedValue({ items: [], total: 0 })
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByText('Свободных персонажей пока нет.')).toBeVisible()
  })

  it.each([{ status: 'finished' }, { archived_at: '2026-10-01' }, { viewer_role: 'player' }])('does not load or add characters without roster access: %o', async (patch) => {
    const { user } = setup(patch)
    expect(campaignsApi.roster.candidates).not.toHaveBeenCalled()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Добавить', exact: true }))
    expect(state.add).not.toHaveBeenCalled()
  })

  it('keeps the drawer open and blocks duplicate submission while adding', async () => {
    const { user, onClose, rerender } = setup()
    await user.click(await screen.findByRole('button', { name: /Эйра/ }))
    state.pending = true
    rerender(<CandidatesDrawer campaign={campaign} onClose={onClose} />)
    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Закрыть', exact: true })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Добавляем…' })).toBeDisabled()
    expect(state.add).not.toHaveBeenCalled()
  })
})
