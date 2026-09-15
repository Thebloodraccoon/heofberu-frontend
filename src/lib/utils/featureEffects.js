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

const STATIC_GROUP_TYPE_TO_KEY = {
  ability: 'ability_effects',
  skill: 'skill_effects',
  saving_throw: 'saving_throw_effects',
  armor: 'armor_effects',
  weapon: 'weapon_effects',
  spell: 'spell_effects',
}

// choice_groups[].choice_type (бэк, ChoiceType enum) <-> наш ключ одного из
// шести списков эффектов. Не путать со static_groups[].effect_type выше —
// это два разных поля для двух разных сущностей бэка.
export const CHOICE_TYPE_TO_KEY = {
  ABILITY_SCORE: 'ability_effects',
  SKILL: 'skill_effects',
  SAVING_THROW: 'saving_throw_effects',
  ARMOR: 'armor_effects',
  WEAPON: 'weapon_effects',
  SPELL: 'spell_effects',
}
const KEY_TO_CHOICE_TYPE = Object.fromEntries(
  Object.entries(CHOICE_TYPE_TO_KEY).map(([choiceType, key]) => [key, choiceType]),
)

// Тип эффекта одной группы выбора: с бэка приходит choice_type (enum-строка),
// локально (пока GM ещё не сохранил) — effect_type (наш ключ); если нет ни
// того ни другого — определяем по тому, какой список непустой хотя бы у
// одного варианта.
export function inferGroupEffectType(group = {}) {
  if (group.choice_type && CHOICE_TYPE_TO_KEY[group.choice_type]) return CHOICE_TYPE_TO_KEY[group.choice_type]
  if (group.effect_type) return group.effect_type
  for (const key of FIXED_LIST_KEYS) {
    if ((group.options ?? []).some((o) => (o[key] ?? []).length > 0)) return key
  }
  return FIXED_LIST_KEYS[0]
}

// Новый бэк группирует фиксированные эффекты в static_groups (по одной группе
// на effect_type) вместо шести плоских списков — раскладываем обратно в них,
// чтобы редактор и все расчёты (бейджи, резюме) не знали про эту разницу.
function fixedEffectsFromStaticGroups(groups = []) {
  const out = {}
  for (const group of groups) {
    const key = STATIC_GROUP_TYPE_TO_KEY[group?.effect_type]
    if (key) out[key] = group.items ?? []
  }
  return out
}

// Гарантирует, что дерево эффектов (из API или из формы) имеет все шесть
// списков и choice_groups — у старого бэка их может не быть вовсе. Плоские
// списки (старый формат) в приоритете, static_groups — как источник данных,
// когда бэк отдал только их.
export function normalizeEffects(tree = {}) {
  const fromGroups = Array.isArray(tree.static_groups) ? fixedEffectsFromStaticGroups(tree.static_groups) : {}
  return Object.fromEntries(FIXED_LIST_KEYS.map((key) => [key, tree[key] ?? fromGroups[key] ?? []]))
}

export function normalizeEffectsTree(tree = {}) {
  return { ...normalizeEffects(tree), choice_groups: tree.choice_groups ?? [] }
}

const toNumOr = (v, fallback) => (v === '' || v == null ? fallback : Number(v))

// id: пробрасываем как есть (число со старой строки — «обнови эту запись»,
// null/undefined с новой — «создай») — бэк теперь пишет diff-ом по id, а не
// full-replace: без этого правка стёрла бы и пересоздала вообще все строки,
// заодно необратимо сбрасывая в pending уже отвеченные игроками выборы,
// указывающие на них (CharacterFeatureChoice.choice_option_id).
const toAbilityEffect = ({ id, ability, amount, new_cap }) => ({
  id: id ?? null,
  ability,
  amount: toNumOr(amount, 0),
  new_cap: new_cap == null || new_cap === '' ? null : Number(new_cap),
})

const toSkillEffect = ({ id, skill_id, grants_expertise }) => ({
  id: id ?? null,
  skill_id: toNumOr(skill_id, null),
  grants_expertise: !!grants_expertise,
})

const toSavingThrowEffect = ({ id, ability }) => ({ id: id ?? null, ability })

const toArmorEffect = ({ id, armor_type }) => ({ id: id ?? null, armor_type })

const toWeaponEffect = ({ id, weapon_category, item_id }) =>
  item_id != null && item_id !== ''
    ? { id: id ?? null, item_id: Number(item_id) }
    : { id: id ?? null, weapon_category }

const toSpellEffect = ({ id, spell_id, spell_school, spell_level_max, always_prepared, counts_against_known_limit }) => ({
  id: id ?? null,
  spell_id: toNumOr(spell_id, null),
  spell_school: spell_school ?? null,
  spell_level_max: spell_level_max ?? null,
  always_prepared: always_prepared ?? true,
  counts_against_known_limit: counts_against_known_limit ?? false,
})

// Фиксированные эффекты для PUT /features/{id}/effects: бэк теперь diff-ит
// по id, поэтому всегда возвращаются все шесть списков (пустые — как
// "очистить"), но с сохранением id существующих строк.
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

// Группы выбора для PUT /features/{id}/choice-groups: бэк diff-ит группы и
// опции по id (создаёт без id, обновляет с существующим, удаляет то, что
// пропало из списка) — group.id/option.id обязательно нужно пробрасывать
// для уже существующих строк, иначе каждое сохранение будет удалять и
// пересоздавать вообще все группы/опции, сбрасывая в pending все уже
// отвеченные игроками выборы, которые на них указывали. choice_type
// обязателен у ChoiceGroupPayload (без дефолта на бэке) — без него запрос
// падает с 422 "Field required" на body.choice_groups.N.choice_type.
export function buildChoiceGroupsPayload(tree = {}) {
  return {
    choice_groups: (tree.choice_groups ?? []).map((group, gi) => ({
      id: group.id ?? null,
      choice_type: KEY_TO_CHOICE_TYPE[inferGroupEffectType(group)],
      pick_count: toNumOr(group.pick_count, 1) || 1,
      sort_order: gi,
      options: (group.options ?? []).map((option, oi) => ({
        id: option.id ?? null,
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

  ;(feature.choice_groups ?? []).forEach((group, gi) => {
    const count = (group.options ?? []).length
    const pick = group.pick_count ?? 1
    lines.push({
      key: `choice-${group.id ?? gi}`,
      label: 'Выбор',
      text: `выбрать ${pick} из ${count}`,
    })
  })

  return lines
}

const hasAnyFixedEffect = (feature) =>
  FIXED_LIST_KEYS.some((key) => (feature[key] ?? []).length > 0) ||
  (feature.ability_score_increases ?? []).length > 0

// Компактные бейджи для списков особенностей (GmEditorPage) — ровно два
// бейджа рядом с названием: «Даёт эффекты» и «Выбор». Источник — флаги
// has_static_effects/has_choices, которые бэк считает для любой особенности
// (в т.ч. в коротких карточках справочника, без полного дерева эффектов);
// если бэк их не прислал (старые данные), выводим их из самого дерева.
export function effectBadges(feature = {}) {
  const badges = []
  const hasStatic = feature.has_static_effects ?? hasAnyFixedEffect(feature)
  const hasChoices = feature.has_choices ?? (feature.choice_groups ?? []).length > 0
  if (hasStatic) badges.push({ text: 'Даёт эффекты', tone: 'good' })
  if (hasChoices) badges.push({ text: 'Выбор', tone: 'violet' })
  return badges
}