import {
  abilityLabels,
  anyArmorLabels,
  anyToolLabels,
  anyWeaponLabels,
  armorProficiencyLabels,
  choiceKindLabels,
  effectConditionLabels,
  skillEffectModeSuffix,
  speedTypeLabels,
  weaponProficiencyLabels,
} from '@/lib/i18n/index.js'
import { describeOpenSpell } from '@/lib/utils/spellFilter.js'

// Хвост условия эффекта скорости/КД: « (без доспеха, с 5 ур.)».
function conditionSuffix({ condition, min_level }) {
  const parts = [
    condition && condition !== 'NONE' ? (effectConditionLabels[condition] ?? condition).toLowerCase() : null,
    min_level ? `с ${min_level} ур.` : null,
  ].filter(Boolean)
  return parts.length > 0 ? ` (${parts.join(', ')})` : ''
}

const signed = (n) => `${Number(n) > 0 ? '+' : ''}${Number(n) || 0}`

// Инструмент: конкретный (item_id) или открытый «любой [категории]».
export function describeToolEffect(r = {}, itemNames = {}) {
  if (r.item_id != null) return itemNames[r.item_id] ?? `инструмент #${r.item_id}`
  return anyToolLabels[r.tool_category ?? ''] ?? anyToolLabels['']
}

export function describeSpeedEffect(r = {}) {
  const type = speedTypeLabels[r.speed_type ?? 'WALK'] ?? r.speed_type
  const tail = conditionSuffix(r)
  switch (r.mode ?? 'BONUS') {
    case 'SET':
      return `${type}: не меньше ${r.value} фт.${tail}`
    case 'EQUAL_TO_WALK':
      return `${type}: равна скорости ходьбы${tail}`
    case 'IGNORE_ARMOR_PENALTY':
      return `Тяжёлый доспех не снижает скорость${tail}`
    default:
      return `${type} ${signed(r.value)} фт.${tail}`
  }
}

export function describeArmorClassEffect(r = {}) {
  const tail = conditionSuffix(r)
  if (r.mode === 'FORMULA') {
    const parts = [String(Number(r.value) || 0), ...(r.abilities ?? []).map((a) => abilityLabels[a] ?? a)]
    const shield = r.allows_shield === false ? ', без щита' : ''
    return `КД = ${parts.join(' + ')}${shield}${tail}`
  }
  return `КД ${signed(r.value)}${tail}`
}

// Вариант стартового снаряжения без item_id — фильтр «любое простое оружие»,
// «любой музыкальный инструмент»; все заданные поля фильтра должны совпасть.
export function describeItemFilter({ kind, weapon_category, armor_category, tool_category } = {}) {
  if (weapon_category || kind === 'WEAPON') return anyWeaponLabels[weapon_category ?? ''] ?? anyWeaponLabels['']
  if (armor_category || kind === 'ARMOR') return anyArmorLabels[armor_category ?? ''] ?? anyArmorLabels['']
  if (tool_category || kind === 'TOOL') return anyToolLabels[tool_category ?? ''] ?? anyToolLabels['']
  return 'любой предмет'
}

// Человекочитаемое описание одного эффект-бандла (PendingChoiceOption /
// ChosenOptionResponse — оба несут effects: [{ effect_type, items }], которые
// httpClient раскладывает в шесть плоских *_effects) — общее для модалки «Выборы» (ожидающие) и секции «Выборы
// способностей» на листе персонажа (уже отвеченные).

// Отвеченный выбор несёт то, что игрок назвал для открытого варианта:
// picked_ability (характеристика/спасбросок), picked_skill_id, picked_spell_id,
// picked_item_id (инструмент) — подставляем вместо «любой на выбор». Названо
// всегда одно, поэтому достаётся только первому открытому эффекту варианта.
function bundleRows(bundle) {
  const fill = (key, value) => {
    let used = false
    return (r) => {
      if (used || value == null || r[key] != null) return r
      used = true
      return { ...r, [key]: value }
    }
  }
  const picked = fill('ability', bundle.picked_ability)
  const skill = fill('skill_id', bundle.picked_skill_id)
  const tool = fill('item_id', bundle.picked_item_id)
  const spell = fill('spell_id', bundle.picked_spell_id)
  return [
    ...(bundle.ability_effects ?? []).map((r) => ({ type: 'ability', r: picked(r) })),
    ...(bundle.skill_effects ?? []).map((r) => ({ type: 'skill', r: skill(r) })),
    ...(bundle.saving_throw_effects ?? []).map((r) => ({ type: 'saving', r: picked(r) })),
    ...(bundle.armor_effects ?? []).map((r) => ({ type: 'armor', r })),
    ...(bundle.weapon_effects ?? []).map((r) => ({ type: 'weapon', r })),
    ...(bundle.tool_effects ?? []).map((r) => ({ type: 'tool', r: tool(r) })),
    ...(bundle.spell_effects ?? []).map((r) => ({ type: 'spell', r: spell(r) })),
    ...(bundle.speed_effects ?? []).map((r) => ({ type: 'speed', r })),
    ...(bundle.armor_class_effects ?? []).map((r) => ({ type: 'armor_class', r })),
  ]
}

function describeRow({ type, r }, { skillNames = {}, spellNames = {}, itemNames = {} } = {}) {
  switch (type) {
    case 'ability': {
      const name = r.ability == null ? 'любая характеристика на выбор' : (abilityLabels[r.ability] ?? r.ability)
      const amount = r.amount
      const suffix = amount != null ? ` ${amount > 0 ? '+' : ''}${amount}` : ''
      const cap = r.new_cap != null ? ` (макс. ${r.new_cap})` : ''
      return `${name}${suffix}${cap}`
    }
    case 'skill': {
      const name = r.skill_id != null ? (skillNames[r.skill_id] ?? `навык #${r.skill_id}`) : 'любой навык на выбор'
      return `${name}${skillEffectModeSuffix[r.mode] ?? ''}`
    }
    case 'saving':
      return r.ability == null ? 'любой спасбросок на выбор' : (abilityLabels[r.ability] ?? r.ability)
    case 'armor':
      return r.item_id != null
        ? (itemNames[r.item_id] ?? `доспех #${r.item_id}`)
        : (armorProficiencyLabels[r.armor_type] ?? r.armor_type)
    case 'weapon':
      return r.item_id != null
        ? (itemNames[r.item_id] ?? `оружие #${r.item_id}`)
        : (weaponProficiencyLabels[r.weapon_category] ?? r.weapon_category)
    case 'spell': {
      // В грантах персонажа заклинание приходит полным CharacterSpell.
      if (r.name) return r.name
      if (r.spell_id != null) return spellNames[r.spell_id] ?? `заклинание #${r.spell_id}`
      return describeOpenSpell(r)
    }
    case 'tool':
      return describeToolEffect(r, itemNames)
    case 'speed':
      return describeSpeedEffect(r)
    case 'armor_class':
      return describeArmorClassEffect(r)
    default:
      return ''
  }
}

// Вид выбора («Навык», «Инструмент»…) по первому непустому типу эффектов варианта.
export function describeChoiceKind(bundle) {
  const [first] = bundleRows(bundle)
  return first ? (choiceKindLabels[first.type] ?? first.type) : '—'
}

// Все id предметов, которые упоминает бандл (доспехи, оружие, инструменты и
// названный игроком инструмент) — чтобы подтянуть их названия одним запросом.
export function bundleItemIds(bundle) {
  return [
    ...(bundle.armor_effects ?? []),
    ...(bundle.weapon_effects ?? []),
    ...(bundle.tool_effects ?? []),
  ]
    .map((r) => r.item_id)
    .concat(bundle.picked_item_id ?? [])
    .filter((id) => id != null)
}

// То же по частям — по строке на эффект (плашки в карточке варианта).
export const describeEffectParts = (bundle, names) => bundleRows(bundle).map((row) => describeRow(row, names))

export function describeEffectBundle(bundle, names) {
  const parts = describeEffectParts(bundle, names)
  return parts.length > 0 ? parts.join(', ') : '—'
}
