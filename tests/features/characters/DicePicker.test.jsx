import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DicePicker from '@/features/characters/components/sheet/DicePicker.jsx'

describe('DicePicker', () => {
  it('adds and removes dice, updates the formula, rolls and resets selection', async () => {
    const user = userEvent.setup()
    const onRoll = vi.fn()
    render(<DicePicker onRoll={onRoll} />)
    await user.click(screen.getByRole('button', { name: 'Броски' }))
    expect(screen.getByText('Выберите кубики')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Бросить' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Убрать к6' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Выбрать к6' }))
    await user.click(screen.getByRole('button', { name: 'Добавить к6' }))
    await user.click(screen.getByRole('button', { name: 'Добавить к20' }))
    expect(screen.getByText('2к6 + 1к20')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Убрать к6' }))
    expect(screen.getByText('1к6 + 1к20')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Бросить' }))
    expect(onRoll).toHaveBeenCalledWith({ 6: 1, 20: 1 })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Броски' }))
    expect(screen.getByText('Выбрано кубиков: 0')).toBeVisible()
  })

  it('preserves selection on Escape and clears without making a roll', async () => {
    const user = userEvent.setup()
    const onRoll = vi.fn()
    render(<DicePicker onRoll={onRoll} />)
    await user.click(screen.getByRole('button', { name: 'Броски' }))
    await user.click(screen.getByRole('button', { name: 'Выбрать к100' }))
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Броски' }))
    expect(screen.getByText('1к100')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Очистить' }))
    expect(screen.getByText('Выберите кубики')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Очистить' })).toBeDisabled()
    expect(onRoll).not.toHaveBeenCalled()
  })

  it('limits the count and removes zero quantities from the selection', async () => {
    const user = userEvent.setup()
    const onRoll = vi.fn()
    render(<DicePicker onRoll={onRoll} />)
    await user.click(screen.getByRole('button', { name: 'Броски' }))
    const add = screen.getByRole('button', { name: 'Добавить к4' })
    for (let count = 0; count < 100; count++) fireEvent.click(add)
    expect(screen.getByText('99к4')).toBeVisible()
    expect(add).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Выбрать к8' }))
    await user.click(screen.getByRole('button', { name: 'Убрать к8' }))
    await user.click(screen.getByRole('button', { name: 'Бросить' }))
    expect(onRoll).toHaveBeenCalledWith({ 4: 99 })
  })
})
