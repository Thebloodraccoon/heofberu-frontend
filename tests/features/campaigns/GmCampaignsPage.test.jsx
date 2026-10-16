import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import GmCampaignsPage from '@/features/campaigns/pages/GmCampaignsPage.jsx'

const state = vi.hoisted(() => ({ auth: { isFounder: false }, params: [], schedule: [] }))
vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => state.auth }))
vi.mock('@/features/campaigns/queries.js', () => ({
  useCampaignsPage: (params) => {
    state.params.push(params)
    return { data: { items: [{ id: 1, title: 'Нова', status: 'active', viewer_role: 'gm', owner: { id: 5, username: 'Я' }, public_campaign: { id: 2, slug: 'mayak', title: 'Маяк' }, updated_at: '2099-01-01T00:00:00Z', archived_at: null, my_characters: [] }], total: 1 }, refetch: vi.fn() }
  },
  useSchedule: (params) => { state.schedule.push(params); return { data: { items: [], total: 0 }, isLoading: false } },
}))
vi.mock('@/features/campaigns/components/CampaignFormDrawer.jsx', () => ({ default: () => <div>Форма кампании</div> }))

const lastParams = () => state.params.at(-1)
async function applyFilter(user, option) {
  await user.click(screen.getByRole('button', { name: 'Фильтры' }))
  await user.click(screen.getByRole('button', { name: option }))
  await user.click(screen.getByRole('button', { name: 'Применить' }))
}

describe('game tables (GM workspace)', () => {
  beforeEach(() => { state.params = []; state.schedule = []; state.auth = { isFounder: false } })

  it('lists the tables the GM runs', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><GmCampaignsPage /></MemoryRouter>)
    expect(lastParams()).toMatchObject({ role: 'gm' })
    expect(screen.getByRole('link', { name: /Нова/ })).toHaveAttribute('href', '/campaigns/1')
    expect(screen.getByRole('button', { name: /Создать кампанию/ })).toBeVisible()
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
  })
})
