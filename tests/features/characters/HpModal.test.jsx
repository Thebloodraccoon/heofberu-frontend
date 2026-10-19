import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HpModal from '@/features/characters/components/sheet/HpModal.jsx'

describe('HpModal', () => {
  it('submits only the focused HP form with Enter', async () => {
    const user = userEvent.setup()
    const onDelta = vi.fn()
    const onTempHp = vi.fn()
    render(<HpModal character={{ current_hp: 20, max_hp: 30, temp_hp: 5 }} onClose={vi.fn()} onDelta={onDelta} onTempHp={onTempHp} onRest={vi.fn()} />)
    await user.type(screen.getByRole('spinbutton', { name: 'Изменение хитов' }), '{Enter}')
    expect(onDelta).not.toHaveBeenCalled()
    await user.type(screen.getByRole('spinbutton', { name: 'Изменение хитов' }), '7{Enter}')
    expect(onDelta).toHaveBeenCalledExactlyOnceWith(7)
    expect(onTempHp).not.toHaveBeenCalled()
    const temp = screen.getByRole('spinbutton', { name: 'Временные хиты' })
    await user.clear(temp)
    await user.type(temp, '8{Enter}')
    expect(onTempHp).toHaveBeenCalledExactlyOnceWith(8)
    expect(onDelta).toHaveBeenCalledOnce()
  })
})
