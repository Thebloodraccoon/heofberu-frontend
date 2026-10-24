import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CandidatesDrawer from '@/features/campaigns/components/CandidatesDrawer.jsx'

const state = vi.hoisted(() => ({ params: [], enabled: [], add: vi.fn(), pending: false, loading: false, placeholder: false, error: null, items: [], total: 2, refetch: vi.fn() }))
vi.mock('@/features/campaigns/queries.js', () => ({
  useCandidates: (_id, params, options) => {
    state.params.push(params)
    state.enabled.push(options.enabled)
    return { data: { items: state.items, total: state.total }, isLoading: state.loading, isPlaceholderData: state.placeholder, error: state.error, refetch: state.refetch }
  },
  useAddToRoster: () => ({ mutate: state.add, isPending: state.pending }),
}))

const candidates = [
  { id: 1, name: 'Эйра', owner: { username: 'Ария' }, level: 3, class_name: 'Волшебник', race_name: 'Эльф' },
  { id: 2, name: 'Бор', owner: { username: 'Олег' }, level: 5, class_name: 'Воин', race_name: 'Человек' },
]
const campaign = { id: 10, title: 'Маяк', viewer_role: 'gm', status: 'active', archived_at: null }
function setup(patch = {}) {
  const onClose = vi.fn()
  const result = render(<CandidatesDrawer campaign={{ ...campaign, ...patch }} onClose={onClose} />)
  return { ...result, user: userEvent.setup(), onClose }
}

describe('character selection for a table', () => {
  beforeEach(() => {
    state.params = []
    state.enabled = []
    state.pending = false
    state.loading = false
    state.placeholder = false
    state.error = null
    state.items = candidates
    state.total = 2
  })

  it('selects a card without writing and adds only the selected character from the footer', async () => {
    const { user, onClose } = setup()
    const addButton = screen.getByRole('button', { name: 'Добавить', exact: true })
    expect(addButton).toBeDisabled()
    expect(screen.getByText('@Ария')).toBeVisible()
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
    expect(screen.getByRole('dialog')).toBeVisible()
  })

  it('can deselect a character and closes without adding it', async () => {
    const { user, onClose } = setup()
    const card = screen.getByRole('button', { name: /Эйра/ })
    await user.click(card)
    await user.click(card)
    expect(card).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Добавить', exact: true })).toBeDisabled()
    await user.click(card)
    await user.click(screen.getByRole('button', { name: 'Закрыть', exact: true }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(state.add).not.toHaveBeenCalled()
  })

  it('searches by name and optional username on the server and clears the selection', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: /Эйра/ }))
    await user.type(screen.getByRole('searchbox', { name: 'Имя персонажа' }), ' Эйра ')
    await user.click(screen.getByRole('button', { name: 'Найти персонажей' }))
    expect(state.params.at(-1)).toMatchObject({ q: 'Эйра', player: undefined, page: 1, size: 10 })
    expect(screen.getByRole('button', { name: 'Добавить', exact: true })).toBeDisabled()
    await user.click(screen.getByText('Ник игрока', { selector: 'summary span' }))
    await user.type(screen.getByRole('textbox', { name: 'Ник игрока' }), ' @Ария ')
    await user.click(screen.getByRole('button', { name: 'Найти игрока' }))
    expect(state.params.at(-1)).toMatchObject({ q: 'Эйра', player: 'Ария', page: 1 })
  })

  it('clears selection when changing pages and does not select placeholder data', async () => {
    state.total = 11
    const { user, rerender } = setup()
    await user.click(screen.getByRole('button', { name: /Эйра/ }))
    await user.click(screen.getByRole('button', { name: 'Следующая страница' }))
    expect(state.params.at(-1).page).toBe(2)
    expect(screen.getByRole('button', { name: 'Добавить', exact: true })).toBeDisabled()
    state.placeholder = true
    rerender(<CandidatesDrawer campaign={campaign} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Эйра/ })).toBeDisabled()
  })

  it('keeps the selection on a server conflict and allows retry', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: /Эйра/ }))
    await user.click(screen.getByRole('button', { name: 'Добавить', exact: true }))
    act(() => state.add.mock.calls[0][1].onError({ message: 'Conflict', data: { error: { type: 'CharacterNotFreeException' } } }))
    expect(screen.getByRole('alert')).toHaveTextContent('Персонаж уже играет в другой кампании.')
    expect(screen.getByRole('button', { name: /Эйра/ })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(state.add).toHaveBeenLastCalledWith(1, expect.any(Object))
    expect(state.add).toHaveBeenCalledTimes(2)
  })

  it('distinguishes loading, errors with retry, and empty results', async () => {
    state.loading = true
    const { user, rerender } = setup()
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(screen.queryByText('Свободных персонажей пока нет.')).not.toBeInTheDocument()
    state.loading = false
    state.error = new Error('Сервер недоступен')
    rerender(<CandidatesDrawer campaign={campaign} onClose={vi.fn()} />)
    expect(screen.getByText('Сервер недоступен')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(state.refetch).toHaveBeenCalledOnce()
    state.error = null
    state.items = []
    state.total = 0
    rerender(<CandidatesDrawer campaign={campaign} onClose={vi.fn()} />)
    expect(screen.getByText('Свободных персонажей пока нет.')).toBeVisible()
  })

  it.each([{ status: 'finished' }, { archived_at: '2026-10-01' }, { viewer_role: 'player' }])('does not load or add characters without roster access: %o', async (patch) => {
    const { user } = setup(patch)
    expect(state.enabled.at(-1)).toBe(false)
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Добавить', exact: true }))
    expect(state.add).not.toHaveBeenCalled()
  })

  it('keeps the drawer open and blocks duplicate submission while adding', async () => {
    const { user, onClose, rerender } = setup()
    await user.click(screen.getByRole('button', { name: /Эйра/ }))
    state.pending = true
    rerender(<CandidatesDrawer campaign={campaign} onClose={onClose} />)
    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Закрыть', exact: true })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Добавляем…' })).toBeDisabled()
    expect(state.add).not.toHaveBeenCalled()
  })
})
