import { describe, expect, it } from 'vitest'
import {
  buildChoiceGroupsPayload,
  buildFixedEffectsPayload,
  effectBadges,
  effectSummaryLines,
  normalizeEffects,
  normalizeEffectsTree,
} from '@/lib/utils/featureEffects.js'

describe('normalizeEffects', () => {
  it('fills every fixed list with defaults when the tree is missing or partial', () => {
    const empty = normalizeEffects()
    expect(Object.keys(empty)).toEqual([
      'ability_effects',
      'skill_effects',
      'saving_throw_effects',
      'armor_effects',
      'weapon_effects',
      'spell_effects',
    ])
    expect(empty.ability_effects).toEqual([])
    const partial = normalizeEffects({ ability_effects: [{ ability: 'STR', amount: 2 }] })
    expect(partial.ability_effects).toHaveLength(1)
    expect(partial.weapon_effects).toEqual([])
  })

  it('normalizeEffectsTree also defaults choice_groups and keeps provided ones', () => {
    expect(normalizeEffectsTree().choice_groups).toEqual([])
    const tree = normalizeEffectsTree({ choice_groups: [{ pick_count: 1 }] })
    expect(tree.choice_groups).toHaveLength(1)
  })
})

describe('buildFixedEffectsPayload', () => {
  it('normalizes amounts and preserves row ids from a GET-backed tree (backend diffs writes by id)', () => {
    const payload = buildFixedEffectsPayload({
      ability_effects: [{ id: 1, ability: 'STR', amount: '2', new_cap: '' }],
      skill_effects: [{ id: 4, skill_id: 7, grants_expertise: true }],
      saving_throw_effects: [{ ability: 'DEX' }],
      armor_effects: [{ armor_type: 'LIGHT' }],
      weapon_effects: [{ weapon_category: 'MARTIAL', item_id: null }],
      spell_effects: [{ spell_id: 9, always_prepared: true, counts_against_known_limit: false }],
    })
    expect(payload.ability_effects).toEqual([{ id: 1, ability: 'STR', amount: 2, new_cap: null }])
    expect(payload.skill_effects).toEqual([{ id: 4, skill_id: 7, grants_expertise: true }])
    // Строки без id (только что добавленные в редакторе) идут как id: null —
    // бэк создаёт новую строку.
    expect(payload.saving_throw_effects).toEqual([{ id: null, ability: 'DEX' }])
    expect(payload.armor_effects).toEqual([{ id: null, armor_type: 'LIGHT' }])
    expect(payload.weapon_effects).toEqual([{ id: null, weapon_category: 'MARTIAL' }])
    expect(payload.spell_effects).toEqual([
      {
        id: null,
        spell_id: 9,
        spell_school: null,
        spell_level_max: null,
        always_prepared: true,
        counts_against_known_limit: false,
      },
    ])
  })

  it('switches weapon effect to a concrete item when item_id is set', () => {
    const payload = buildFixedEffectsPayload({
      weapon_effects: [{ weapon_category: null, item_id: 12 }],
    })
    expect(payload.weapon_effects).toEqual([{ id: null, item_id: 12 }])
  })

  it('always returns every one of the six lists (diff-by-id semantics — empty clears a type)', () => {
    const payload = buildFixedEffectsPayload({})
    expect(Object.keys(payload)).toHaveLength(6)
    expect(payload.spell_effects).toEqual([])
  })
})

describe('buildChoiceGroupsPayload', () => {
  it('preserves group/option/effect-row ids so the backend diff updates in place instead of recreating everything', () => {
    const payload = buildChoiceGroupsPayload({
      choice_groups: [
        {
          id: 10,
          feature_id: 1,
          pick_count: 1,
          sort_order: 0,
          options: [
            {
              id: 77,
              sort_order: 0,
              ability_effects: [{ id: 3, ability: 'DEX', amount: 1, new_cap: null }],
              skill_effects: [{ id: 8, skill_id: 5, grants_expertise: false }],
            },
          ],
        },
      ],
    })
    expect(payload.choice_groups).toHaveLength(1)
    const group = payload.choice_groups[0]
    // group.id — preserved (existing row, backend updates it in place).
    expect(group.id).toBe(10)
    expect(group.feature_id).toBeUndefined()
    expect(group.pick_count).toBe(1)
    expect(group.sort_order).toBe(0)
    expect(group.label).toBeUndefined()
    // choice_type обязателен у ChoiceGroupPayload на бэке (без дефолта) —
    // 422 "Field required", если его нет; определяется по непустому списку
    // эффектов у опций (тут — ability_effects, значит ABILITY_SCORE).
    expect(group.choice_type).toBe('ABILITY_SCORE')
    const option = group.options[0]
    expect(option.id).toBe(77)
    expect(option.sort_order).toBe(0)
    expect(option.label).toBeUndefined()
    expect(option.ability_effects).toEqual([{ id: 3, ability: 'DEX', amount: 1, new_cap: null }])
    expect(option.skill_effects).toEqual([{ id: 8, skill_id: 5, grants_expertise: false }])
    expect(option.weapon_effects).toEqual([])
    expect(option.spell_effects).toEqual([])
  })

  it('sends id: null for a newly added group/option so the backend creates rather than diffs', () => {
    const payload = buildChoiceGroupsPayload({
      choice_groups: [
        {
          pick_count: 1,
          choice_type: 'ABILITY_SCORE',
          options: [{ ability_effects: [{ ability: 'STR', amount: 1 }] }],
        },
      ],
    })
    const group = payload.choice_groups[0]
    expect(group.id).toBeNull()
    expect(group.options[0].id).toBeNull()
    expect(group.options[0].ability_effects[0].id).toBeNull()
  })

  it('derives choice_type from the backend GET field on an existing group', () => {
    const payload = buildChoiceGroupsPayload({
      choice_groups: [
        {
          choice_type: 'SAVING_THROW',
          pick_count: 1,
          label: '',
          options: [{ saving_throw_effects: [{ ability: 'DEX' }] }, { saving_throw_effects: [{ ability: 'CON' }] }],
        },
      ],
    })
    expect(payload.choice_groups[0].choice_type).toBe('SAVING_THROW')
  })
})

describe('effectSummaryLines', () => {
  it('renders human-readable lines for each effect type', () => {
    const lines = effectSummaryLines({
      ability_effects: [{ ability: 'STR', amount: 2, new_cap: 24 }],
      saving_throw_effects: [{ ability: 'DEX' }, { ability: 'WIS' }],
      armor_effects: [{ armor_type: 'LIGHT' }, { armor_type: 'SHIELD' }],
      weapon_effects: [{ weapon_category: 'MARTIAL' }],
      choice_groups: [
        { id: 1, pick_count: 1, options: [{ ability_effects: [] }, { ability_effects: [] }] },
      ],
    })
    const textOf = (key) => lines.find((l) => l.key === key)?.text ?? ''
    expect(textOf('ability')).toContain('Сила +2')
    expect(textOf('ability')).toContain('макс. 24')
    expect(textOf('saving')).toBe('Ловкость, Мудрость')
    expect(textOf('armor')).toBe('Лёгкие доспехи, Щит')
    expect(textOf('weapon')).toContain('Воинское оружие')
    expect(textOf('spell')).toBe('')
    expect(textOf('choice-1')).toBe('выбрать 1 из 2')
  })

  it('omits empty sections', () => {
    const lines = effectSummaryLines({})
    expect(lines).toEqual([])
  })
})

describe('effectBadges', () => {
  it('returns nothing when a feature has neither effects nor choices', () => {
    expect(effectBadges({})).toEqual([])
  })

  it('uses has_static_effects/has_choices as the single source of truth', () => {
    const badges = effectBadges({
      has_static_effects: true,
      has_choices: true,
      // Полное дерево эффектов игнорируется — бейджей должно быть ровно два.
      ability_effects: [{ ability: 'STR', amount: 1 }],
      choice_groups: [{}, {}],
      spell_effects: [{ spell_id: 1 }],
    })
    const text = badges.map((b) => b.text)
    expect(text).toEqual(['Даёт эффекты', 'Выбор'])
  })

  it('falls back to deriving the flags from the effect tree when the backend omits them', () => {
    const badges = effectBadges({ ability_effects: [{ ability: 'STR', amount: 1 }], choice_groups: [{}] })
    const text = badges.map((b) => b.text)
    expect(text).toEqual(['Даёт эффекты', 'Выбор'])
  })

  it('respects an explicit false flag even when the effect tree would suggest otherwise', () => {
    const badges = effectBadges({ has_static_effects: false, has_choices: false, ability_effects: [{ ability: 'STR', amount: 1 }] })
    expect(badges).toEqual([])
  })
})