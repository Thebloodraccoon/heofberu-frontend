// Время сессий и прочих меток кампаний. Бэк хранит `timestamptz` и время без смещения считает UTC,
// а поле выбора даты отдаёт местное время без зоны — поэтому всё, что уходит на сервер,
// переводим в ISO с `Z`, а пришедшее ISO — обратно в локальное значение поля.

const pad = (value) => String(value).padStart(2, '0')

// «2099-01-10T21:00» (локальное, из поля) → «2099-01-10T18:00:00.000Z»; пустое поле → null.
export function toApiDateTime(localValue) {
  if (!localValue) return null
  const date = new Date(localValue)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

// ISO с сервера → местное значение YYYY-MM-DDTHH:mm в часовом поясе браузера; null → ''.
export function toLocalInputValue(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// «10 янв. 2099 г., 21:00»; без даты — «—».
export function formatDateTime(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })
}

// «10 января 2099 г.» — заголовок дня в расписании.
export function formatDay(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

// «21:00» — время внутри дня расписания.
export function formatTime(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

// Ключ дня в локальном поясе (для группировки расписания): «2099-01-10».
export function localDayKey(iso) {
  const date = new Date(iso)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
