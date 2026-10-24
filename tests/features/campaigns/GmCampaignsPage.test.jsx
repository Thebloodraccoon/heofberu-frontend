import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import GmCampaignsPage from '@/features/campaigns/pages/GmCampaignsPage.jsx'
import { formatDateTime } from '@/lib/utils/datetime.js'

const state = vi.hoisted(() => ({ auth: { isFounder: false }, params: [], schedule: [], scheduleResult: {}, retry: vi.fn() }))
vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => state.auth }))
vi.mock('@/features/campaigns/queries.js', () => ({
  useCampaignsPage: (params) => {
    state.params.push(params)
    return { data: { items: [{ id: 1, title: 'Нова', status: 'active', viewer_role: 'gm', owner: { id: 5, username: 'Я' }, public_campaign: { id: 2, slug: 'mayak', title: 'Маяк' }, updated_at: '2099-01-01T00:00:00Z', archived_at: null, my_characters: [] }], total: 1 }, refetch: vi.fn() }
  },
  useTableSchedule: (options) => { state.schedule.push(options); return { data: [], isLoading: false, refetch: state.retry, ...state.scheduleResult } },
}))
vi.mock('@/features/campaigns/components/CampaignFormDrawer.jsx', () => ({ default: () => <div>Форма кампании</div> }))

const lastParams = () => state.params.at(-1)
async function applyFilter(user, option) {
  await user.click(screen.getByRole('button', { name: 'Фильтры' }))
  await user.click(screen.getByRole('button', { name: option }))
  await user.click(screen.getByRole('button', { name: 'Применить' }))
}

describe('game tables (GM workspace)', () => {
  beforeEach(() => { state.params = []; state.schedule = []; state.auth = { isFounder: false }; state.scheduleResult = {}; state.retry.mockClear() })

  it('lists the tables the GM runs', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><GmCampaignsPage /></MemoryRouter>)
    expect(lastParams()).toMatchObject({ role: 'gm' })
    expect(screen.getByRole('link', { name: /Нова/ })).toHaveAttribute('href', '/campaigns/1')
    expect(screen.getByRole('button', { name: /Создать стол/ })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Фильтры' }))
    expect(screen.queryByRole('button', { name: 'Все кампании платформы' })).not.toBeInTheDocument()
  })

  it('searches by title and shows archived tables through the filters', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><GmCampaignsPage /></MemoryRouter>)
    await user.type(screen.getByRole('searchbox', { name: 'Поиск игровых столов' }), 'нов')
    await user.click(screen.getByRole('button', { name: 'Найти' }))
    expect(lastParams()).toMatchObject({ role: 'gm', q: 'нов' })
    await applyFilter(user, 'Вместе с архивом')
    expect(lastParams()).toMatchObject({ include_archived: true })
    await user.click(screen.getByRole('button', { name: 'Убрать фильтр Вместе с архивом' }))
    expect(lastParams().include_archived).toBeUndefined()
  })

  it('never sends role together with the founder view of all campaigns', async () => {
    state.auth = { isFounder: true }
    const user = userEvent.setup()
    render(<MemoryRouter><GmCampaignsPage /></MemoryRouter>)
    await applyFilter(user, 'Все кампании платформы')
    expect(lastParams()).toMatchObject({ all_campaigns: true })
    expect(lastParams().role).toBeUndefined()
    expect(state.schedule.at(-1)).toEqual({ enabled: false })
    expect(screen.queryByText('Дата следующей сессии не назначена')).not.toBeInTheDocument()
  })

  it('shows the nearest planned session belonging to each table', () => {
    state.scheduleResult = { data: [
      { id: 10, campaign: { id: 2 }, title: 'Чужая', status: 'planned', scheduled_at: '2099-01-01T00:00:00Z' },
      { id: 11, campaign: { id: 1 }, title: 'Отменена', status: 'cancelled', scheduled_at: '2099-01-02T00:00:00Z' },
      { id: 12, campaign: { id: 1 }, title: 'Наша', status: 'planned', scheduled_at: '2099-01-03T00:00:00Z' },
    ] }
    render(<MemoryRouter><GmCampaignsPage /></MemoryRouter>)
    expect(screen.getByText(/Следующая сессия/)).toHaveTextContent(formatDateTime('2099-01-03T00:00:00Z'))
    expect(screen.getByText(/Ведёт @Я/)).toBeVisible()
  })

  it('keeps table links available when the schedule fails and offers a retry', async () => {
    state.scheduleResult = { error: new Error('offline') }
    const user = userEvent.setup()
    render(<MemoryRouter><GmCampaignsPage /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /Нова/ })).toBeVisible()
    expect(screen.getByText('Расписание недоступно')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /Повторить/ }))
    expect(state.retry).toHaveBeenCalledOnce()
  })
})
