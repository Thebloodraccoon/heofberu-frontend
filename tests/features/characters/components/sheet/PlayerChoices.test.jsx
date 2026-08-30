import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import PlayerChoices from '@/features/characters/components/sheet/PlayerChoices.jsx'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import { useCharacterAsiChoices } from '@/features/characters/queries.js'
import { useFeats } from '@/features/catalog/queries.js'

vi.mock('@/features/characters/queries.js', () => ({
  useCharacterAsiChoices: vi.fn(() => ({ data: [], isLoading: false })),
}))

vi.mock('@/features/catalog/queries.js', () => ({
  useFeats: vi.fn(() => ({ data: [] })),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PlayerChoices', () => {
  it('lists player level choices as before (one row per level)', () => {
    useCharacterAsiChoices.mockReturnValue({
      data: [
        { id: 1, class_level: 4, choice_type: 'ASI', increases: [{ ability: 'STR', amount: 2 }] },
        { id: 2, class_level: 8, choice_type: 'ASI', increases: [{ ability: 'WIS', amount: 1 }] },
      ],
      isLoading: false,
    })
    renderWithProviders(<PlayerChoices characterId={7} />)

    expect(screen.getByText('Ур. 4')).toBeInTheDocument()
    expect(screen.getByText('Сила +2')).toBeInTheDocument()
    expect(screen.getByText('Ур. 8')).toBeInTheDocument()
    expect(screen.getByText('Мудрость +1')).toBeInTheDocument()
  })

  it('merges several increases of one level into a single row', () => {
    useCharacterAsiChoices.mockReturnValue({
      data: [
        {
          id: 1,
          class_level: 15,
          choice_type: 'ASI',
          increases: [
            { ability: 'STR', amount: 1 },
            { ability: 'DEX', amount: 1 },
          ],
        },
      ],
      isLoading: false,
    })
    renderWithProviders(<PlayerChoices characterId={7} />)

    const row = screen.getByText('Ур. 15').closest('li')
    expect(screen.getAllByText('Ур. 15').length).toBe(1)
    expect(row).toHaveTextContent('Сила +1, Ловкость +1')
  })

  it('shows feat choices with their catalog names', () => {
    useCharacterAsiChoices.mockReturnValue({
      data: [
        { id: 1, class_level: 4, choice_type: 'FEAT', feat_id: 3, increases: [] },
      ],
      isLoading: false,
    })
    useFeats.mockReturnValue({ data: [{ id: 3, name: 'Проворный' }] })
    renderWithProviders(<PlayerChoices characterId={7} />)

    expect(screen.getByText('Ур. 4')).toBeInTheDocument()
    expect(screen.getByText('Черта: Проворный')).toBeInTheDocument()
  })

  it('shows a placeholder when there are no level choices yet', () => {
    useCharacterAsiChoices.mockReturnValue({ data: [], isLoading: false })
    renderWithProviders(<PlayerChoices characterId={7} />)

    expect(screen.getByText('Выборов игрока на уровнях пока нет.')).toBeInTheDocument()
  })
})