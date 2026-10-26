// Ячейки заклинаний класса: таблица { [уровень]: { CANTRIP, LEVEL_1…LEVEL_9 } } — правка с
// наследованием от прошлого уровня и шаблоны 5e.
import { SPELL_LEVEL_KEYS } from '@/features/catalog/config/editors/shared.js'

export const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1)
export const SLOT_KEYS = SPELL_LEVEL_KEYS.slice(1) // LEVEL_1…LEVEL_9

// Ячейки по правилам 5e: строка уровня — цифры ячеек 1-го, 2-го… круга («4332» = 4/3/3/2).
const byDigits = (rows) => rows.map((digits) => Object.fromEntries([...digits].map((n, i) => [SLOT_KEYS[i], Number(n)])))
const FULL = byDigits(['2', '3', '42', '43', '432', '433', '4331', '4332', '43331', '43332', '433321', '433321', '4333211', '4333211', '43332111', '43332111', '433321111', '433331111', '433332111', '433332211'])
const HALF = byDigits(['', '2', '3', '3', '42', '42', '43', '43', '432', '432', '433', '433', '4331', '4331', '4332', '4332', '43331', '43331', '43332', '43332'])
const THIRD = byDigits(['', '', '2', '3', '3', '3', '42', '42', '42', '43', '43', '43', '432', '432', '432', '433', '433', '433', '4331', '4331'])
// Колдун: [ячеек, круг] — все ячейки договора одного круга, круг растёт.
const PACT = [[1, 1], [2, 1], [2, 2], [2, 2], [2, 3], [2, 3], [2, 4], [2, 4], [2, 5], [2, 5], ...Array(6).fill([3, 5]), ...Array(4).fill([4, 5])]
  .map(([count, circle]) => ({ [SLOT_KEYS[circle - 1]]: count }))

export const PRESETS = [['Полный заклинатель', FULL], ['Полузаклинатель', HALF], ['Треть заклинателя', THIRD], ['Колдун', PACT]]

export const slotCell = (table, level, key) => Number(table[level]?.[key] ?? 0)

// Новое значение клетки тянется вниз: следующие уровни, где стояло то же старое значение
// (унаследованное), получают новое — до первой явно заданной клетки. Пустое значение —
// «как на прошлом уровне».
export function setSlotCell(table, level, key, raw) {
  const old = slotCell(table, level, key)
  const next = raw === '' ? (level > 1 ? slotCell(table, level - 1, key) : 0) : Math.max(0, Number(raw) || 0)
  const out = { ...table }
  const put = (l) => { out[l] = { ...(out[l] ?? {}), [key]: next } }
  put(level)
  for (let l = level + 1; l <= 20 && slotCell(table, l, key) === old; l += 1) put(l)
  return out
}

// Шаблон заполняет ячейки 1–9 кругов на всех 20 уровнях; заговоры у классов разные — их не трогает.
export function applySlotPreset(table, rows) {
  return Object.fromEntries(LEVELS.map((level, i) => [level, { CANTRIP: table[level]?.CANTRIP ?? 0, ...Object.fromEntries(SLOT_KEYS.map((k) => [k, 0])), ...rows[i] }]))
}
