import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import RollToasts from '@/features/characters/components/wizard/RollToasts.jsx'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

const toast = (overrides = {}) => ({ id: 1, title: 'Сила', dice: [6, 5, 6, 1], total: 17, ...overrides })

describe('RollToasts', () => {
  it('renders the title, dice and total', () => {
    render(<RollToasts toasts={[toast()]} onDismiss={vi.fn()} />)
    expect(screen.getByText('Сила')).toBeInTheDocument()
    expect(screen.getByText('= 17')).toBeInTheDocument()
  })

  it('strikes through the lowest die for 4d6', () => {
    render(<RollToasts toasts={[toast()]} onDismiss={vi.fn()} />)
    expect(screen.getByText('1').className).toContain('line-through')
    expect(screen.getByText('5').className).not.toContain('line-through')
  })

  it('does not strike anything for 3d6', () => {
    render(<RollToasts toasts={[toast({ dice: [4, 5, 6], total: 15 })]} onDismiss={vi.fn()} />)
    for (const d of ['4', '5', '6']) {
      expect(screen.getByText(d).className).not.toContain('line-through')
    }
  })

  it('dismisses on close', () => {
    const onDismiss = vi.fn()
    render(<RollToasts toasts={[toast()]} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByLabelText('Закрыть'))
    expect(onDismiss).toHaveBeenCalledWith(1)
  })

  it('fades out gradually and pauses on hover', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<RollToasts toasts={[toast()]} onDismiss={onDismiss} />)
    const el = screen.getByRole('status')

    expect(el).toHaveStyle({ opacity: 1 })
    act(() => vi.advanceTimersByTime(3000))
    expect(el).toHaveStyle({ opacity: 0.5 })

    fireEvent.mouseEnter(el)
    expect(el).toHaveStyle({ opacity: 1 })
    act(() => vi.advanceTimersByTime(10000))
    expect(onDismiss).not.toHaveBeenCalled()

    fireEvent.mouseLeave(el)
    act(() => vi.advanceTimersByTime(3000))
    expect(onDismiss).toHaveBeenCalledWith(1)
  })
})
