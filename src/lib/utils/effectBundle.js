import {
  abilityLabels,
  armorProficiencyLabels,
  skillEffectModeSuffix,
  weaponProficiencyLabels,
} from '@/lib/i18n/index.js'
import { describeOpenSpell } from '@/lib/utils/spellFilter.js'

// Человекочитаемое описание одного эффект-бандла (PendingChoiceOption /
// ChosenOptionResponse — оба несут effects: [{ effect_type, items }], которые
// httpClient раскладывает в шесть плоских *_effects) — общее для модалки «Выборы» (ожидающие) и секции «Выборы
// способностей» на листе персонажа (уже отвеченные).

function bundleRows(bundle) {
  return [
    ...(bundle.ability_effects ?? []).map((r) => ({ type: 'ability', r })),
    ...(bundle.skill_effects ?? []).map((r) => ({ type: 'skill', r })),
    ...(bundle.saving_throw_effects ?? []).map((r) => ({ type: 'saving', r })),
    ...(bundle.armor_effects ?? []).map((r) => ({ type: 'armor', r })),
    ...(bundle.weapon_effects ?? []).map((r) => ({ type: 'weapon', r })),
    ...(bundle.spell_effects ?? []).map((r) => ({ type: 'spell', r })),
  ]
}

function describeRow({ type, r }, { skillNames = {}, spellNames = {}, itemNames = {} } = {}) {
  switch (type) {
    case 'ability': {
      const name = abilityLabels[r.ability] ?? r.ability
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
      return abilityLabels[r.ability] ?? r.ability
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
    default:
      return ''
  }
}

export function describeEffectBundle(bundle, names) {
  const rows = bundleRows(bundle)
  return rows.length > 0 ? rows.map((row) => describeRow(row, names)).join(', ') : '—'
}
