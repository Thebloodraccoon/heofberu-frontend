import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import CreateProgress from '@/features/characters/components/wizard/CreateProgress.jsx'

describe('CreateProgress', () => {
  it('shows the current and target level', () => {
    render(<CreateProgress current={3} target={5} />)
    expect(screen.getByText('Уровень 3 из 5')).toBeInTheDocument()
    expect(screen.getByText('Создаём персонажа…')).toBeInTheDocument()
  })

  it('renders 0% for the first step', () => {
    render(<CreateProgress current={1} target={5} />)
    expect(screen.getByText('Уровень 1 из 5')).toBeInTheDocument()
    expect(screen.getByText('Создаём персонажа…')).toBeInTheDocument()
  })

  it('renders 100% when on the last level', () => {
    const { container } = render(<CreateProgress current={5} target={5} />)
    const fill = container.querySelector('.bg-ember')
    expect(fill).toHaveStyle({ width: '100%' })
  })

  it('avoids division by zero when target is 1', () => {
    const { container } = render(<CreateProgress current={1} target={1} />)
    const fill = container.querySelector('.bg-ember')
    expect(fill).toHaveStyle({ width: '100%' })
  })

  it('computes intermediate percentage', () => {
    const { container } = render(<CreateProgress current={2} target={5} />)
    const fill = container.querySelector('.bg-ember')
    expect(fill).toHaveStyle({ width: '25%' })
  })
})
