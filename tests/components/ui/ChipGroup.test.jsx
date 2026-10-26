import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChipGroup from '@/components/ui/ChipGroup.jsx'

const options = [{ value: '', label: '—' }, { value: 'STR', label: 'Сила' }, { value: 'DEX', label: 'Ловкость' }]

function Harness({ onChange }) {
  const [value, setValue] = useState('STR')
  return <ChipGroup label="Характеристика" options={options} value={value} onChange={(v) => { setValue(v); onChange(v) }} />
}

describe('ChipGroup', () => {
  it('is one Tab stop; arrows move and select (wrapping), Home/End jump; empty value reads «Нет»', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<><button>before</button><Harness onChange={onChange} /></>)
    expect(screen.getAllByRole('radio').map((r) => r.tabIndex)).toEqual([-1, 0, -1])
    expect(screen.getByRole('radio', { name: 'Нет' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'before' }))
    await user.tab()
    expect(screen.getByRole('radio', { name: 'Сила' })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenLastCalledWith('DEX')
    expect(screen.getByRole('radio', { name: 'Ловкость' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenLastCalledWith('')
    await user.keyboard('{End}')
    expect(screen.getByRole('radio', { name: 'Ловкость' })).toHaveAttribute('aria-checked', 'true')
  })
})
