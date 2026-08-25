import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Hint, Panel, StepShell, Tag } from '@/features/characters/components/wizard/StepShell.jsx'

describe('StepShell', () => {
  it('renders step number, title and subtitle', () => {
    render(
      <StepShell stepNo={2} total={6} title="Класс" subtitle="Выбор класса">
        <p>content</p>
      </StepShell>,
    )
    expect(screen.getByText('Шаг 2 из 6')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Класс' })).toBeInTheDocument()
    expect(screen.getByText('Выбор класса')).toBeInTheDocument()
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('does not render subtitle when absent', () => {
    render(<StepShell stepNo={1} total={1} title="T" />)
    expect(screen.getByText('Шаг 1 из 1')).toBeInTheDocument()
  })
})

describe('Hint', () => {
  it('renders children', () => {
    render(<Hint>Подсказка</Hint>)
    expect(screen.getByText('Подсказка')).toBeInTheDocument()
  })
})

describe('Panel', () => {
  it('renders title and children', () => {
    render(
      <Panel title="Имя">
        <span>child</span>
      </Panel>,
    )
    expect(screen.getByText('Имя')).toBeInTheDocument()
    expect(screen.getByText('child')).toBeInTheDocument()
  })
})

describe('Tag', () => {
  it.each(['default', 'accent', 'good', 'dim'])('applies the %s tone class', (tone) => {
    const { container } = render(<Tag tone={tone}>текст</Tag>)
    expect(container.firstChild).toHaveClass(
      'inline-block',
      'whitespace-nowrap',
      'rounded',
      'px-2',
      'py-1',
      'text-xs',
      'font-medium',
    )
  })

  it('renders children text', () => {
    render(<Tag>Умение</Tag>)
    expect(screen.getByText('Умение')).toBeInTheDocument()
  })
})
