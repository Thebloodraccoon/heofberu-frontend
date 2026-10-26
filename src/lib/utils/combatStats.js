import { speedTypeLabels } from '@/lib/i18n/index.js'

// Строки разбивки GET /characters/{id}/combat-stats. Источники, которые
// задают значение (доспех, формула, базовая/заданная скорость), показываем
// числом, а прибавки (модификатор, щит, бонус, штраф) — со знаком.
const ABSOLUTE_SOURCES = new Set(['armor', 'unarmored', 'formula', 'base', 'set', 'equal_to_walk'])

export function combatLineValue(line, unit = '') {
  // «Тяжёлый доспех не снижает скорость» — без числа.
  if (line?.source === 'ignore_armor_penalty') return '—'
  const v = Number(line?.value) || 0
  const text = ABSOLUTE_SOURCES.has(line?.source) ? `${v}` : `${v < 0 ? '−' : '+'}${Math.abs(v)}`
  return unit ? `${text} ${unit}` : text
}

const SPEED_TYPES = ['WALK', 'FLY', 'SWIM', 'CLIMB', 'BURROW']

// Бонус к скорости, которой у персонажа нет (reason_code no_speed, «нет скорости полёта»):
// итог вида и так «нет», поэтому такая строка показывается обычной, без причины.
// Текст причины — только запасной вариант для ответа без reason_code.
const isMissingSpeedBonus = (line) =>
  line.source === 'bonus' && (line.reason_code != null ? line.reason_code === 'no_speed' : Boolean(line.reason?.startsWith('нет скорости')))

// Расчёт скоростей по видам: итог (null — такой скорости нет), строки, которые
// его дали, и неприменённые (с причиной). Вид без итога и без строк пропускаем.
export function speedSections(speed) {
  if (!speed) return []
  const ofType = (lines, type) => (lines ?? []).filter((line) => (line.speed_type ?? 'WALK') === type)
  return SPEED_TYPES.map((type) => {
    const inactive = ofType(speed.inactive, type)
    return {
      type,
      label: speedTypeLabels[type] ?? type,
      total: speed.computed?.[type.toLowerCase()] ?? null,
      lines: [
        ...ofType(speed.breakdown, type),
        ...inactive.filter(isMissingSpeedBonus).map((line) => ({ ...line, reason: null })),
      ],
      inactive: inactive.filter((line) => !isMissingSpeedBonus(line)),
    }
  }).filter((section) => section.total != null || section.lines.length > 0 || section.inactive.length > 0)
}

const OTHER_SPEEDS = ['fly', 'swim', 'climb', 'burrow']

// Рассчитанные скорости кроме ходьбы, которые у персонажа есть (не null).
export const otherSpeeds = (computed) =>
  OTHER_SPEEDS.filter((key) => computed?.[key] != null).map((key) => ({
    key,
    label: speedTypeLabels[key.toUpperCase()] ?? key,
    value: computed[key],
  }))
