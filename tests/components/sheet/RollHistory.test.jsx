import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RollHistory from '@/components/sheet/RollHistory.jsx'
import { loadRollHistory, recordRoll, togglePinRoll } from '@/lib/rollHistory.js'

describe('RollHistory', () => {
  it('groups newest first, colors natural dice only, and preserves legacy entries', async () => {
    const user = userEvent.setup()
    recordRoll({ id: 1, title: 'Старый бросок', detail: 'd20 +5', total: 20, at: new Date(2025, 0, 15, 12, 10).getTime() })
    recordRoll({ id: 2, title: 'Атака', detail: '20 + 6', dice: 'к20 + 6', d20: 20, total: 26, at: Date.now() - 2000 })
    recordRoll({ id: 3, title: 'Восприятие', detail: '1 + 5', dice: 'к20 + 5', d20: 1, total: 6, at: Date.now() })
    togglePinRoll(2)
    render(<RollHistory />)
    await user.click(screen.getByRole('button', { name: 'История бросков' }))
    const pinned = screen.getByRole('region', { name: 'Закреплённые' })
    const recent = screen.getByRole('region', { name: 'Последние броски' })
    expect(within(pinned).getByText('26')).toHaveAttribute('data-natural', '20')
    expect(within(pinned).getByRole('listitem')).toHaveAttribute('data-natural', '20')
    expect(within(pinned).getByText('к20 + 6')).toBeVisible()
    expect(within(recent).getAllByRole('listitem')[0]).toHaveTextContent('Восприятие')
    expect(within(recent).getByText('6')).toHaveAttribute('data-natural', '1')
    expect(within(recent).getAllByRole('listitem')[0]).toHaveAttribute('data-natural', '1')
    expect(within(recent).getByText('20')).not.toHaveAttribute('data-natural')
    expect(within(recent).getByText(/15 января 2025/)).toBeVisible()
    expect(within(recent).getByText('d20 +5')).toBeVisible()
  })

  it('moves pinned records, restores button focus, and clears only unpinned records', async () => {
    const user = userEvent.setup()
    recordRoll({ id: 1, title: 'Скрытность', detail: '16 + 7', total: 23, at: Date.now() })
    recordRoll({ id: 2, title: 'Инициатива', detail: '12 + 3', total: 15, at: Date.now() })
    render(<RollHistory />)
    await user.click(screen.getByRole('button', { name: 'История бросков' }))
    await user.click(screen.getByRole('button', { name: 'Закрепить: Скрытность' }))
    expect(screen.getByRole('button', { name: 'Открепить: Скрытность' })).toHaveFocus()
    expect(within(screen.getByRole('region', { name: 'Закреплённые' })).getByText('Скрытность')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Очистить' }))
    expect(loadRollHistory()).toEqual([expect.objectContaining({ id: 1, pinned: true })])
    expect(screen.queryByText('Инициатива')).not.toBeInTheDocument()
    expect(screen.getByText('Незакреплённых бросков нет')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Очистить' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Закрыть', exact: true }))
    await user.click(screen.getByRole('button', { name: 'История бросков' }))
    await user.click(screen.getByRole('button', { name: 'Открепить: Скрытность' }))
    expect(screen.queryByRole('region', { name: 'Закреплённые' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Закрепить: Скрытность' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Очистить' })).toBeEnabled()
  })

  it('shows an empty history and closes with Escape', async () => {
    const user = userEvent.setup()
    render(<RollHistory />)
    const trigger = screen.getByRole('button', { name: 'История бросков' })
    await user.click(trigger)
    expect(screen.getByText('Бросков пока нет')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Очистить' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
