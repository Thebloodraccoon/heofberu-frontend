import { describe, expect, it } from 'vitest'
import { formatDateTime, formatDay, localDayKey, toApiDateTime, toLocalInputValue } from '@/lib/utils/datetime.js'

describe('session datetimes', () => {
  it('sends the local datetime-local value as an absolute UTC instant', () => {
    const iso = toApiDateTime('2099-01-10T21:00')
    expect(iso).toMatch(/Z$/)
    // Тот же момент, что и локальные 21:00, — независимо от часового пояса, где идут тесты.
    expect(new Date(iso).getTime()).toBe(new Date(2099, 0, 10, 21, 0).getTime())
  })

  it('round-trips through the form field without shifting the time', () => {
    expect(toLocalInputValue(toApiDateTime('2099-01-10T21:00'))).toBe('2099-01-10T21:00')
    expect(toLocalInputValue(new Date(2099, 5, 1, 9, 5).toISOString())).toBe('2099-06-01T09:05')
  })

  it.each([[''], [null], [undefined], ['not a date']])('treats %s as no date', (value) => {
    expect(toApiDateTime(value)).toBeNull()
    expect(toLocalInputValue(value)).toBe('')
  })

  it('formats and groups by the local day', () => {
    const iso = new Date(2099, 0, 10, 23, 30).toISOString()
    expect(localDayKey(iso)).toBe('2099-01-10')
    expect(formatDay(iso)).toContain('2099')
    expect(formatDateTime(null)).toBe('—')
  })
})
