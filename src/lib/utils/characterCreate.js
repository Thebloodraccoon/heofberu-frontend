export const STEPS = [
  { id: 'name', title: 'Имя' },
  { id: 'race', title: 'Раса' },
  { id: 'background', title: 'Предыстория' },
  { id: 'class', title: 'Класс' },
  { id: 'abilities', title: 'Характеристики' },
  { id: 'feat', title: 'Черта' },
]

export const statsToTotals = (stats) => ({
  STR: stats?.strength_total ?? 0,
  DEX: stats?.dexterity_total ?? 0,
  CON: stats?.constitution_total ?? 0,
  INT: stats?.intelligence_total ?? 0,
  WIS: stats?.wisdom_total ?? 0,
  CHA: stats?.charisma_total ?? 0,
})

export const DEFAULT_FORM = {
  race_id: '',
  subrace_id: '',
  background_id: '',
  class_id: '',
  subclass_id: '',
  ability_method: 'array',
  ability_base: {},
  ability_rolls: {},
  class_skill_ids: [],
  name: '',
  feat_id: '',
  backstory: '',
}
