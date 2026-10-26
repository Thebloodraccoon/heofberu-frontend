import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import DiceField from '@/components/ui/DiceField.jsx'

const render = (props) => renderWithProviders(<DiceField label="Кость урона" onChange={vi.fn()} {...props} />, { auth: false })

describe('DiceField', () => {
  it('shows the formula; picking a die sets count 1, −/+ stay within 1…100', async () => {
    const onChange = vi.fn()
    const { rerender } = render({ count: '', type: '', optional: true, onChange })
    expect(screen.getByText('Без кости')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'к6' }))
    expect(onChange).toHaveBeenLastCalledWith({ count: 1, type: 'D6' })

    rerender(<DiceField label="Кость урона" count={2} type="D6" optional onChange={onChange} />)
    expect(screen.getByText('2к6')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'к6' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Больше: Кость урона' }))
    expect(onChange).toHaveBeenLastCalledWith({ count: 3, type: 'D6' })
    await userEvent.click(screen.getByRole('button', { name: 'Убрать' }))
    expect(onChange).toHaveBeenLastCalledWith({ count: '', type: '' })

    rerender(<DiceField label="Кость урона" count={1} type="D6" onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Меньше: Кость урона' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Убрать' })).not.toBeInTheDocument()
  })

  it('without a count is just the die (hit die)', () => {
    render({ type: 'D10', withCount: false })
    expect(screen.getByText('к10', { selector: '.dice-field-formula' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Больше/ })).not.toBeInTheDocument()
  })
})
