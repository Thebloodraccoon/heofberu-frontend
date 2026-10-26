export const catalogEditorTabs = {
  races: [['main', 'Основное'], ['traits', 'Характеристики и навыки'], ['features', 'Особенности'], ['subraces', 'Подрасы']],
  classes: [['main', 'Основное'], ['traits', 'Владения и навыки'], ['magic', 'Магия'], ['features', 'Умения'], ['items', 'Снаряжение'], ['subclasses', 'Подклассы']],
  spells: [['main', 'Основное'], ['casting', 'Накладывание'], ['effects', 'Урон и лечение'], ['access', 'Доступность']],
  backgrounds: [['main', 'Основное'], ['traits', 'Навыки и личность'], ['features', 'Умения'], ['items', 'Снаряжение']],
  feats: [['main', 'Основное'], ['requirements', 'Требования'], ['scaling', 'Растёт с уровнем'], ['static', 'Статичные эффекты'], ['choices', 'Выбор эффектов']],
  features: [['main', 'Основное'], ['scaling', 'Растёт с уровнем'], ['static', 'Статичные эффекты'], ['choices', 'Выбор эффектов']],
  weapons: [['main', 'Основное'], ['kind', 'Характеристики'], ['properties', 'Свойства']],
  armor: [['main', 'Основное'], ['kind', 'Характеристики'], ['effects', 'Влияние на КД и скорость']],
  // tools — без вкладок: всё на одной странице.
  gear: [['main', 'Основное'], ['effects', 'Влияние на КД и скорость']],
}

// Общие поля предмета (itemShared.js:coreFields) — во вкладке «Основное»,
// остальные поля оружия/доспеха — в «Характеристиках».
const ITEM_CORE_FIELDS = new Set(['name', 'rarity', 'weight', 'cost_gold', 'requires_attunement', 'description'])
const ITEM_KIND_RESOURCES = new Set(['weapons', 'armor'])

export function catalogFieldTab(resource, key) {
  if (resource === 'backgrounds' && key === 'starting_gold') return 'items'
  if (resource === 'feats' && key.startsWith('prerequisite_')) return 'requirements'
  if (ITEM_KIND_RESOURCES.has(resource)) return ITEM_CORE_FIELDS.has(key) ? 'main' : 'kind'
  if (resource !== 'spells') return 'main'
  if (key.startsWith('damage_') || key.startsWith('healing_') || ['attack_type', 'save_stat'].includes(key)) return 'effects'
  if (['cast_time', 'duration', 'is_concentration', 'is_ritual', 'range_type', 'range_value', 'material', 'is_material_consumed'].includes(key)) return 'casting'
  return 'main'
}

export function catalogSectionTab(resource, key) {
  if (!catalogEditorTabs[resource] || key === 'tags') return 'main'
  if (resource === 'spells') return key === 'components' ? 'casting' : 'access'
  // Узлы дерева эффектов — `effects-static` / `effects-choice` (section.part).
  if (['feats', 'features'].includes(resource)) return key === 'scaling' ? 'scaling' : key === 'effects-choice' ? 'choices' : 'static'
  if (resource === 'weapons' && key === 'property_ids') return 'properties'
  // React-ключ узла редактора эффектов — `item_effects-<id>` (пересоздаётся на смену предмета).
  if (key.startsWith('item_effects')) return 'effects'
  if (resource === 'classes' && ['spellcasting_ability', 'spell_slots'].includes(key)) return 'magic'
  return 'traits'
}
