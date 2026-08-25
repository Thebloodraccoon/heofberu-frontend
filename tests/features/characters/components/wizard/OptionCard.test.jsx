import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OptionCard } from '@/features/characters/components/wizard/OptionCard.jsx'

describe('OptionCard', () => {
  it('renders title, subtitle and children', () => {
    render(
      <OptionCard title="Воин" subtitle="Боевые навыки">
        <em>доп</em>
      </OptionCard>,
    )
    expect(screen.getByText('Воин')).toBeInTheDocument()
    expect(screen.getByText('Боевые навыки')).toBeInTheDocument()
    expect(screen.getByText('доп')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<OptionCard title="Воин" onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: /воин/i }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn()
    render(<OptionCard title="Воин" disabled onClick={onClick} />)
    const btn = screen.getByRole('button', { name: /воин/i })
    expect(btn).toBeDisabled()
    await userEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('marks the selected card', () => {
    const { container } = render(<OptionCard title="Воин" selected />)
    expect(container.firstChild).toHaveClass('border-ember/80', 'bg-ember/10')
  })
})
