export const ABILITY_CAP = 20

export const ASI_LEVELS = [4, 8, 12, 16, 19]

export const STATS = [
  { key: 'strength', code: 'STR', label: 'Сила', short: 'СИЛ' },
  { key: 'dexterity', code: 'DEX', label: 'Ловкость', short: 'ЛОВ' },
  { key: 'constitution', code: 'CON', label: 'Телосложение', short: 'ТЕЛ' },
  { key: 'intelligence', code: 'INT', label: 'Интеллект', short: 'ИНТ' },
  { key: 'wisdom', code: 'WIS', label: 'Мудрость', short: 'МДР' },
  { key: 'charisma', code: 'CHA', label: 'Харизма', short: 'ХАР' },
]

export const abilityByKey = Object.fromEntries(STATS.map((s) => [s.key, s]))
export const abilityByCode = Object.fromEntries(STATS.map((s) => [s.code, s]))

export const mod = (score) => Math.floor((score - 10) / 2)

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]

export const POINT_BUY_BUDGET = 27
export const POINT_BUY_MIN = 8
export const POINT_BUY_MAX = 15
export const POINT_BUY_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }

export const rollDie = (sides) => 1 + Math.floor(Math.random() * sides)

export const roll4d6DropLowest = () => {
  const rolls = [1, 2, 3, 4].map(() => rollDie(6))
  const kept = [...rolls].sort((a, b) => a - b).slice(1)
  return { rolls, value: kept.reduce((a, b) => a + b, 0) }
}

export const roll3d6 = () => {
  const rolls = [1, 2, 3].map(() => rollDie(6))
  return { rolls, value: rolls.reduce((a, b) => a + b, 0) }
}

export const bonusMap = (abilityBonuses = []) => {
  const map = {}
  for (const b of abilityBonuses) {
    map[b.ability] = (map[b.ability] || 0) + (b.bonus ?? b.amount ?? 0)
  }
  return map
}

export const effectiveTotals = (base = {}, bonusByCode = {}) => {
  const totals = {}
  for (const s of STATS) {
    totals[s.code] = Number(base[s.key] ?? 10) + (bonusByCode[s.code] || 0)
  }
  return totals
}

export const baseDefaults = () => Object.fromEntries(STATS.map((s) => [s.key, 10]))

export const abilityName = (code) => abilityByCode[code]?.label ?? code
