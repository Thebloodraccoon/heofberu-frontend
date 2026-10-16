import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RosterPanel from '@/features/campaigns/components/RosterPanel.jsx'

const state = vi.hoisted(() => ({ mutate: vi.fn() }))
vi.mock('@/components/ToastProvider.jsx', () => ({ useToasts: () => ({ push: vi.fn() }) }))
vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => ({ user: { id: 7 } }) }))
vi.mock('@/features/campaigns/queries.js', () => ({
  useRosterPage: () => ({ data: { items: [
    { id: 11, status: 'active', joined_at: '2099-01-01T00:00:00Z', ended_at: null, character: { id: 42, name: 'Гурн', level: 3, class_name: 'воин', race_name: 'дварф' }, owner: { id: 7, username: 'Анна' } },
    { id: 12, status: 'dead', joined_at: '2099-01-01T00:00:00Z', ended_at: '2099-02-01T00:00:00Z', character: { id: 43, name: 'Илса', level: 2, class_name: 'маг', race_name: null }, owner: { id: 8, username: 'Иван' } },
  ], total: 2 }, refetch: vi.fn() }),
  useSetRosterStatus: () => ({ mutate: state.mutate, isPending: false, reset: vi.fn() }),
}))
vi.mock('@/features/campaigns/components/CandidatesDrawer.jsx', () => ({ default: () => <div>Поиск свободных персонажей</div> }))
vi.mock('@/features/campaigns/components/GmPanelDrawer.jsx', () => ({ default: ({ name }) => <div>ГМ-панель открыта: {name}</div> }))

const campaign = (viewerRole) => ({ id: 1, title: 'Нова', status: 'active', viewer_role: viewerRole, archived_at: null })
function setup(viewerRole = 'gm') {
  render(<MemoryRouter><RosterPanel campaign={campaign(viewerRole)} /></MemoryRouter>)
  return userEvent.setup()
}

describe('campaign roster', () => {
  beforeEach(() => state.mutate.mockClear())

  it('offers only the moves the backend allows for each status', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Статус: Илса' }))
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Исключён'])
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Статус: Гурн' }))
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Погиб', 'Ушёл на покой', 'Исключён'])
  })

  it('changes a status right away but asks before removing', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Статус: Гурн' }))
    await user.click(screen.getByRole('option', { name: 'Погиб' }))
    expect(state.mutate).toHaveBeenLastCalledWith({ participationId: 11, status: 'dead' }, expect.any(Object))
    await user.click(screen.getByRole('button', { name: 'Статус: Гурн' }))
    await user.click(screen.getByRole('option', { name: 'Исключён' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText(/потеряет к ней доступ/)).toBeVisible()
    await user.click(dialog.getByRole('button', { name: 'Исключить' }))
    expect(state.mutate).toHaveBeenLastCalledWith({ participationId: 11, status: 'removed' }, expect.any(Object))
  })

  it('opens the GM panel of an active character right from the roster', async () => {
    const user = setup()
    expect(screen.getAllByRole('button', { name: /ГМ-панель/ })).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: /ГМ-панель/ }))
    expect(screen.getByText('ГМ-панель открыта: Гурн')).toBeVisible()
  })

  it('lets a player open only their own sheet and change nothing', () => {
    setup('player')
    expect(screen.queryByRole('button', { name: /Статус:/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Добавить персонажа/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Лист/ })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /ГМ-панель/ })).not.toBeInTheDocument()
  })
})
