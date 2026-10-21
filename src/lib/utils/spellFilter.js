import { spellLevelLabels, spellSchoolLabels } from '@/lib/i18n/index.js'

// «Любое заклинание на выбор» — открытый эффект заклинания (spell_id: null,
// только внутри варианта группы выбора): лишнее заклинание сверх ячеек,
// которое игрок выберет сам (Тайны магии). Фильтр сужает выбор, пустое
// значение ничего не ограничивает. Текст условий — с бэка (summary).

export const SPELL_LEVELS = [
  'CANTRIP',
  'LEVEL_1',
  'LEVEL_2',
  'LEVEL_3',
  'LEVEL_4',
  'LEVEL_5',
  'LEVEL_6',
  'LEVEL_7',
  'LEVEL_8',
  'LEVEL_9',
]

export const SPELL_SCHOOLS = Object.keys(spellSchoolLabels)

const emptySpellFilter = () => ({
  class_ids: [],
  min_level: null,
  max_level: null,
  castable_only: false,
  schools: [],
  ritual_only: false,
})

export const newOpenSpellEffect = () => ({ spell_id: null, ...emptySpellFilter() })

export const isOpenSpellEffect = (effect) => effect != null && effect.spell_id == null

const levelNumber = (level) => SPELL_LEVELS.indexOf(level)

// Уровень ниже минимума — ошибка фильтра (бэк отвечает 422).
export const spellLevelRangeInverted = (effect) =>
  Boolean(effect?.min_level && effect?.max_level && levelNumber(effect.min_level) > levelNumber(effect.max_level))

// Текст условий «любого заклинания» отдаёт бэк (effect.summary: [] — без фильтра),
// здесь только склейка в одну строку.
export function describeOpenSpell(effect) {
  const summary = effect?.summary ?? []
  return summary.length > 0 ? `любое заклинание на выбор (${summary.join('; ')})` : 'любое заклинание на выбор'
}

// Подпись заклинания в списке выбора: «3 уровень · Воплощение · ритуал».
export const spellMetaText = (spell) =>
  [spellLevelLabels[spell.level], spellSchoolLabels[spell.school], spell.is_ritual ? 'ритуал' : null]
    .filter(Boolean)
    .join(' · ')
