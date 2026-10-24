import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Input } from './primitives.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { dateKey, daysInMonth, localDateTime, monthDays, parseDateKey, shiftDate, shiftMonth, validTime } from '@/lib/utils/calendar.js'
import { formatDateTime } from '@/lib/utils/datetime.js'

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const WEEKDAYS = [['Пн', 'Понедельник'], ['Вт', 'Вторник'], ['Ср', 'Среда'], ['Чт', 'Четверг'], ['Пт', 'Пятница'], ['Сб', 'Суббота'], ['Вс', 'Воскресенье']]
const pad = (value) => String(value).padStart(2, '0')

function DateTimeDialog({ id, value, onApply, onClose }) {
  const [today] = useState(() => { const now = new Date(); return dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate()) })
  const [selected, setSelected] = useState(() => parseDateKey(value?.slice(0, 10)) ? value.slice(0, 10) : '')
  const [focused, setFocused] = useState(selected || today)
  const [view, setView] = useState(() => parseDateKey(selected || today))
  const [hour, setHour] = useState(value?.slice(11, 13) || '19')
  const [minute, setMinute] = useState(value?.slice(14, 16) || '00')
  const [cleared, setCleared] = useState(false)
  const [choosingMonth, setChoosingMonth] = useState(false)
  const [year, setYear] = useState(() => String(view.year))
  const dialogRef = useRef(null)
  const focusDateRef = useRef(false)
  const yearValid = /^\d{1,4}$/.test(year) && Number(year) >= 1
  const timeValid = validTime(hour, minute)
  const result = selected && localDateTime(selected, hour, minute)
  const error = !timeValid ? 'Часы — от 0 до 23, минуты — от 0 до 59.' : selected && !result ? 'Это местное время недоступно. Выберите другое.' : ''
  const canApply = !choosingMonth && (cleared || Boolean(result))
  const days = monthDays(view.year, view.month)
  const monthLabel = `${MONTHS[view.month - 1]} ${view.year}`

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    dialog.showModal()
    dialog.querySelector('[data-calendar-day][tabindex="0"]')?.focus()
    return () => {
      if (dialog.open) dialog.close()
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  useEffect(() => {
    if (!focusDateRef.current || choosingMonth) return
    dialogRef.current?.querySelector('[data-calendar-day][tabindex="0"]')?.focus()
    focusDateRef.current = false
  }, [focused, choosingMonth, view.year, view.month])

  const focusDate = (key) => {
    if (!key) return
    const parts = parseDateKey(key)
    if (key === focused && view.year === parts.year && view.month === parts.month && !choosingMonth) {
      dialogRef.current?.querySelector('[data-calendar-day][tabindex="0"]')?.focus()
      return
    }
    focusDateRef.current = true
    setFocused(key)
    setView(parts)
  }
  const selectDate = (key) => { setSelected(key); setCleared(false); focusDate(key) }
  const changeMonth = (offset) => {
    const day = parseDateKey(focused).day
    const key = shiftMonth(dateKey(view.year, view.month, Math.min(day, daysInMonth(view.year, view.month))), offset)
    if (!key) return
    setFocused(key)
    setView(parseDateKey(key))
    setYear(String(parseDateKey(key).year))
  }
  const calendarKeys = (event) => {
    const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    let next
    if (event.key in offsets) next = shiftDate(focused, offsets[event.key])
    else if (event.key === 'PageUp' || event.key === 'PageDown') next = shiftMonth(focused, (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1))
    else if (event.key === 'Home' || event.key === 'End') {
      const index = days.findIndex((day) => day.key === focused) % 7
      next = shiftDate(focused, event.key === 'Home' ? -index : 6 - index)
    } else return
    event.preventDefault()
    focusDate(next)
  }
  const apply = () => { if (canApply) onApply(cleared ? '' : result) }
  const keyDown = (event) => {
    // Панель сессии остаётся открытой: Escape и Enter обрабатывает только календарь.
    event.stopPropagation()
    if (event.key === 'Escape') { event.preventDefault(); onClose() }
    else if (event.key === 'Enter' && event.target.tagName === 'INPUT') { event.preventDefault(); apply() }
    else if (event.key === 'Tab') {
      const controls = Array.from(dialogRef.current.querySelectorAll('*')).filter((control) => ['BUTTON', 'INPUT'].includes(control.tagName) && !control.matches(':disabled') && control.tabIndex >= 0 && !control.closest('[hidden]'))
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
  }

  return createPortal(
    <dialog ref={dialogRef} id={id} className="ui-datetime-dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-summary`} onKeyDown={keyDown} onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose() }} onClick={(event) => {
      if (event.target !== event.currentTarget) return
      const bounds = event.currentTarget.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
    }}>
      <header className="ui-datetime-header"><div><h2 id={`${id}-title`} className="heading-card">Дата и время</h2><p id={`${id}-summary`} className="text-hint">{cleared ? 'Дата не назначена' : result ? formatDateTime(result) : 'Выберите день и укажите время'}</p></div><button type="button" className="ui-drawer-close" aria-label="Закрыть выбор даты и времени" onClick={onClose}><LoreIcon name="close" /></button></header>
      <div className="ui-datetime-body">
        <div className="ui-calendar-nav">
          <button type="button" aria-label="Предыдущий месяц" disabled={view.year === 1 && view.month === 1} onClick={() => changeMonth(-1)}><LoreIcon name="chevron" className="rotate-180" /></button>
          <button type="button" className="ui-calendar-month" aria-label="Выбрать месяц и год" aria-expanded={choosingMonth} onClick={() => { setYear(String(view.year)); setChoosingMonth((current) => !current) }}><span aria-live="polite">{monthLabel}</span><LoreIcon name="chevron" className={choosingMonth ? '-rotate-90' : 'rotate-90'} /></button>
          <button type="button" aria-label="Следующий месяц" disabled={view.year === 9999 && view.month === 12} onClick={() => changeMonth(1)}><LoreIcon name="chevron" /></button>
        </div>
        {choosingMonth ? <div className="ui-calendar-month-picker">
          <label className="ui-datetime-time-label">Год<Input inputMode="numeric" maxLength={4} value={year} onChange={(event) => setYear(event.target.value)} aria-invalid={!yearValid} /></label>
          {!yearValid && <p className="ui-datetime-error" role="alert">Укажите год от 1 до 9999.</p>}
          <div className="ui-calendar-months">{MONTHS.map((month, index) => <button key={month} type="button" disabled={!yearValid} aria-pressed={view.year === Number(year) && view.month === index + 1} onClick={() => { setChoosingMonth(false); focusDate(dateKey(Number(year), index + 1, 1)) }}>{month}</button>)}</div>
        </div> : <div className="ui-calendar" role="grid" aria-label={monthLabel} onKeyDown={calendarKeys}>
          <div className="ui-calendar-week" role="row">{WEEKDAYS.map(([short, full]) => <span role="columnheader" aria-label={full} key={short}>{short}</span>)}</div>
          {Array.from({ length: 6 }, (_, week) => <div className="ui-calendar-week" role="row" key={week}>{days.slice(week * 7, week * 7 + 7).map((day) => <div role="gridcell" aria-selected={selected === day.key} key={day.key}><button type="button" data-calendar-day data-outside={day.month !== view.month} data-selected={selected === day.key} aria-label={day.label} aria-current={day.key === today ? 'date' : undefined} tabIndex={day.key === focused ? 0 : -1} disabled={day.disabled} onFocus={() => setFocused(day.key)} onClick={() => selectDate(day.key)}>{day.day}</button></div>)}</div>)}
        </div>}
        <div className="ui-datetime-time">
          <label className="ui-datetime-time-label">Часы<Input inputMode="numeric" maxLength={2} value={hour} onFocus={(event) => event.target.select()} onChange={(event) => setHour(event.target.value)} onBlur={() => { if (validTime(hour, '00')) setHour(pad(hour)) }} aria-invalid={!timeValid} aria-describedby={`${id}-time-hint`} /></label>
          <span className="ui-datetime-colon" aria-hidden="true">:</span>
          <label className="ui-datetime-time-label">Минуты<Input inputMode="numeric" maxLength={2} value={minute} onFocus={(event) => event.target.select()} onChange={(event) => setMinute(event.target.value)} onBlur={() => { if (validTime('00', minute)) setMinute(pad(minute)) }} aria-invalid={!timeValid} aria-describedby={`${id}-time-hint`} /></label>
        </div>
        <p id={`${id}-time-hint`} className={error && !cleared ? 'ui-datetime-error' : 'text-hint'} role={error && !cleared ? 'alert' : undefined}>{error && !cleared ? error : 'Формат 24 часа. Местное время устройства.'}</p>
        <div className="ui-datetime-shortcuts"><button type="button" onClick={() => { setChoosingMonth(false); selectDate(today) }}>Сегодня</button><button type="button" disabled={!selected && !value} onClick={() => { setSelected(''); setCleared(true); setChoosingMonth(false) }}>Без даты</button></div>
      </div>
      <footer className="ui-datetime-footer"><Button type="button" variant="ghost" onClick={onClose}>Отмена</Button><Button type="button" disabled={!canApply} onClick={apply}>Применить</Button></footer>
    </dialog>,
    document.body,
  )
}

// Значение хранится в местном формате YYYY-MM-DDTHH:mm; перевод в UTC делает вызывающая форма.
export default function DateTimePicker({ value = '', onChange, disabled = false, label = 'Дата и время', ...rest }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return <>
    <button {...rest} type="button" className="ui-datetime-trigger" aria-label={label} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} disabled={disabled} onClick={() => setOpen(true)}><LoreIcon name="calendar" /><span>{value ? formatDateTime(value) : 'Выбрать дату и время'}</span><LoreIcon name="chevron" /></button>
    {open && <DateTimeDialog id={id} value={value} onClose={() => setOpen(false)} onApply={(next) => { if (disabled) return; onChange?.({ target: { value: next } }); setOpen(false) }} />}
  </>
}
