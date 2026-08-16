import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AsiChoiceModal from '@/features/characters/components/wizard/AsiChoiceModal.jsx'

const statRow = (label) => screen.getByText(label).closest('div')

const feats = [
  { id: 1, name: 'Проворный', description: '', ability_score_increases: [] },
  {
    id: 2,
    name: 'Могучий',
    prerequisite_ability: 'STR',
    prerequisite_minimum_score: 13,
    description: '',
    ability_score_increases: [],
  },
  {
    id: 3,
    name: 'Недостижимый',
    prerequisite_ability: 'STR',
    prerequisite_minimum_score: 19,
    description: '',
    ability_score_increases: [],
  },
  {
    id: 4,
    name: 'Сильный удар',
    description: '',
    ability_score_increases: [
      { id: 10, ability: 'CON', amount: 1 },
      { id: 11, ability: 'CON', amount: 2 },
    ],
  },
]

const renderModal = (props = {}) =>
  render(
    <AsiChoiceModal
      level={4}
      abilityTotals={{ STR: 15, DEX: 10, CON: 14, INT: 10, WIS: 10, CHA: 10 }}
      feats={feats}
      featsLoading={false}
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      {...props}
    />,
  )

describe('AsiChoiceModal', () => {
  it('renders the header with the level', () => {
    renderModal({ level: 8 })
    expect(screen.getByText(/Уровень 8:/)).toBeInTheDocument()
  })

  it('keeps confirm disabled until at least one point is allocated', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'Применить' })).toBeDisabled()
  })

  it('allows +1 to two different stats', async () => {
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
    renderModal()
    const row = statRow('Сила')
    await userEvent.click(within(row).getByText('+'))
    await userEvent.click(within(row).getByText('+'))
    expect(within(row).getByText('2')).toBeInTheDocument()
    expect(within(row).getByText('+')).toBeDisabled()
  })

  it('caps a stat at the ability cap or 20', async () => {
    renderModal({ abilityTotals: { STR: 19, DEX: 10, CON: 14, INT: 10, WIS: 10, CHA: 10 } })
    const row = statRow('Сила')
    await userEvent.click(within(row).getByText('+'))
    expect(within(row).getByText('1')).toBeInTheDocument()
    expect(within(row).getByText('+')).toBeDisabled()
  })

  it('decrements an allocation and filters zero amounts from the payload', async () => {
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
    it('shows loading and empty states', async () => {
      const { rerender } = renderModal({ featsLoading: true, feats: [] })
      await userEvent.click(screen.getByRole('button', { name: 'Черта' }))
      expect(screen.getByText('Загружаем черты…')).toBeInTheDocument()
      rerender(
        <AsiChoiceModal
          level={4}
          abilityTotals={{}}
          feats={[]}
          featsLoading={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      )
      expect(screen.getByText('Черты не найдены.')).toBeInTheDocument()
    })

    it('disables feats whose prerequisites are not met', async () => {
      renderModal()
      await userEvent.click(screen.getByRole('button', { name: 'Черта' }))
      const button = screen.getByRole('button', { name: /могучий/i })
      expect(button).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /недостижимый/i })).toBeDisabled()
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
