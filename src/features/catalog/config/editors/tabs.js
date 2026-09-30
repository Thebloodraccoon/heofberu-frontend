export const catalogEditorTabs = {
  races: [['main', 'Основное'], ['traits', 'Характеристики и навыки'], ['features', 'Особенности'], ['subraces', 'Подрасы']],
  classes: [['main', 'Основное'], ['traits', 'Владения и навыки'], ['magic', 'Магия'], ['features', 'Умения'], ['items', 'Снаряжение'], ['subclasses', 'Подклассы']],
  spells: [['main', 'Основное'], ['casting', 'Накладывание'], ['effects', 'Урон и лечение'], ['access', 'Доступность']],
  backgrounds: [['main', 'Основное'], ['traits', 'Навыки и личность'], ['features', 'Умения'], ['items', 'Снаряжение']],
}

export function catalogFieldTab(resource, key) {
  if (resource === 'classes' && key === 'skill_choice_count') return 'traits'
  if (resource === 'backgrounds' && key === 'starting_gold') return 'items'
  if (resource !== 'spells') return 'main'
  if (key.startsWith('damage_') || key.startsWith('healing_') || ['h_damage', 'h_heal', 'attack_type', 'save_stat'].includes(key)) return 'effects'
  if (['h_cast', 'cast_time', 'duration', 'is_concentration', 'is_ritual', 'range_type', 'range_value', 'material', 'is_material_consumed'].includes(key)) return 'casting'
  return 'main'
}

export function catalogSectionTab(resource, key) {
  if (!catalogEditorTabs[resource] || key === 'tags') return 'main'
  if (resource === 'spells') return key === 'components' ? 'casting' : 'access'
  if (resource === 'classes' && ['spellcasting_ability', 'spell_slots'].includes(key)) return 'magic'
  return 'traits'
}
