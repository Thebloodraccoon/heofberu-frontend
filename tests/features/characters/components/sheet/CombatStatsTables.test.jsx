import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import CombatStatsSection from '@/features/characters/components/sheet/CombatStatsTables.jsx'
import { renderWithProviders } from '@tests/helpers/render.jsx'

const combat = {
  armor_class: {
    manual: 10,
    shield_manual: 0,
    computed: 19,
    breakdown: [
      { source: 'unarmored', label: 'Без доспеха', value: 10 },
      { source: 'ability', label: 'Ловкость', value: 1 },
      { source: 'bonus', label: 'Выносливость камня', value: 8 },
    ],
    inactive: [{ source: 'bonus', label: 'Выносливость камня', value: 10, reason: 'нужен надетый доспех', reason_code: 'condition_unmet' }],
  },
  speed: {
    manual: 30,
    computed: { walk: 100, fly: null, swim: null, climb: null, burrow: null },
    breakdown: [
      { source: 'base', label: 'Волот', value: 40, speed_type: 'WALK' },
      { source: 'bonus', label: 'Выносливость камня', value: 60, speed_type: 'WALK' },
    ],
    inactive: [
      { source: 'bonus', label: 'Выносливость камня', value: 10, speed_type: 'FLY', reason: 'нет скорости полёта', reason_code: 'no_speed' },
    ],
  },
}

describe('CombatStatsSection', () => {
  it('tabulates the AC lines, the total and what does not apply with its reason', () => {
    renderWithProviders(<CombatStatsSection combat={combat} />)

    const ac = within(screen.getByRole('table', { name: 'Класс доспеха' }))
    expect(ac.getByText('Без доспеха')).toBeInTheDocument()
    expect(ac.getByRole('rowheader', { name: 'Итого' }).nextSibling).toHaveTextContent('19')
    expect(ac.getByText('Сейчас не применяется')).toBeInTheDocument()
    expect(ac.getByText('нужен надетый доспех')).toBeInTheDocument()
  })

  it('puts every speed type into one table, including a fly bonus the character cannot use yet', () => {
    renderWithProviders(<CombatStatsSection combat={combat} />)

    const table = within(screen.getByRole('table', { name: 'Скорость' }))
    const walk = within(table.getByRole('rowgroup', { name: 'Ходьба' }))
    expect(walk.getByRole('rowheader', { name: 'Ходьба' }).nextSibling).toHaveTextContent('100 фт')
    expect(walk.getByText('Волот')).toBeInTheDocument()
    expect(walk.getByText('+60 фт')).toBeInTheDocument()

    const fly = within(table.getByRole('rowgroup', { name: 'Полёт' }))
    expect(fly.getByRole('rowheader', { name: 'Полёт' }).nextSibling).toHaveTextContent('нет')
    // бонус к отсутствующей скорости — обычной строкой: «нет» уже в итоге вида
    expect(fly.getByText('Выносливость камня').closest('tr')).not.toHaveClass('combat-table__inactive')
    expect(fly.getByText('+10 фт')).toBeInTheDocument()
    expect(fly.queryByText('нет скорости полёта')).not.toBeInTheDocument()
  })

  it('renders nothing without combat stats', () => {
    const { container } = renderWithProviders(<CombatStatsSection combat={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })
})
