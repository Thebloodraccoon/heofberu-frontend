export const STEPS = [
  { id: 'race', title: 'Раса' },
  { id: 'background', title: 'Предыстория' },
  { id: 'class', title: 'Класс' },
  { id: 'abilities', title: 'Характеристики' },
  { id: 'level', title: 'Уровень и ХП' },
  { id: 'personality', title: 'Личность' },
  { id: 'review', title: 'Сводка' },
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
  level: '1',
  hp_mode: 'average',
  rolled_dice: {},
  ability_method: 'array',
  ability_base: {},
  ability_rolls: {},
  class_skill_ids: [],
  expertise_ids: [],
  name: '',
  feat_id: '',
  traits: '',
  proficiencies: '',
  backstory: '',
  notes: '',
  money_gold: 0,
  money_silver: 0,
  money_copper: 0,
}
