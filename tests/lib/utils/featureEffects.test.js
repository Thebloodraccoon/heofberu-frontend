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
    const tree = normalizeEffectsTree({ choice_groups: [{ label: 'G' }] })
    expect(tree.choice_groups).toHaveLength(1)
  })
})

describe('buildFixedEffectsPayload', () => {
  it('normalizes amounts and strips ids from a GET-backed tree', () => {
    const payload = buildFixedEffectsPayload({
      ability_effects: [{ id: 1, ability: 'STR', amount: '2', new_cap: '' }],
      skill_effects: [{ id: 4, skill_id: 7, grants_expertise: true }],
      saving_throw_effects: [{ ability: 'DEX' }],
      armor_effects: [{ armor_type: 'LIGHT' }],
      weapon_effects: [{ weapon_category: 'MARTIAL', item_id: null }],
      spell_effects: [{ spell_id: 9, always_prepared: true, counts_against_known_limit: false }],
    })
    expect(payload.ability_effects).toEqual([{ ability: 'STR', amount: 2, new_cap: null }])
    expect(payload.skill_effects).toEqual([{ skill_id: 7, grants_expertise: true }])
    expect(payload.saving_throw_effects).toEqual([{ ability: 'DEX' }])
    expect(payload.armor_effects).toEqual([{ armor_type: 'LIGHT' }])
    expect(payload.weapon_effects).toEqual([{ weapon_category: 'MARTIAL' }])
    expect(payload.spell_effects).toEqual([
      { spell_id: 9, spell_school: null, spell_level_max: null, always_prepared: true, counts_against_known_limit: false },
    ])
  })

  it('switches weapon effect to a concrete item when item_id is set', () => {
    const payload = buildFixedEffectsPayload({
      weapon_effects: [{ weapon_category: null, item_id: 12 }],
    })
    expect(payload.weapon_effects).toEqual([{ item_id: 12 }])
  })

  it('always returns every one of the six lists (full-replace semantics)', () => {
    const payload = buildFixedEffectsPayload({})
    expect(Object.keys(payload)).toHaveLength(6)
    expect(payload.spell_effects).toEqual([])
  })
})

describe('buildChoiceGroupsPayload', () => {
  it('rebuilds the tree with sort orders and pruned option bundles', () => {
    const payload = buildChoiceGroupsPayload({
      choice_groups: [
        {
          id: 10,
          feature_id: 1,
          pick_count: 1,
          sort_order: 0,
          label: 'Выберите навык',
          options: [
            {
              id: 77,
              label: 'Скрытность',
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
    expect(group.id).toBeUndefined()
    expect(group.feature_id).toBeUndefined()
    expect(group.pick_count).toBe(1)
    expect(group.sort_order).toBe(0)
    const option = group.options[0]
    expect(option.id).toBeUndefined()
    expect(option.sort_order).toBe(0)
    expect(option.ability_effects).toEqual([{ ability: 'DEX', amount: 1, new_cap: null }])
    expect(option.skill_effects).toEqual([{ skill_id: 5, grants_expertise: false }])
    expect(option.weapon_effects).toEqual([])
    expect(option.spell_effects).toEqual([])
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
        { id: 1, pick_count: 1, label: 'G', options: [{ label: 'Скрытность' }, { label: 'Магия' }] },
      ],
    })
    const textOf = (key) => lines.find((l) => l.key === key)?.text ?? ''
    expect(textOf('ability')).toContain('Сила +2')
    expect(textOf('ability')).toContain('макс. 24')
    expect(textOf('saving')).toBe('Ловкость, Мудрость')
    expect(textOf('armor')).toBe('Лёгкие доспехи, Щит')
    expect(textOf('weapon')).toContain('Воинское оружие')
    expect(textOf('spell')).toBe('')
    expect(textOf('choice-1')).toContain('«Скрытность», «Магия»')
  })

  it('omits empty sections', () => {
    const lines = effectSummaryLines({})
    expect(lines).toEqual([])
  })
})

describe('effectBadges', () => {
  it('produces count-based badges and falls back asi to ability_effects', () => {
    expect(effectBadges({})).toEqual([])
    const badges = effectBadges({ choice_groups: [{}, {}], spell_effects: [{ spell_id: 1 }, { spell_id: 2 }] })
    const text = badges.map((b) => b.text)
    expect(text).toContain('Заклинания ×2')
    expect(text).toContain('Выбор ×2')
  })
})