export const STEPS = [
  { id: 'name', title: 'Имя' },
  { id: 'race', title: 'Раса' },
  { id: 'background', title: 'Предыстория' },
  { id: 'class', title: 'Класс' },
  { id: 'skills', title: 'Навыки' },
  { id: 'abilities', title: 'Характеристики' },
  { id: 'equipment', title: 'Снаряжение' },
  { id: 'summary', title: 'Сводка' },
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
  ability_sources: {},
  class_skill_ids: [],
  starting_choices: {},
  // Конкретный предмет для выбранного варианта-фильтра: { [option_id]: item_id }.
  item_choice_picks: {},
  suggestion_ids: [],
  name: '',
}

/**
 * All starting-equipment choice groups (class + background) flattened into
 * `{ group, source, gi }` entries. `source` is `'class' | 'background'`;
 * `gi` is the index within that source (so class and background indices never
 * collide in the `starting_choices` map, which is keyed `${source}:${gi}`).
 */
export function allChoiceGroups(classDetail, backgroundDetail) {
  const from = (source, detail) =>
    (detail?.starting_choice_groups ?? detail?.choice_groups ?? []).map((group, gi) => ({
      group,
      source,
      gi,
    }))
  return [...from('class', classDetail), ...from('background', backgroundDetail)]
}

/**
 * The flat list of chosen option ids (`SourceItemChoiceOption.id`) to send as
 * `item_choice_ids` when creating a character. Each entry is the id of a
 * selected option from a class/background choice group.
 */
export function buildItemChoiceIds(classDetail, backgroundDetail, startingChoices = {}) {
  const ids = []
  for (const { group, source, gi } of allChoiceGroups(classDetail, backgroundDetail)) {
    const chosen = new Set(startingChoices[`${source}:${gi}`] ?? [])
    for (const opt of group?.options ?? []) {
      const optId = Number(opt.id ?? opt.item_id)
      if (chosen.has(optId)) ids.push(optId)
    }
  }
  return ids
}

/** An option with no `item_id` is a filter ("any simple weapon"): the player names the item. */
export const isFilterOption = (opt) => opt?.item_id == null

const FILTER_FIELDS = ['kind', 'weapon_category', 'armor_category', 'tool_category']

/** `GET /items` params listing the candidates of a filter option (every set field must match). */
export const itemFilterParams = (opt) => ({
  ...Object.fromEntries(FILTER_FIELDS.filter((k) => opt?.[k] != null).map((k) => [k, opt[k]])),
  size: 100,
})

/**
 * `item_choice_picks` for character creation: `{ option_id, item_id }` for every
 * chosen filter option that has a picked item (`picks` = `{ [optionId]: itemId }`).
 */
export function buildItemChoicePicks(classDetail, backgroundDetail, startingChoices = {}, picks = {}) {
  const out = []
  for (const { group, source, gi } of allChoiceGroups(classDetail, backgroundDetail)) {
    const chosen = new Set(startingChoices[`${source}:${gi}`] ?? [])
    for (const opt of group?.options ?? []) {
      const optId = Number(opt.id)
      if (chosen.has(optId) && isFilterOption(opt) && picks[optId] != null) {
        out.push({ option_id: optId, item_id: Number(picks[optId]) })
      }
    }
  }
  return out
}

/**
 * Whether every choice group has the full `pick_count` of options selected and
 * every chosen filter option names a concrete item.
 * The backend rejects an incomplete character with 400.
 */
export function choiceGroupsComplete(classDetail, backgroundDetail, startingChoices = {}, picks = {}) {
  return allChoiceGroups(classDetail, backgroundDetail).every(({ group, source, gi }) => {
    const pick = Number(group?.pick_count) || 1
    const chosen = startingChoices[`${source}:${gi}`] ?? []
    if (chosen.length < pick) return false
    return (group?.options ?? []).every(
      (opt) => !isFilterOption(opt) || !chosen.includes(Number(opt.id)) || picks[Number(opt.id)] != null,
    )
  })
}

/**
 * Whether the player has picked one personality suggestion (trait/ideal/bond/
 * flaw) for every group the background actually offers. Groups with no
 * options (nothing to pick) don't block progress.
 */
export function suggestionGroupsComplete(backgroundDetail, suggestionIds = []) {
  const suggestions = (backgroundDetail?.suggestions ?? []).filter((s) => s.text)
  const types = new Set(suggestions.map((s) => s.suggestion_type))
  if (types.size === 0) return true
  const chosenTypes = new Set(
    suggestions.filter((s) => suggestionIds.map(Number).includes(Number(s.id))).map((s) => s.suggestion_type),
  )
  return [...types].every((t) => chosenTypes.has(t))
}
