import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AsiChoiceModal from '@/features/characters/components/wizard/AsiChoiceModal.jsx'
import { useAllFeats, useFeatDetail } from '@/features/catalog/queries.js'

vi.mock('@/features/catalog/queries.js', () => ({
  useAllFeats: vi.fn(),
  useFeatDetail: vi.fn(),
  useSkills: vi.fn(() => ({ data: [] })),
  useSpells: vi.fn(() => ({ data: [] })),
}))

const statRow = (label) => screen.getByText(label).closest('div')

const feats = [
  { id: 1, name: 'Проворный', min_level: null },
  { id: 2, name: 'Могучий', prerequisite_ability: 'STR', prerequisite_minimum_score: 13, min_level: null },
  { id: 3, name: 'Недостижимый', prerequisite_ability: 'STR', prerequisite_minimum_score: 19, min_level: null },
  { id: 4, name: 'Сильный удар', min_level: null },
  { id: 5, name: 'Поздний', min_level: 12 },
  { id: 6, name: 'Агент порядка', min_level: null, has_choices: true, has_static_effects: false },
]

const featDetails = {
  1: { id: 1, name: 'Проворный', description: 'Быстрее всех.', ability_score_increases: [] },
  2: {
    id: 2,
    name: 'Могучий',
    description: 'Сила великана.',
    prerequisite_description: 'Требуется 13+ Силы.',
    ability_score_increases: [],
  },
  4: {
    id: 4,
    name: 'Сильный удар',
    description: '',
    ability_score_increases: [
      { id: 10, ability: 'CON', amount: 1 },
      { id: 11, ability: 'CON', amount: 2 },
    ],
  },
  // Реальная форма бэка: варианты увеличения характеристик приходят не
  // отдельным полем, а группой choice_groups с choice_type ABILITY_SCORE.
  // У этой черты есть ещё и группа SPELL — бэк требует ответ на неё в том же
  // запросе level-up/rebuild (422 GrantChoiceRequiredException иначе).
  6: {
    id: 6,
    name: 'Агент порядка',
    description: 'Вы можете направлять космические силы порядка.',
    choice_groups: [
      {
        id: 1,
        pick_count: 1,
        choice_type: 'ABILITY_SCORE',
        options: [
          { id: 101, ability_effects: [{ ability: 'STR', amount: 1 }] },
          { id: 102, ability_effects: [{ ability: 'DEX', amount: 1 }] },
        ],
      },
      {
        id: 114,
        pick_count: 1,
        choice_type: 'SPELL',
        options: [
          { id: 310, spell_effects: [{ spell_id: 205 }] },
          { id: 311, spell_effects: [{ spell_id: 221 }] },
        ],
      },
    ],
  },
}

const renderModal = (props = {}) =>
  render(
    <AsiChoiceModal
      level={4}
      abilityTotals={{ STR: 15, DEX: 10, CON: 14, INT: 10, WIS: 10, CHA: 10 }}
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      {...props}
    />,
  )

beforeEach(() => {
  useFeatDetail.mockReset()
  useFeatDetail.mockImplementation((id) => ({ data: featDetails[id] ?? null, isFetching: false }))
})

describe('AsiChoiceModal', () => {
  it('renders the fork header with the level', () => {
    useAllFeats.mockReturnValue({ data: [], isFetching: false })
    renderModal({ level: 8 })
    expect(screen.getByText(/Уровень 8: вы на развилке/)).toBeInTheDocument()
  })

  it('keeps confirm disabled until at least one point is allocated', () => {
    useAllFeats.mockReturnValue({ data: [], isFetching: false })
    renderModal()
    expect(screen.getByRole('button', { name: 'Применить' })).toBeDisabled()
  })

  it('allows +1 to two different stats', async () => {
    useAllFeats.mockReturnValue({ data: [], isFetching: false })
    const onConfirm = vi.fn()
    renderModal({ onConfirm })
    await userEvent.click(within(statRow('Сила')).getByText('+'))
    await userEvent.click(within(statRow('Ловкость')).getByText('+'))
    expect(within(statRow('Сила')).getByText('1')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Применить' }))
    expect(onConfirm).toHaveBeenCalledWith({
      type: 'ASI',
      increases: [
        { ability: 'STR', amount: 1 },
        { ability: 'DEX', amount: 1 },
      ],
    })
  })

  it('allows at most +2 per stat', async () => {
    useAllFeats.mockReturnValue({ data: [], isFetching: false })
    renderModal()
    const row = statRow('Сила')
    await userEvent.click(within(row).getByText('+'))
    await userEvent.click(within(row).getByText('+'))
    expect(within(row).getByText('2')).toBeInTheDocument()
    expect(within(row).getByText('+')).toBeDisabled()
  })

  it('caps a stat at the ability cap or 20', async () => {
    useAllFeats.mockReturnValue({ data: [], isFetching: false })
    renderModal({ abilityTotals: { STR: 19, DEX: 10, CON: 14, INT: 10, WIS: 10, CHA: 10 } })
    const row = statRow('Сила')
    await userEvent.click(within(row).getByText('+'))
    expect(within(row).getByText('1')).toBeInTheDocument()
    expect(within(row).getByText('+')).toBeDisabled()
  })

  it('decrements an allocation and filters zero amounts from the payload', async () => {
    useAllFeats.mockReturnValue({ data: [], isFetching: false })
    const onConfirm = vi.fn()
    renderModal({ onConfirm })
    const row = statRow('Сила')
    await userEvent.click(within(row).getByText('+'))
    await userEvent.click(within(statRow('Ловкость')).getByText('+'))
    await userEvent.click(within(row).getByText('−'))
    await userEvent.click(screen.getByRole('button', { name: 'Применить' }))
    expect(onConfirm).toHaveBeenCalledWith({
      type: 'ASI',
      increases: [{ ability: 'DEX', amount: 1 }],
    })
  })

  describe('feat mode', () => {
    beforeEach(() => {
      useAllFeats.mockReturnValue({ data: feats, isFetching: false })
    })

    it('shows a search input and empty state', async () => {
      useAllFeats.mockReturnValue({ data: [], isFetching: false })
      renderModal()
      await userEvent.click(screen.getByRole('button', { name: 'Черта' }))
      expect(screen.getByPlaceholderText(/поиск черты/i)).toBeInTheDocument()
      expect(useAllFeats).toHaveBeenLastCalledWith('')
      expect(screen.getByText('Черты не найдены.')).toBeInTheDocument()
    })

    it('disables feats with unmet prerequisites or min level above the current one', async () => {
      renderModal()
      await userEvent.click(screen.getByRole('button', { name: 'Черта' }))
      expect(screen.getByRole('button', { name: /^проворный$/i })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /^могучий$/i })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /^недостижимый$/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /^поздний$/i })).toBeDisabled()
      expect(screen.getByText('с ур. 12')).toBeInTheDocument()
    })

    it('shows the min level tag even for feats already meeting it', async () => {
      renderModal({ level: 12 })
      await userEvent.click(screen.getByRole('button', { name: 'Черта' }))
      expect(screen.getByRole('button', { name: /^поздний$/i })).not.toBeDisabled()
      expect(screen.getByText('с ур. 12')).toBeInTheDocument()
    })

    it('shows choice/effect labels for feats coming from has_choices/has_static_effects', async () => {
      renderModal()
      await userEvent.click(screen.getByRole('button', { name: 'Черта' }))
      expect(screen.getByText('Выбор')).toBeInTheDocument()
    })

    it('derives ability increase options from the real choice_groups shape', async () => {
      const onConfirm = vi.fn()
      renderModal({ onConfirm })
      await userEvent.click(screen.getByRole('button', { name: 'Черта' }))
      await userEvent.click(screen.getByRole('button', { name: /^агент порядка$/i }))
      await userEvent.click(screen.getByLabelText('+1 к Ловкость'))
      // Черта также открывает группу SPELL — без ответа на неё бэк отклоняет
      // level-up/rebuild с GrantChoiceRequiredException, поэтому «Применить»
      // остаётся заблокированной, пока она не отвечена.
      expect(screen.getByRole('button', { name: 'Применить' })).toBeDisabled()
      await userEvent.click(screen.getByText('заклинание #221'))
      await userEvent.click(screen.getByRole('button', { name: 'Применить' }))
      expect(onConfirm).toHaveBeenCalledWith({
        type: 'FEAT',
        feat_id: 6,
        ability_score_increase_id: 102,
        answers: [{ choice_group_id: 114, choice_option_id: 311 }],
        choice_answers: [{ choice_group_id: 114, choice_option_id: 311 }],
      })
    })

    it('lazily loads feat details via the view button', async () => {
      renderModal()
      await userEvent.click(screen.getByRole('button', { name: 'Черта' }))
      expect(screen.queryByText('Быстрее всех.')).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Посмотреть: Проворный' }))
      expect(useFeatDetail).toHaveBeenLastCalledWith(1)
      expect(await screen.findByText('Быстрее всех.')).toBeInTheDocument()
    })

    it('confirms a feat without ability score increases', async () => {
      const onConfirm = vi.fn()
      renderModal({ onConfirm })
      await userEvent.click(screen.getByRole('button', { name: 'Черта' }))
      await userEvent.click(screen.getByRole('button', { name: /^могучий$/i }))
      await userEvent.click(screen.getByRole('button', { name: 'Применить' }))
      expect(onConfirm).toHaveBeenCalledWith({
        type: 'FEAT',
        feat_id: 2,
        ability_score_increase_id: null,
      })
    })

    it('sends the selected ability score increase id', async () => {
      const onConfirm = vi.fn()
      renderModal({ onConfirm })
      await userEvent.click(screen.getByRole('button', { name: 'Черта' }))
      await userEvent.click(screen.getByRole('button', { name: /^сильный удар$/i }))
      await userEvent.click(screen.getByLabelText('+1 к Телосложение'))
      await userEvent.click(screen.getByRole('button', { name: 'Применить' }))
      expect(onConfirm).toHaveBeenCalledWith({
        type: 'FEAT',
        feat_id: 4,
        ability_score_increase_id: 10,
      })
    })
  })
})
