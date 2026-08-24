import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/features/catalog/queries.js', () => ({
  useRaces: () => ({ data: [{ id: 1, name: 'Эльф' }], isLoading: false }),
  useClasses: () => ({ data: [{ id: 1, name: 'Воин', hit_dice: 'D8' }], isLoading: false }),
  useBackgrounds: () => ({ data: [{ id: 1, name: 'Благородный' }], isLoading: false }),
  useSkills: () => ({ data: [], isLoading: false }),
  useRaceDetail: () => ({ data: null }),
  useRaceFeatures: () => ({ data: [] }),
  useSubraceDetail: () => ({ data: null }),
  useClassDetail: () => ({ data: { id: 1, name: 'Воин', hit_dice: 'D8', skill_choice_count: 0, saving_throws: [], available_skills: [] } }),
  useSubclassDetail: () => ({ data: null }),
  useBackgroundDetail: () => ({ data: null }),
  useFeatsFull: () => ({ data: [], refetch: vi.fn(), isFetching: false }),
}))

vi.mock('react-router-dom', async (orig) => {
  const mod = await orig()
  return { ...mod, useNavigate: () => vi.fn() }
})

vi.mock('@/features/characters/api.js', () => ({
  charactersApi: {
    create: vi.fn(),
    gmPanel: { feats: { add: vi.fn() } },
    progression: { levelUp: vi.fn() },
  },
}))

vi.mock('@/features/auth/useAuth.js', () => ({
  useAuth: () => ({ user: { username: 'gm' }, isGM: true, authenticated: true }),
}))

import CharacterCreatePage from '@/features/characters/pages/CharacterCreatePage.jsx'

beforeEach(() => {
  window.scrollTo = vi.fn()
})

const goToAbilities = async () => {
  render(
    <MemoryRouter>
      <CharacterCreatePage />
    </MemoryRouter>,
  )
  await userEvent.type(screen.getByPlaceholderText(/аравель/i), 'Тест')
  await userEvent.click(screen.getByRole('button', { name: /далее/i }))
  await userEvent.click(screen.getByRole('button', { name: /эльф/i }))
  await userEvent.click(screen.getByRole('button', { name: /далее/i }))
  await userEvent.click(screen.getByRole('button', { name: /благородный/i }))
  await userEvent.click(screen.getByRole('button', { name: /далее/i }))
  await userEvent.click(screen.getByRole('button', { name: /воин/i }))
  await userEvent.click(screen.getByRole('button', { name: /далее/i }))
}

describe('CharacterCreatePage random crash repro', () => {
  it('stays rendered after picking a dice method', { timeout: 20000 }, async () => {
    await goToAbilities()
    expect(screen.getAllByText('Характеристики').length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: /бросок 4d6/i }))
    expect(screen.getByRole('button', { name: /перебросить кости/i })).toBeInTheDocument()
  })

  it('stays rendered after rerolling dice', { timeout: 20000 }, async () => {
    await goToAbilities()
    await userEvent.click(screen.getByRole('button', { name: /бросок 4d6/i }))
    await userEvent.click(screen.getByRole('button', { name: /перебросить кости/i }))
    expect(screen.getByRole('button', { name: /перебросить кости/i })).toBeInTheDocument()
  })
})
