import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AsiChoiceModal from '@/features/characters/components/wizard/AsiChoiceModal.jsx'
import { useAllFeats, useFeatDetail } from '@/features/catalog/queries.js'

vi.mock('@/features/catalog/queries.js', () => ({
  useAllFeats: vi.fn(),
  useFeatDetail: vi.fn(),
}))

const statRow = (label) => screen.getByText(label).closest('div')

const feats = [
  { id: 1, name: 'Проворный', min_level: null },
  { id: 2, name: 'Могучий', prerequisite_ability: 'STR', prerequisite_minimum_score: 13, min_level: null },
  { id: 3, name: 'Недостижимый', prerequisite_ability: 'STR', prerequisite_minimum_score: 19, min_level: null },
  { id: 4, name: 'Сильный удар', min_level: null },
  { id: 5, name: 'Поздний', min_level: 12 },
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
      expect(screen.getByRole('button', { name: /проворный/i })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /могучий/i })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /недостижимый/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /поздний/i })).toBeDisabled()
      expect(screen.getByText('С уровня 12')).toBeInTheDocument()
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
      await userEvent.click(screen.getByRole('button', { name: /могучий/i }))
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
      await userEvent.click(screen.getByRole('button', { name: /сильный удар/i }))
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
