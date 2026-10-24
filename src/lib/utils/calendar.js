const pad = (value) => String(value).padStart(2, '0')

// Календарная арифметика не зависит от переходов на летнее время.
function utcDate(year, month, day) {
  const date = new Date(0)
  date.setUTCHours(12, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)
  return date
}

export function dateKey(year, month, day) {
  return `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}`
}

export function parseDateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) return null
  const [, y, m, d] = match
  const year = Number(y), month = Number(m), day = Number(d)
  const date = utcDate(year, month, day)
  if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null
  return { year, month, day }
}

export function daysInMonth(year, month) {
  return utcDate(year, month + 1, 0).getUTCDate()
}

export function shiftDate(key, days) {
  const parts = parseDateKey(key)
  if (!parts) return null
  const date = utcDate(parts.year, parts.month, parts.day + days)
  if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return null
  return dateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

export function shiftMonth(key, months) {
  const parts = parseDateKey(key)
  if (!parts) return null
  const date = utcDate(parts.year, parts.month + months, 1)
  const year = date.getUTCFullYear(), month = date.getUTCMonth() + 1
  if (year < 1 || year > 9999) return null
  return dateKey(year, month, Math.min(parts.day, daysInMonth(year, month)))
}

export function monthDays(year, month) {
  const first = utcDate(year, month, 1)
  const offset = (first.getUTCDay() + 6) % 7
  return Array.from({ length: 42 }, (_, index) => {
    const date = utcDate(year, month, index - offset + 1)
    const y = date.getUTCFullYear(), m = date.getUTCMonth() + 1, day = date.getUTCDate()
    return { key: dateKey(y, m, day), year: y, month: m, day, label: date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }), disabled: y < 1 || y > 9999 }
  })
}

export function validTime(hour, minute) {
  return /^\d{1,2}$/.test(hour) && Number(hour) <= 23 && /^\d{1,2}$/.test(minute) && Number(minute) <= 59
}

export function localDateTime(key, hour, minute) {
  const parts = parseDateKey(key)
  if (!parts || !validTime(hour, minute)) return null
  const value = `${key}T${pad(hour)}:${pad(minute)}`
  const date = new Date(value)
  // Не заменяем несуществующее местное время (например, при переводе часов) другим.
  if (date.getFullYear() !== parts.year || date.getMonth() + 1 !== parts.month || date.getDate() !== parts.day || date.getHours() !== Number(hour) || date.getMinutes() !== Number(minute)) return null
  return value
}
