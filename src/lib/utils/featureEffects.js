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

const isEffectGroups = (v) =>
  Array.isArray(v) && v.every((g) => g && typeof g === 'object' && 'effect_type' in g && Array.isArray(g.items))

// Бэк отдаёт эффекты вариантов выбора, выборов игрока и грантов как
// effects: [{ effect_type, items }] вместо шести плоских списков. Вызывается
// на каждом ответе в httpClient: рекурсивно дописывает рядом с effects
// плоские *_effects (сам effects не трогает), так что весь UI читает старые
// ключи. Мутирует только что распарсенный JSON — это безопасно.
export function flattenEffectGroups(data) {
  if (Array.isArray(data)) {
    data.forEach(flattenEffectGroups)
  } else if (data && typeof data === 'object') {
    Object.values(data).forEach(flattenEffectGroups)
    if (isEffectGroups(data.effects)) {
      for (const group of data.effects) {
        const key = STATIC_GROUP_TYPE_TO_KEY[group.effect_type]
        if (key && data[key] === undefined) data[key] = group.items
      }
    }
  }
  return data
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

// У SpellEffectItem остались только id и spell_id: школа, предел уровня,
// always_prepared и counts_against_known_limit из схемы убраны, и бэк отвечает
// 422 extra_forbidden, если прислать их вместе с заклинанием.
const toSpellEffect = ({ id, spell_id }) => ({
  id: id ?? null,
  spell_id: toNumOr(spell_id, null),
})

const TO_ITEM = {
  ability: toAbilityEffect,
  skill: toSkillEffect,
  saving_throw: toSavingThrowEffect,
  armor: toArmorEffect,
  weapon: toWeaponEffect,
  spell: toSpellEffect,
}

const withoutId = (row) => {
  const copy = { ...row }
  delete copy.id
  return copy
}

// Плоские списки -> [{ effect_type, items }] для POST (добавление строк):
// пустые типы не шлём вовсе, id новых строк не существует. onlyKey нужен для
// вариантов группы выбора — там разрешён ровно один тип эффекта.
function newEffectGroups(bundle = {}, onlyKey = null) {
  const fixed = normalizeEffects(bundle)
  return Object.entries(STATIC_GROUP_TYPE_TO_KEY)
    .filter(([, key]) => (onlyKey == null || key === onlyKey) && fixed[key].length > 0)
    .map(([effectType, key]) => ({
      effect_type: effectType,
      items: fixed[key].map(TO_ITEM[effectType]).map(withoutId),
    }))
}

// Какие поля строки реально изменились: объединяем ключи «до» и «после», чтобы
// переключение вида строки тоже доехало (например, у оружия item_id <->
// weapon_category — пропавшее поле надо явно занулить, а не просто не прислать).
function effectChanges(before, after) {
  const changes = {}
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (key === 'id') continue
    const from = before[key] ?? null
    const to = after[key] ?? null
    if (JSON.stringify(from) !== JSON.stringify(to)) changes[key] = to
  }
  return changes
}

// Дифф одного набора эффектов (шесть списков) — что удалить, что изменить и
// что добавить. Строки сопоставляются по id: его несут только те, что уже
// лежат в базе, всё остальное — новое.
function diffEffectBundle(prevBundle, nextBundle, onlyKey = null) {
  const prev = normalizeEffects(prevBundle)
  const next = normalizeEffects(nextBundle)
  const removed = []
  const changed = []
  const added = []
  for (const [effectType, key] of Object.entries(STATIC_GROUP_TYPE_TO_KEY)) {
    if (onlyKey != null && key !== onlyKey) continue
    const toItem = TO_ITEM[effectType]
    const prevRows = prev[key].map(toItem)
    const nextRows = next[key].map(toItem)
    const prevById = new Map(prevRows.filter((r) => r.id != null).map((r) => [r.id, r]))
    const kept = new Set()
    const newItems = []
    for (const row of nextRows) {
      const before = row.id != null ? prevById.get(row.id) : undefined
      if (!before) {
        newItems.push(withoutId(row))
        continue
      }
      kept.add(row.id)
      const changes = effectChanges(before, row)
      if (Object.keys(changes).length > 0) changed.push({ effectType, id: row.id, changes })
    }
    for (const row of prevRows) {
      if (row.id != null && !kept.has(row.id)) removed.push({ effectType, id: row.id })
    }
    if (newItems.length > 0) added.push({ effect_type: effectType, items: newItems })
  }
  return { removed, changed, added }
}

// Тело POST /choice-groups для новой группы: choice_type обязателен (без
// дефолта на бэке), варианты уезжают вместе с группой одним запросом.
function choiceGroupPayload(group, sortOrder) {
  const key = inferGroupEffectType(group)
  return {
    choice_type: KEY_TO_CHOICE_TYPE[key],
    pick_count: toNumOr(group.pick_count, 1) || 1,
    sort_order: sortOrder,
    options: (group.options ?? []).map((option, oi) => ({
      sort_order: oi,
      effects: newEffectGroups(option, key),
    })),
  }
}

// Правки строк одного набора эффектов. Сначала удаление (освобождает
// уникальные пары вроде «та же характеристика дважды»), потом правки, потом
// добавления одним POST.
async function applyBundleDiff(diff, { add, patch, remove }) {
  for (const row of diff.removed) await remove(row.effectType, row.id)
  for (const row of diff.changed) await patch(row.effectType, row.id, row.changes)
  if (diff.added.length > 0) await add({ static_groups: diff.added })
}

async function syncChoiceGroups(ops, featureId, prevGroups, nextGroups) {
  const prevById = new Map((prevGroups ?? []).filter((g) => g.id != null).map((g) => [g.id, g]))
  const kept = new Set()

  for (const [gi, group] of (nextGroups ?? []).entries()) {
    const before = group.id != null ? prevById.get(group.id) : undefined
    if (!before) {
      await ops.choiceGroups.create(featureId, choiceGroupPayload(group, gi))
      continue
    }
    kept.add(group.id)
    const key = inferGroupEffectType(before)
    const pickCount = toNumOr(group.pick_count, 1) || 1
    const groupPatch = {}
    if (pickCount !== before.pick_count) groupPatch.pick_count = pickCount
    if (gi !== (before.sort_order ?? 0)) groupPatch.sort_order = gi
    if (Object.keys(groupPatch).length > 0) await ops.choiceGroups.patch(featureId, group.id, groupPatch)

    const prevOptions = new Map((before.options ?? []).filter((o) => o.id != null).map((o) => [o.id, o]))
    const keptOptions = new Set()
    for (const [oi, option] of (group.options ?? []).entries()) {
      const prevOption = option.id != null ? prevOptions.get(option.id) : undefined
      if (!prevOption) {
        await ops.choiceGroups.options.create(featureId, group.id, {
          sort_order: oi,
          effects: newEffectGroups(option, key),
        })
        continue
      }
      keptOptions.add(option.id)
      if (oi !== (prevOption.sort_order ?? 0)) {
        await ops.choiceGroups.options.patch(featureId, group.id, option.id, { sort_order: oi })
      }
      await applyBundleDiff(diffEffectBundle(prevOption, option, key), {
        add: (body) => ops.choiceGroups.options.effects.add(featureId, group.id, option.id, body),
        patch: (effectType, effectId, body) =>
          ops.choiceGroups.options.effects.patch(featureId, group.id, option.id, effectType, effectId, body),
        remove: (effectType, effectId) =>
          ops.choiceGroups.options.effects.remove(featureId, group.id, option.id, effectType, effectId),
      })
    }
    for (const option of before.options ?? []) {
      if (option.id != null && !keptOptions.has(option.id)) {
        await ops.choiceGroups.options.remove(featureId, group.id, option.id)
      }
    }
  }

  for (const group of prevGroups ?? []) {
    if (group.id != null && !kept.has(group.id)) await ops.choiceGroups.remove(featureId, group.id)
  }
}

// Переносит дерево эффектов особенности из состояния prev в next точечными
// запросами: бэк больше не принимает замену всего дерева одним PUT, у него
// отдельные POST/PATCH/DELETE на строку эффекта, группу выбора и вариант.
// ops — api.features или api.feats (набор одинаковый, см. effectTreeOps).
export async function syncFeatureEffects(ops, featureId, prev = {}, next = {}) {
  await applyBundleDiff(diffEffectBundle(prev, next), {
    add: (body) => ops.effects.add(featureId, body),
    patch: (effectType, effectId, body) => ops.effects.patch(featureId, effectType, effectId, body),
    remove: (effectType, effectId) => ops.effects.remove(featureId, effectType, effectId),
  })
  await syncChoiceGroups(ops, featureId, prev.choice_groups ?? [], next.choice_groups ?? [])
}

export { diffEffectBundle, newEffectGroups }

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