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

/**
 * Whether every choice group has the full `pick_count` of options selected.
 * The backend rejects an incomplete character with 400.
 */
export function choiceGroupsComplete(classDetail, backgroundDetail, startingChoices = {}) {
  return allChoiceGroups(classDetail, backgroundDetail).every(({ group, source, gi }) => {
    const pick = Number(group?.pick_count) || 1
    return (startingChoices[`${source}:${gi}`] ?? []).length >= pick
  })
}
