import { describe, expect, it } from 'vitest'
import { dateKey, daysInMonth, localDateTime, monthDays, parseDateKey, shiftDate, shiftMonth, validTime } from '@/lib/utils/calendar.js'

describe('calendar dates', () => {
  it('validates real dates including leap years and years below 100', () => {
    expect(parseDateKey('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 })
    expect(parseDateKey('0004-02-29')).toEqual({ year: 4, month: 2, day: 29 })
    expect(dateKey(4, 2, 9)).toBe('0004-02-09')
    expect(daysInMonth(2100, 2)).toBe(28)
    expect(daysInMonth(2000, 2)).toBe(29)
  })

  it.each(['2026-02-29', '2026-04-31', '2026-00-10', '2026-13-01', '0000-01-01', '26-01-01', '', null])('rejects invalid calendar dates: %s', (value) => {
    expect(parseDateKey(value)).toBeNull()
  })

  it('starts weeks on Monday and includes adjacent days for a stable six-week calendar', () => {
    const days = monthDays(2026, 10)
    expect(days).toHaveLength(42)
    expect(days[0].key).toBe('2026-09-28')
    expect(days[0].label).toMatch(/^понедельник/)
    expect(days.at(-1).key).toBe('2026-11-08')
  })

  it('moves between months without overflowing the destination month', () => {
    expect(shiftMonth('2024-01-31', 1)).toBe('2024-02-29')
    expect(shiftMonth('2024-02-29', 12)).toBe('2025-02-28')
    expect(shiftMonth('2026-01-10', -1)).toBe('2025-12-10')
    expect(shiftDate('2024-02-28', 1)).toBe('2024-02-29')
    expect(shiftDate('2024-03-01', -1)).toBe('2024-02-29')
  })

  it('bounds navigation to supported years', () => {
    expect(shiftDate('0001-01-01', -1)).toBeNull()
    expect(shiftMonth('0001-01-01', -1)).toBeNull()
    expect(shiftDate('9999-12-31', 1)).toBeNull()
    expect(shiftMonth('9999-12-01', 1)).toBeNull()
    expect(monthDays(1, 1)[0].disabled).toBe(false)
    expect(monthDays(9999, 12).at(-1).disabled).toBe(true)
  })

  it('returns canonical local date and time without changing the time zone', () => {
    expect(localDateTime('2099-01-10', '7', '5')).toBe('2099-01-10T07:05')
    expect(localDateTime('2026-04-31', '19', '00')).toBeNull()
    expect(localDateTime('2026-10-24', '24', '00')).toBeNull()
  })

  it.each([['24', '00'], ['12', '60'], ['-1', '00'], ['', '15'], ['10', ''], ['x', '05']])('rejects invalid hours/minutes: %s:%s', (hour, minute) => {
    expect(validTime(hour, minute)).toBe(false)
  })
})
