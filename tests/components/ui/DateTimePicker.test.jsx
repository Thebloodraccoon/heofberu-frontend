import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DateTimePicker from '@/components/ui/DateTimePicker.jsx'
import Drawer from '@/components/ui/Drawer.jsx'

function setup(initial = '', options = {}) {
  const onChange = vi.fn()
  function Fixture() {
    const [value, setValue] = useState(initial)
    return <DateTimePicker value={value} onChange={(event) => { onChange(event); setValue(event.target.value) }} {...options} />
  }
  render(<Fixture />)
  return { user: userEvent.setup(), onChange, trigger: screen.getByRole('button', { name: 'Дата и время', exact: true }) }
}

describe('date and time picker', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 9, 24, 12, 0)) })
  afterEach(() => vi.useRealTimers())

  it('keeps a draft until Apply and shows the current selection when reopened', async () => {
    const { user, onChange, trigger } = setup()
    await user.click(trigger)
    const picker = within(screen.getByRole('dialog', { name: 'Дата и время', exact: true }))
    expect(picker.getByRole('button', { name: 'Применить' })).toBeDisabled()
    await user.click(picker.getByRole('button', { name: /25 октября 2026/ }))
    await user.clear(picker.getByRole('textbox', { name: 'Часы' }))
    await user.type(picker.getByRole('textbox', { name: 'Часы' }), '21')
    expect(onChange).not.toHaveBeenCalled()
    await user.click(picker.getByRole('button', { name: 'Применить' }))
    expect(onChange).toHaveBeenCalledWith({ target: { value: '2026-10-25T21:00' } })
    expect(trigger).toHaveFocus()
    await user.click(trigger)
    expect(screen.getByRole('button', { name: /25 октября 2026/ }).closest('[role="gridcell"]')).toHaveAttribute('aria-selected', 'true')
  })

  it.each(['cancel', 'escape', 'close', 'backdrop'])('discards draft changes on %s', async (method) => {
    const { user, onChange, trigger } = setup('2026-10-20T18:30')
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: /25 октября 2026/ }))
    if (method === 'cancel') await user.click(screen.getByRole('button', { name: 'Отмена' }))
    else if (method === 'escape') await user.keyboard('{Escape}')
    else if (method === 'close') await user.click(screen.getByRole('button', { name: 'Закрыть выбор даты и времени' }))
    else fireEvent.click(screen.getByRole('dialog'), { clientX: -1, clientY: -1 })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
    expect(trigger).toHaveFocus()
    await user.click(trigger)
    expect(screen.getByRole('button', { name: /20 октября 2026/ }).closest('[role="gridcell"]')).toHaveAttribute('aria-selected', 'true')
  })

  it('supports jumping to a year and month and selecting leap day', async () => {
    const { user, onChange, trigger } = setup()
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Выбрать месяц и год' }))
    const year = screen.getByRole('textbox', { name: 'Год' })
    await user.clear(year)
    expect(screen.getByRole('button', { name: 'Февраль', exact: true })).toBeDisabled()
    await user.type(year, '2028')
    await user.click(screen.getByRole('button', { name: 'Февраль', exact: true }))
    await user.click(screen.getByRole('button', { name: /29 февраля 2028/ }))
    await user.click(screen.getByRole('button', { name: 'Применить' }))
    expect(onChange).toHaveBeenCalledWith({ target: { value: '2028-02-29T19:00' } })
  })

  it('rejects invalid 24-hour time and normalizes valid single digits', async () => {
    const { user, onChange, trigger } = setup('2026-10-24T19:00')
    await user.click(trigger)
    const hours = screen.getByRole('textbox', { name: 'Часы' })
    const minutes = screen.getByRole('textbox', { name: 'Минуты' })
    await user.clear(hours)
    await user.type(hours, '24')
    expect(screen.getByRole('alert')).toHaveTextContent('Часы — от 0 до 23')
    expect(screen.getByRole('button', { name: 'Применить' })).toBeDisabled()
    await user.clear(hours)
    await user.type(hours, '7')
    await user.clear(minutes)
    await user.type(minutes, '60')
    expect(screen.getByRole('button', { name: 'Применить' })).toBeDisabled()
    await user.keyboard('{Enter}')
    expect(onChange).not.toHaveBeenCalled()
    await user.clear(minutes)
    await user.type(minutes, '5')
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith({ target: { value: '2026-10-24T07:05' } })
  })

  it('sets today and clears an existing date only after confirmation', async () => {
    const { user, onChange, trigger } = setup('2026-02-10T18:00')
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Сегодня' }))
    expect(onChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Применить' }))
    expect(onChange).toHaveBeenLastCalledWith({ target: { value: '2026-10-24T18:00' } })
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Без даты' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Применить' }))
    expect(onChange).toHaveBeenLastCalledWith({ target: { value: '' } })
  })

  it('supports arrow keys, week boundaries and month navigation without changing the draft', async () => {
    const { user, onChange, trigger } = setup('2026-10-24T19:00')
    await user.click(trigger)
    expect(screen.getByRole('button', { name: /24 октября 2026/ })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: /25 октября 2026/ })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('button', { name: /19 октября 2026/ })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('button', { name: /25 октября 2026/ })).toHaveFocus()
    await user.keyboard('{PageDown}')
    expect(screen.getByRole('button', { name: /25 ноября 2026/ })).toHaveFocus()
    expect(onChange).not.toHaveBeenCalled()
    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('button', { name: 'Применить' }))
    expect(onChange).toHaveBeenCalledWith({ target: { value: '2026-11-25T19:00' } })
  })

  it('keeps focus in the calendar and lets Escape dismiss it without closing the parent drawer', async () => {
    const closeDrawer = vi.fn()
    const user = userEvent.setup()
    render(<Drawer title="Сессия" onClose={closeDrawer}><DateTimePicker value="2026-10-24T19:00" onChange={vi.fn()} /></Drawer>)
    const trigger = screen.getByRole('button', { name: 'Дата и время', exact: true })
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Закрыть выбор даты и времени' }))
    await user.click(trigger)
    const close = screen.getByRole('button', { name: 'Закрыть выбор даты и времени' })
    close.focus()
    expect(close).toHaveFocus()
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(screen.getByRole('button', { name: 'Применить' })).toHaveFocus()
    await user.keyboard('{Tab}')
    expect(close).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Сессия', exact: true })).toBeVisible()
    expect(closeDrawer).not.toHaveBeenCalled()
    expect(trigger).toHaveFocus()
  })

  it('moves to an adjacent month when its day is selected', async () => {
    const { user, onChange, trigger } = setup()
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: /, 1 ноября 2026/ }))
    expect(screen.getByRole('grid', { name: 'Ноябрь 2026' })).toBeVisible()
    expect(screen.getByRole('button', { name: /, 1 ноября 2026/ })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Применить' }))
    expect(onChange).toHaveBeenCalledWith({ target: { value: '2026-11-01T19:00' } })
  })

  it('does not open a disabled picker', async () => {
    const { user, trigger } = setup('', { disabled: true })
    await user.click(trigger)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
