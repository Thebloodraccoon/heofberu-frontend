import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import CharactersPage from '@/features/characters/pages/CharactersPage.jsx'

const state = vi.hoisted(() => ({ campaignParams: [] }))
vi.mock('@/features/characters/queries.js', () => ({
  useMyCharacters: () => ({ data: [
    { id: 42, name: 'Гурн', level: 3, class_id: 1, current_hp: 20, max_hp: 24, temp_hp: 0 },
    { id: 43, name: 'Илса', level: 5, class_id: 1, current_hp: 30, max_hp: 30, temp_hp: 0 },
  ], isLoading: false, refetch: vi.fn() }),
  useDeleteCharacter: () => ({ mutate: vi.fn(), isPending: false, reset: vi.fn() }),
}))
vi.mock('@/features/catalog/queries.js', () => ({
  useClasses: () => ({ data: [{ id: 1, name: 'воин', subclasses: [] }] }),
  useRaces: () => ({ data: [] }),
  useBackgrounds: () => ({ data: [] }),
}))
vi.mock('@/features/campaigns/queries.js', () => ({
  useCampaignsPage: (params) => {
    state.campaignParams.push(params)
    return { data: { items: [
      { id: 1, title: 'Нова', owner: { id: 9, username: 'Саруман' }, my_characters: [{ participation_id: 11, character_id: 42, name: 'Гурн', status: 'active' }] },
      { id: 2, title: 'Перевал', owner: { id: 9, username: 'Саруман' }, my_characters: [{ participation_id: 12, character_id: 43, name: 'Илса', status: 'retired' }] },
    ], total: 2 } }
  },
  useSchedule: () => ({ data: { items: [
    { id: 7, number: 4, title: 'Маяк', status: 'planned', scheduled_at: new Date(2099, 0, 10, 19, 0).toISOString(), campaign: { id: 1, title: 'Нова' }, viewer_role: 'player' },
  ], total: 1 } }),
}))

function setup() {
  render(<MemoryRouter><CharactersPage /></MemoryRouter>)
  return userEvent.setup()
}
const characterCard = (name) => within(screen.getByRole('link', { name: new RegExp(`^${name}`) }).closest('article'))

describe('my characters and games', () => {
  beforeEach(() => { state.campaignParams = [] })

  it('shows each character with its table and next session, and links to the schedule', () => {
    setup()
    expect(state.campaignParams.at(-1)).toMatchObject({ role: 'player' })
    const gurn = characterCard('Гурн')
    expect(gurn.getByRole('link', { name: '«Нова»' })).toHaveAttribute('href', '/campaigns/1')
    expect(gurn.getByText(/Следующая сессия/)).toBeVisible()
    expect(characterCard('Илса').getByText(/Свободен/)).toBeVisible()
    expect(screen.queryByRole('region', { name: 'Ближайшие сессии' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Расписание/ })).toHaveAttribute('href', '/schedule')
  })

  it('filters by participation and reveals past tables on request', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Фильтры' }))
    await user.click(screen.getByRole('button', { name: 'Свободные' }))
    await user.click(screen.getByRole('button', { name: 'Показывать' }))
    await user.click(screen.getByRole('button', { name: 'Применить' }))
    const list = within(screen.getByRole('region', { name: 'Мои персонажи' }))
    expect(list.queryByRole('link', { name: /^Гурн/ })).not.toBeInTheDocument()
    expect(list.getByText(/Раньше:/)).toHaveTextContent('«Перевал» (ушёл на покой)')
    expect(state.campaignParams.at(-1)).toMatchObject({ include_archived: true })
  })
})
