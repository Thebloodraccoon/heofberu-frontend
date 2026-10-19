import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import SheetRollToasts from '@/components/sheet/SheetRollToasts.jsx'

afterEach(() => vi.useRealTimers())

describe('SheetRollToasts', () => {
  it('shows newest first and formats negative modifiers without declaring failure', () => {
    render(<SheetRollToasts toasts={[{ id: 1, title: 'Первый', d20: 20, total: 20 }, { id: 2, title: 'Второй', d20: 1, bonus: -2, total: -1 }]} onDismiss={vi.fn()} />)
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Второй')
    expect(screen.getByText('1 − 2')).toBeInTheDocument()
    expect(screen.queryByText(/на кости/)).not.toBeInTheDocument()
    expect(screen.getAllByRole('status')[1]).toHaveTextContent(/^20$/)
    expect(screen.queryByText(/на к20/)).not.toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Второй' })).toHaveAttribute('data-natural', '1')
    expect(screen.getByRole('article', { name: 'Первый' })).toHaveAttribute('data-natural', '20')
    expect(screen.queryByText(/провал|Повторить/)).not.toBeInTheDocument()
  })

  it('uses the natural die rather than the total or damage dice for the critical tone', () => {
    render(<SheetRollToasts toasts={[{ id: 1, title: 'Бонус', d20: 15, bonus: 5, total: 20 }, { id: 2, title: 'Урон', rolls: [1, 20], total: 21 }]} onDismiss={vi.fn()} />)
    expect(screen.getByRole('article', { name: 'Бонус' })).not.toHaveAttribute('data-natural')
    expect(screen.getByRole('article', { name: 'Урон' })).not.toHaveAttribute('data-natural')
  })

  it('keeps the existing countdown when a previous result becomes compact', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    const first = { id: 1, title: 'Первый', d20: 12, total: 12 }
    const { rerender } = render(<SheetRollToasts toasts={[first]} onDismiss={onDismiss} />)
    act(() => vi.advanceTimersByTime(3000))
    rerender(<SheetRollToasts toasts={[first, { id: 2, title: 'Второй', d20: 10, total: 10 }]} onDismiss={onDismiss} />)
    expect(screen.getAllByRole('progressbar')[1]).toHaveAttribute('aria-valuenow', '5')
    act(() => vi.advanceTimersByTime(5000))
    expect(onDismiss).toHaveBeenCalledWith(1)
    expect(onDismiss).not.toHaveBeenCalledWith(2)
  })

  it('counts down eight seconds, pauses on hover and focus, and dismisses', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<SheetRollToasts toasts={[{ id: 1, title: 'Проверка', d20: 12, total: 12 }]} onDismiss={onDismiss} />)
    const progress = screen.getByRole('progressbar')
    const card = screen.getByRole('article')
    act(() => vi.advanceTimersByTime(2000))
    expect(progress).toHaveAttribute('aria-valuenow', '6')
    fireEvent.mouseEnter(card)
    act(() => vi.advanceTimersByTime(10000))
    expect(onDismiss).not.toHaveBeenCalled()
    fireEvent.focus(screen.getByRole('button', { name: 'Закрыть' }))
    fireEvent.mouseLeave(card)
    act(() => vi.advanceTimersByTime(10000))
    expect(progress).toHaveAttribute('aria-valuenow', '6')
    fireEvent.blur(screen.getByRole('button', { name: 'Закрыть' }))
    act(() => vi.advanceTimersByTime(6000))
    expect(onDismiss).toHaveBeenCalledWith(1)
  })
})
