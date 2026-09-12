import {
  abilityLabels,
  armorProficiencyLabels,
  weaponProficiencyLabels,
} from '@/lib/i18n/index.js'

const FIXED_LIST_KEYS = [
  'ability_effects',
  'skill_effects',
  'saving_throw_effects',
  'armor_effects',
  'weapon_effects',
  'spell_effects',
]

export const EMPTY_EFFECTS = {
  ability_effects: [],
  skill_effects: [],
  saving_throw_effects: [],
  armor_effects: [],
  weapon_effects: [],
  spell_effects: [],
}

// Гарантирует, что дерево эффектов (из API или из формы) имеет все шесть
// списков и choice_groups — у старого бэка их может не быть вовсе.
export function normalizeEffects(tree = {}) {
  return Object.fromEntries(FIXED_LIST_KEYS.map((key) => [key, tree[key] ?? []]))
}

export function normalizeEffectsTree(tree = {}) {
  return { ...normalizeEffects(tree), choice_groups: tree.choice_groups ?? [] }
}

const toNumOr = (v, fallback) => (v === '' || v == null ? fallback : Number(v))

const toAbilityEffect = ({ ability, amount, new_cap }) => ({
  ability,
  amount: toNumOr(amount, 0),
  new_cap: new_cap == null || new_cap === '' ? null : Number(new_cap),
})

const toSkillEffect = ({ skill_id, grants_expertise }) => ({
  skill_id: toNumOr(skill_id, null),
  grants_expertise: !!grants_expertise,
})

const toSavingThrowEffect = ({ ability }) => ({ ability })

const toArmorEffect = ({ armor_type }) => ({ armor_type })

const toWeaponEffect = ({ weapon_category, item_id }) =>
  item_id != null && item_id !== ''
    ? { item_id: Number(item_id) }
    : { weapon_category }

const toSpellEffect = ({ spell_id, spell_school, spell_level_max, always_prepared, counts_against_known_limit }) => ({
  spell_id: toNumOr(spell_id, null),
  spell_school: spell_school ?? null,
  spell_level_max: spell_level_max ?? null,
  always_prepared: always_prepared ?? true,
  counts_against_known_limit: counts_against_known_limit ?? false,
})

// Фиксированные эффекты для PUT /features/{id}/effects: полная замена, поэтому
// всегда возвращаются все шесть списков (пустые — как "очистить"). Срезаются
// служебные поля (id/feature_id), которые приходят из GET-дерева.
export function buildFixedEffectsPayload(effects = {}) {
  const fixed = normalizeEffects(effects)
  return {
    ability_effects: fixed.ability_effects.map(toAbilityEffect),
    skill_effects: fixed.skill_effects.map(toSkillEffect),
    saving_throw_effects: fixed.saving_throw_effects.map(toSavingThrowEffect),
    armor_effects: fixed.armor_effects.map(toArmorEffect),
    weapon_effects: fixed.weapon_effects.map(toWeaponEffect),
    spell_effects: fixed.spell_effects.map(toSpellEffect),
  }
}

// Группы выбора для PUT /features/{id}/choice-groups: полная замена дерева.
export function buildChoiceGroupsPayload(tree = {}) {
  return {
    choice_groups: (tree.choice_groups ?? []).map((group, gi) => ({
      pick_count: toNumOr(group.pick_count, 1) || 1,
      sort_order: gi,
      label: group.label ?? '',
      options: (group.options ?? []).map((option, oi) => ({
        label: option.label ?? '',
        sort_order: oi,
        ...buildFixedEffectsPayload(option),
      })),
    })),
  }
}

const label = (map, value, fallback) =>
  value != null ? (map[value] ?? String(value)) : fallback

// Краткое человекочитаемое резюме дерева эффектов для карточек каталога
// (детальная карточка особенности/черты и бейджи списков).
export function effectSummaryLines(feature = {}) {
  const fixed = normalizeEffects(feature)
  const lines = []

  const abilityText = fixed.ability_effects
    .map((a) => {
      const name = label(abilityLabels, a.ability, a.ability)
      const suffix = a.amount != null ? `${a.amount > 0 ? '+' : ''}${a.amount}` : ''
      const cap = a.new_cap != null ? ` (макс. ${a.new_cap})` : ''
      return `${name} ${suffix}${cap}`
    })
    .join(' ')
  if (abilityText) lines.push({ key: 'ability', label: 'Увеличение характеристик', text: abilityText })

  const skillsText = fixed.skill_effects
    .map((s) => `навык #${s.skill_id}`)
    .join(', ')
  if (skillsText) lines.push({ key: 'skill', label: 'Навыки', text: skillsText })

  const savesText = fixed.saving_throw_effects
    .map((s) => label(abilityLabels, s.ability, s.ability))
    .join(', ')
  if (savesText) lines.push({ key: 'saving', label: 'Спасброски', text: savesText })

  const armorText = fixed.armor_effects
    .map((a) => label(armorProficiencyLabels, a.armor_type, a.armor_type))
    .join(', ')
  if (armorText) lines.push({ key: 'armor', label: 'Владение доспехами', text: armorText })

  const weaponsText = fixed.weapon_effects
    .map((w) => (w.item_id != null ? `конкретное оружие` : label(weaponProficiencyLabels, w.weapon_category, w.weapon_category)))
    .join(', ')
  if (weaponsText) lines.push({ key: 'weapon', label: 'Владение оружием', text: weaponsText })

  const spellsText = fixed.spell_effects
    .map((s) => (s.spell_id != null ? `заклинание #${s.spell_id}` : 'заклинание (фильтр)'))
    .join(', ')
  if (spellsText) lines.push({ key: 'spell', label: 'Заклинания', text: spellsText })

  for (const group of feature.choice_groups ?? []) {
    const names = (group.options ?? []).map((o) => (o.label ? `«${o.label}»` : 'вариант')).join(', ')
    const pick = group.pick_count ?? 1
    lines.push({ key: `choice-${group.id ?? names}`, label: 'Выбор', text: `выбрать ${pick} из ${names}` })
  }

  return lines
}

// Компактные бейджи для списков особенностей (GmEditorPage) — показывают тип
// эффекта и количество, когда бэк отдал дерево вместе со строкой списка.
export function effectBadges(feature = {}) {
  const fixed = normalizeEffects(feature)
  const count = (arr) => (Array.isArray(arr) ? arr.length : 0)
  const badges = []
  const add = (n, text) => {
    if (n > 0) badges.push({ text: n > 1 ? `${text} ×${n}` : text, tone: 'good' })
  }
  const asi = Array.isArray(feature.ability_score_increases) ? feature.ability_score_increases.length : 0
  add(asi || count(fixed.ability_effects), 'Характеристики')
  add(count(fixed.skill_effects), 'Навыки')
  add(count(fixed.saving_throw_effects), 'Спасброски')
  add(count(fixed.armor_effects), 'Доспехи')
  add(count(fixed.weapon_effects), 'Оружие')
  add(count(fixed.spell_effects), 'Заклинания')
  add((feature.choice_groups ?? []).length, 'Выбор')
  return badges
}