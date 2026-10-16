import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SchedulePage from '@/features/campaigns/pages/SchedulePage.jsx'

const state = vi.hoisted(() => ({ params: [] }))
const at = (day, hour) => new Date(2099, 0, day, hour, 0).toISOString()
vi.mock('@/features/campaigns/queries.js', () => ({
  useSchedule: (params) => {
    state.params.push(params)
    return { data: { items: [
      { id: 1, number: 4, title: 'Маяк', status: 'planned', scheduled_at: at(10, 19), campaign: { id: 1, title: 'Нова' }, viewer_role: 'player' },
      { id: 2, number: 1, title: '', status: 'planned', scheduled_at: at(10, 21), campaign: { id: 2, title: 'Курган' }, viewer_role: 'player' },
      { id: 3, number: 5, title: 'Пещеры', status: 'planned', scheduled_at: at(12, 18), campaign: { id: 1, title: 'Нова' }, viewer_role: 'player' },
    ], total: 3 }, isLoading: false, refetch: vi.fn() }
  },
  useCampaignsPage: () => ({ data: { items: [{ id: 1, title: 'Нова', my_characters: [{ participation_id: 11, character_id: 42, name: 'Гурн', status: 'active' }] }], total: 1 } }),
}))

describe('player schedule page', () => {
  beforeEach(() => { state.params = [] })

  it('groups sessions by local day, names the playing character and links into the campaign', () => {
    render(<MemoryRouter><SchedulePage /></MemoryRouter>)
    const days = screen.getAllByRole('region')
    expect(days).toHaveLength(2)
    const first = within(days[0])
    expect(first.getAllByRole('link')).toHaveLength(2)
    expect(first.getByRole('link', { name: /Нова/ })).toHaveAttribute('href', '/campaigns/1?tab=sessions')
    expect(first.getByText(/играет Гурн/)).toBeVisible()
  })

  it('asks only for the player side and for cancelled sessions only when requested', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><SchedulePage /></MemoryRouter>)
    expect(state.params.at(-1)).toMatchObject({ role: 'player' })
    expect(state.params.at(-1).include_cancelled).toBeUndefined()
    await user.click(screen.getByRole('button', { name: 'Фильтры' }))
    await user.click(screen.getByRole('button', { name: 'Показывать' }))
    await user.click(screen.getByRole('button', { name: 'Применить' }))
    expect(state.params.at(-1)).toMatchObject({ include_cancelled: true, page: 1 })
    expect(screen.getByRole('button', { name: 'Убрать фильтр С отменёнными' })).toBeVisible()
  })
})
