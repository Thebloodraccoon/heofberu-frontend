import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuickStatsPanel from '@/features/characters/components/sheet/QuickStatsPanel.jsx'

describe('QuickStatsPanel', () => {
  it('keeps editing and rolling separate from informational values', async () => {
    const user = userEvent.setup()
    const onOpenHp = vi.fn()
    const onOpenAc = vi.fn()
    const onOpenInspiration = vi.fn()
    const onRollInitiative = vi.fn()
    const props = { character: { current_hp: 5, max_hp: 40, temp_hp: 0, speed: 30, armor_class: 14, shield: 2 }, pb: 3, inspiration: 1, initiativeBonus: 2, initiativeLast: 0, onOpenHp, onOpenAc, onOpenInspiration, onRollInitiative }
    const { rerender } = render(<QuickStatsPanel {...props} />)
    expect(screen.queryByText(/Временные:/)).not.toBeInTheDocument()
    expect(screen.queryByText('Бросок: 0')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Хиты/ })).toHaveClass('is-low')
    expect(screen.queryByRole('button', { name: /Скорость|Владение/ })).not.toBeInTheDocument()
    for (const [name, callback] of [[/^Хиты/, onOpenHp], [/^Класс доспеха/, onOpenAc], [/^Вдохновения/, onOpenInspiration], [/^Инициатива/, onRollInitiative]]) {
      await user.click(screen.getByRole('button', { name }))
      expect(callback).toHaveBeenCalledOnce()
    }
    rerender(<QuickStatsPanel {...props} character={{ ...props.character, temp_hp: 8 }} />)
    expect(screen.getByLabelText('Временные хиты: 8')).toBeVisible()
    expect(screen.getByLabelText('Временные хиты: 8').parentElement).toHaveTextContent('5/ 40+8 врем.')
  })

  it('keeps hits and proficiency separate from the secondary indicators', () => {
    const props = { character: { current_hp: 32, max_hp: 42, temp_hp: 5, armor_class: 14, shield: 2, speed: 30 }, pb: 3, inspiration: 1, initiativeBonus: 3 }
    const { rerender } = render(<QuickStatsPanel {...props} fields={['hp', 'pb']} />)
    expect(screen.getByText('Владение')).toBeVisible()
    expect(screen.queryByText('КД')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Временные хиты: 5')).toBeVisible()
    rerender(<QuickStatsPanel {...props} fields={['ac', 'initiative', 'speed', 'inspiration']} onOpenAc={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Класс доспеха: 16' })).toBeVisible()
    expect(screen.getByText('Инициатива')).toBeVisible()
    expect(screen.queryByText('Хиты')).not.toBeInTheDocument()
    expect(screen.queryByText('Владение')).not.toBeInTheDocument()
  })
})
