import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import MyGamesPage from '@/features/campaigns/pages/MyGamesPage.jsx'

const state = vi.hoisted(() => ({ params: [] }))
vi.mock('@/features/campaigns/queries.js', () => ({
  useCampaignsPage: (params) => {
    state.params.push(params)
    return { data: { items: [
      { id: 1, title: 'Нова', status: 'active', owner: { id: 9, username: 'Саруман' }, public_campaign: { id: 3, slug: 'nova', title: 'Новая звезда' }, my_characters: [{ participation_id: 11, character_id: 42, name: 'Гурн', status: 'active' }], updated_at: new Date(2026, 0, 1).toISOString() },
    ], total: 1 }, isLoading: false, refetch: vi.fn() }
  },
}))

describe('my games', () => {
  it('lists the tables where the player plays, with their characters, and searches them', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><MyGamesPage /></MemoryRouter>)
    expect(state.params.at(-1)).toMatchObject({ role: 'player' })
    expect(screen.getByRole('link', { name: /Нова/ })).toHaveAttribute('href', '/campaigns/1')
    expect(screen.getByText('Ваши персонажи: Гурн')).toBeVisible()
    expect(screen.getByRole('link', { name: /Мои персонажи/ })).toHaveAttribute('href', '/characters')
    await user.type(screen.getByRole('searchbox'), 'Нов')
    await user.keyboard('{Enter}')
    expect(state.params.at(-1)).toMatchObject({ role: 'player', q: 'Нов' })
  })
})
