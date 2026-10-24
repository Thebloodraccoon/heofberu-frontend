import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PublicCharacterPage from '@/features/campaigns/pages/PublicCharacterPage.jsx'

const state = vi.hoisted(() => ({ card: null, error: null }))
vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => ({ user: { id: 1, username: 'viewer' } }) }))
vi.mock('@/features/campaigns/queries.js', () => ({ useCharacterCard: () => ({ data: state.card, error: state.error, isLoading: false, refetch: vi.fn() }) }))
vi.mock('@/features/catalog/queries.js', () => ({
  useClassDetail: (id) => ({ data: id ? { id, name: 'варвар', subclasses: [{ id: 4, name: 'путь берсерка' }] } : undefined }),
  useRaceDetail: (id) => ({ data: id ? { id, name: 'гориус', subraces: [] } : undefined }),
  useBackgroundDetail: (id) => ({ data: id ? { id, name: 'отшельник' } : undefined }),
  useSkills: () => ({ data: [{ id: 1, name: 'athletics', ability: 'STR' }, { id: 2, name: 'perception', ability: 'WIS' }, { id: 3, name: 'stealth', ability: 'DEX' }] }),
}))

const CARD = {
  id: 3, name: 'Дара из Вереска', level: 1, class_id: 7, subclass_id: 4, race_id: 2, subrace_id: null, background_id: 5,
  owner_username: 'demo_player_dara', public_visibility: 'full',
  personality_traits: 'Смеётся над грозой.', ideals: 'Свобода.', bonds: null, flaws: 'Не умеет ждать.', backstory: 'Выросла в вересковых пустошах.',
  base_ability_scores: { strength: 8, dexterity: 13, constitution: 14, intelligence: 15, wisdom: 12, charisma: 12 },
  ability_scores: { strength: 8, dexterity: 14, constitution: 14, intelligence: 15, wisdom: 12, charisma: 12 },
  skill_proficiencies: [{ skill_id: 2, is_expertise: false }, { skill_id: 3, is_expertise: true }],
  saving_throw_proficiencies: ['STR', 'CON'],
}

function setup() {
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/characters/3/public']}><Routes><Route path="/characters/:id/public" element={<PublicCharacterPage />} /></Routes></MemoryRouter></QueryClientProvider>)
}

describe('public character sheet', () => {
  beforeEach(() => { state.card = CARD; state.error = null })

  it('shows a read-only sheet with names from the catalog, scores, proficiencies and personality', () => {
    setup()
    expect(screen.getByRole('heading', { name: 'Дара из Вереска' })).toBeVisible()
    expect(screen.getByText('Варвар')).toBeVisible()
    expect(screen.getByText('Путь берсерка')).toBeVisible()
    expect(screen.getByText('Гориус')).toBeVisible()
    expect(screen.getByText('Отшельник')).toBeVisible()
    expect(screen.getByText('Игрок: @demo_player_dara')).toBeVisible()
    expect(screen.getByRole('group', { name: 'Ловкость: 14, модификатор +2' })).toBeVisible()
    const table = screen.getByRole('table')
    expect(within(table).getByRole('row', { name: 'База 8 13 14 15 12 12' })).toBeVisible()
    expect(within(table).getByRole('row', { name: 'Бонусы — +1 — — — —' })).toBeVisible()
    expect(within(table).getByRole('row', { name: 'Итог 8 14 14 15 12 12' })).toBeVisible()
    // Спасброски: владение даёт +2 к модификатору.
    expect(screen.getByRole('group', { name: 'Сила: спасбросок +1, владение' })).toBeVisible()
    expect(screen.getByRole('group', { name: 'Мудрость: спасбросок +1' })).toBeVisible()
    // Навыки: владение и экспертиза.
    expect(screen.getByRole('group', { name: /Восприятие: \+3, Владение/ })).toBeVisible()
    expect(screen.getByRole('group', { name: /Скрытность: \+6, Экспертиза/ })).toBeVisible()
    expect(screen.getByText('Смеётся над грозой.')).toBeVisible()
    expect(screen.getByText('Выросла в вересковых пустошах.')).toBeVisible()
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Назад'])
    expect(screen.queryByText(/Снаряжение|Доспехи/)).not.toBeInTheDocument()
  })

  it('says the owner hides the character when the card is not public', () => {
    state.card = null
    state.error = Object.assign(new Error('Not found'), { status: 404 })
    setup()
    expect(screen.getByText('Владелец не показывает этого персонажа публично.')).toBeVisible()
  })
})
