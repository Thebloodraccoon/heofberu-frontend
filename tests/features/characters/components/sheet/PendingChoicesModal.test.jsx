import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import PendingChoicesModal from '@/features/characters/components/sheet/PendingChoicesModal.jsx'
import { charactersApi } from '@/features/characters/api.js'
import { useCharacterPendingChoices } from '@/features/characters/queries.js'

vi.mock('@/features/characters/api.js', () => ({
  charactersApi: { features: { choices: { answer: vi.fn() } } },
}))

vi.mock('@/features/characters/queries.js', () => ({
  useCharacterPendingChoices: vi.fn(),
}))

vi.mock('@/features/catalog/queries.js', () => ({
  useSkills: () => ({ data: [] }),
  useSpells: () => ({ data: [] }),
  useClasses: () => ({ data: [] }),
  useSpellsById: () => ({}),
  useItemNames: () => ({}),
  useSpellDetail: () => ({ data: null, isLoading: false }),
}))

const ALLOWED_SPELLS = [
  { id: 7, name: 'Огненный шар', level: 'LEVEL_3', school: 'EVOCATION', is_ritual: false },
  { id: 9, name: 'Молния', level: 'LEVEL_3', school: 'EVOCATION', is_ritual: false },
]

// Одна открытая группа «любое заклинание»: единственный вариант предвыбран,
// но заклинание ещё не названо — подтвердить нельзя.
const grant = {
  character_feature_id: 77,
  feature_name: 'Тайны магии',
  groups: [
    {
      id: 1,
      choice_type: 'SPELL',
      pick_count: 1,
      options: [{ id: 40, needs_spell: true, spell_effects: [{ spell_id: null }], allowed_spells: ALLOWED_SPELLS }],
    },
  ],
}

const renderModal = () =>
  renderWithProviders(<PendingChoicesModal character={{ id: 12 }} onClose={vi.fn()} presentation="modal" />)

beforeEach(() => {
  vi.clearAllMocks()
  charactersApi.features.choices.answer.mockResolvedValue({})
  useCharacterPendingChoices.mockReturnValue({ data: [grant], isLoading: false })
})

describe('PendingChoicesModal', () => {
  it('shows the current grant and waits until every group is complete', async () => {
    const user = userEvent.setup()
    renderModal()

    expect(screen.getByText('Тайны магии')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Подтвердить' })).toBeDisabled()

    await user.click(screen.getByText('Молния'))
    expect(screen.getByRole('button', { name: 'Подтвердить' })).toBeEnabled()
  })

  it('submits the open spell option with the spell the player named', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByText('Молния'))
    await user.click(screen.getByRole('button', { name: 'Подтвердить' }))

    expect(charactersApi.features.choices.answer).toHaveBeenCalledWith(12, 77, {
      answers: [{ choice_group_id: 1, choice_option_id: 40, spell_id: 9 }],
    })
  })
})
