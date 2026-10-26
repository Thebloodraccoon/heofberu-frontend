import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import LevelField from '@/features/catalog/components/editor/LevelField.jsx'

describe('LevelField', () => {
  it('takes a typed level (clamped to 1–20), nudges with −/+ and treats empty as «сразу» when optional', () => {
    const onChange = vi.fn()
    const { rerender } = render(<LevelField label="Уровень получения" value={5} onChange={onChange} />)
    const input = screen.getByRole('textbox', { name: 'Уровень получения' })

    fireEvent.change(input, { target: { value: '45' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenLastCalledWith(20)

    fireEvent.click(screen.getByRole('button', { name: 'Больше: Уровень получения' }))
    expect(onChange).toHaveBeenLastCalledWith(6)

    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenLastCalledWith(null)

    rerender(<LevelField label="Уровень получения" value={1} onChange={onChange} required />)
    expect(screen.getByRole('button', { name: 'Меньше: Уровень получения' })).toBeDisabled()
    onChange.mockClear()
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(onChange).not.toHaveBeenCalled()
  })
})
