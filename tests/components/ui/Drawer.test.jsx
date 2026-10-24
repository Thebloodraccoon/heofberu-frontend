import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Drawer from '@/components/ui/Drawer.jsx'

describe('drawer focus and confirmation', () => {
  it('locks the background and restores focus and scrolling on close', async () => {
    function Fixture() {
      const [open, setOpen] = useState(false)
      return <div id="root"><button onClick={() => setOpen(true)}>Открыть</button>{open && <Drawer title="Панель" onClose={() => setOpen(false)}><input aria-label="Название" /></Drawer>}</div>
    }
    const user = userEvent.setup()
    render(<Fixture />)
    const trigger = screen.getByRole('button', { name: 'Открыть' })
    await user.click(trigger)
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.getElementById('root').inert).toBe(true)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
    expect(document.getElementById('root').inert).toBeFalsy()
    expect(trigger).toHaveFocus()
  })

  it('traps focus in the confirmation and restores the trigger when cancelled', async () => {
    const onConfirm = vi.fn()
    function Fixture() {
      const [confirming, setConfirming] = useState(false)
      return <Drawer title="Настройки" onClose={vi.fn()} confirmation={confirming ? { title: 'Сохранить?', message: 'Изменится состав.', confirmText: 'Да', onCancel: () => setConfirming(false), onConfirm } : null}>
        <button onClick={() => setConfirming(true)}>Подтвердить</button>
      </Drawer>
    }
    const user = userEvent.setup()
    render(<Fixture />)
    const trigger = screen.getByRole('button', { name: 'Подтвердить' })
    await user.click(trigger)
    const confirm = within(screen.getByRole('alertdialog', { name: 'Сохранить?' }))
    expect(confirm.getByRole('button', { name: 'Остаться' })).toHaveFocus()
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(confirm.getByRole('button', { name: 'Да' })).toHaveFocus()
    await user.keyboard('{Tab}')
    expect(confirm.getByRole('button', { name: 'Остаться' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('does not dismiss the drawer when an inner control handles Escape', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<Drawer title="Панель" onClose={onClose}><input aria-label="Поле" onKeyDown={(event) => { if (event.key === 'Escape') event.preventDefault() }} /></Drawer>)
    await user.click(screen.getByRole('textbox', { name: 'Поле' }))
    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })
})
