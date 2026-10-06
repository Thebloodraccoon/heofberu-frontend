import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ProficiencyPicker from '@/features/characters/components/sheet/ProficiencyPicker.jsx'

describe('ProficiencyPicker', () => {
  it('searches choices and adds only after confirmation', async () => {
    const user = userEvent.setup()
    const onPick = vi.fn()
    render(<ProficiencyPicker title="Добавить навык" addLabel="Добавить навык" options={[{ key: 1, label: 'Атлетика' }, { key: 2, label: 'Акробатика' }]} onPick={onPick} />)
    await user.click(screen.getByRole('button', { name: 'Добавить навык' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox'), 'Атлетика')
    expect(screen.queryByRole('button', { name: 'Акробатика' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Атлетика' }))
    expect(onPick).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Добавить', exact: true }))
    expect(onPick).toHaveBeenCalledWith(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('disables existing proficiencies and cancels without adding', async () => {
    const user = userEvent.setup()
    const onPick = vi.fn()
    render(<ProficiencyPicker title="Добавить владение" addLabel="Добавить владение" options={[{ key: 'light', label: 'Лёгкие доспехи', disabled: true }]} onPick={onPick} />)
    await user.click(screen.getByRole('button', { name: 'Добавить владение' }))
    expect(screen.getByRole('button', { name: /Лёгкие доспехи/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Добавить', exact: true })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(onPick).not.toHaveBeenCalled()
  })
})
