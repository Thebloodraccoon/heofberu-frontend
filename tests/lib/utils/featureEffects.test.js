import { describe, expect, it } from 'vitest'
import {
  effectBadges,
  effectSummaryLines,
  flattenEffectGroups,
  normalizeEffects,
  normalizeEffectsTree,
  syncFeatureEffects,
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

describe('flattenEffectGroups', () => {
  it('adds flat *_effects next to every nested effects: [{ effect_type, items }] and keeps effects', () => {
    const data = flattenEffectGroups({
      choice_groups: [
        {
          options: [
            { id: 1, effects: [{ effect_type: 'ability', items: [{ id: 5, ability: 'STR', amount: 1 }] }] },
            { id: 2, effects: [] },
          ],
        },
      ],
    })
    const [withAbility, empty] = data.choice_groups[0].options
    expect(withAbility.ability_effects).toEqual([{ id: 5, ability: 'STR', amount: 1 }])
    expect(withAbility.effects).toHaveLength(1)
    expect(empty.ability_effects).toBeUndefined()
  })

  it('leaves non-effect data and primitives alone', () => {
    expect(flattenEffectGroups(null)).toBeNull()
    expect(flattenEffectGroups('x')).toBe('x')
    expect(flattenEffectGroups([{ effects: [1, 2] }])).toEqual([{ effects: [1, 2] }])
  })
})

function mockOps() {
  const calls = []
  const rec = (name) => (...args) => {
    calls.push([name, ...args])
    return Promise.resolve()
  }
  return {
    calls,
    effects: { add: rec('effects.add'), patch: rec('effects.patch'), remove: rec('effects.remove') },
    choiceGroups: {
      create: rec('groups.create'),
      patch: rec('groups.patch'),
      remove: rec('groups.remove'),
      options: {
        create: rec('options.create'),
        patch: rec('options.patch'),
        remove: rec('options.remove'),
        effects: {
          add: rec('optionEffects.add'),
          patch: rec('optionEffects.patch'),
          remove: rec('optionEffects.remove'),
        },
      },
    },
  }
}

const FEATURE_ID = 7

describe('syncFeatureEffects: fixed effects', () => {
  it('adds the rows the editor gained with one POST and without ids', async () => {
    const ops = mockOps()
    await syncFeatureEffects(ops, FEATURE_ID, {}, {
      ability_effects: [{ ability: 'STR', amount: '2', new_cap: '' }],
      armor_effects: [{ armor_type: 'LIGHT' }],
    })
    expect(ops.calls).toEqual([
      ['effects.add', FEATURE_ID, {
        static_groups: [
          { effect_type: 'ability', items: [{ ability: 'STR', amount: 2, new_cap: null }] },
          { effect_type: 'armor', items: [{ armor_type: 'LIGHT' }] },
        ],
      }],
    ])
  })

  it('sends a spell row as spell_id alone (the rest of the fields are rejected by the backend)', async () => {
    const ops = mockOps()
    await syncFeatureEffects(ops, FEATURE_ID, {}, {
      spell_effects: [{ spell_id: 1, spell_school: 'EVOCATION', always_prepared: true }],
    })
    expect(ops.calls).toEqual([
      ['effects.add', FEATURE_ID, { static_groups: [{ effect_type: 'spell', items: [{ spell_id: 1 }] }] }],
    ])
  })

  it('patches only the fields that changed on an existing row', async () => {
    const ops = mockOps()
    await syncFeatureEffects(
      ops,
      FEATURE_ID,
      { ability_effects: [{ id: 3, ability: 'STR', amount: 1, new_cap: null }] },
      { ability_effects: [{ id: 3, ability: 'STR', amount: 2, new_cap: null }] },
    )
    expect(ops.calls).toEqual([['effects.patch', FEATURE_ID, 'ability', 3, { amount: 2 }]])
  })

  it('nulls the field a row stopped using (weapon category -> concrete item)', async () => {
    const ops = mockOps()
    await syncFeatureEffects(
      ops,
      FEATURE_ID,
      { weapon_effects: [{ id: 9, weapon_category: 'MARTIAL' }] },
      { weapon_effects: [{ id: 9, item_id: 12 }] },
    )
    expect(ops.calls).toEqual([
      ['effects.patch', FEATURE_ID, 'weapon', 9, { weapon_category: null, item_id: 12 }],
    ])
  })

  it('deletes the row that disappeared and leaves the rest alone', async () => {
    const ops = mockOps()
    const kept = { id: 1, skill_id: 5, grants_expertise: false }
    await syncFeatureEffects(
      ops,
      FEATURE_ID,
      { skill_effects: [kept, { id: 2, skill_id: 6, grants_expertise: false }] },
      { skill_effects: [kept] },
    )
    expect(ops.calls).toEqual([['effects.remove', FEATURE_ID, 'skill', 2]])
  })

  it('sends nothing at all when the tree did not change', async () => {
    const ops = mockOps()
    const tree = normalizeEffectsTree({ armor_effects: [{ id: 4, armor_type: 'HEAVY' }] })
    await syncFeatureEffects(ops, FEATURE_ID, tree, tree)
    expect(ops.calls).toEqual([])
  })
})

describe('syncFeatureEffects: choice groups', () => {
  it('creates a brand-new group with its options in one POST, with the choice_type the backend requires', async () => {
    const ops = mockOps()
    await syncFeatureEffects(ops, FEATURE_ID, {}, {
      choice_groups: [
        { pick_count: 1, options: [{ ability_effects: [{ ability: 'STR', amount: 1 }] }] },
      ],
    })
    expect(ops.calls).toEqual([
      ['groups.create', FEATURE_ID, {
        choice_type: 'ABILITY_SCORE',
        pick_count: 1,
        sort_order: 0,
        options: [
          {
            sort_order: 0,
            effects: [{ effect_type: 'ability', items: [{ ability: 'STR', amount: 1, new_cap: null }] }],
          },
        ],
      }],
    ])
  })

  it('patches the group, edits an option effect, adds the new option and drops the removed one', async () => {
    const ops = mockOps()
    const prev = {
      choice_groups: [
        {
          id: 10,
          choice_type: 'SKILL',
          pick_count: 1,
          sort_order: 0,
          options: [
            { id: 77, sort_order: 0, skill_effects: [{ id: 8, skill_id: 5, grants_expertise: false }] },
            { id: 78, sort_order: 1, skill_effects: [] },
          ],
        },
      ],
    }
    const next = {
      choice_groups: [
        {
          id: 10,
          choice_type: 'SKILL',
          pick_count: 2,
          sort_order: 0,
          options: [
            { id: 77, sort_order: 0, skill_effects: [{ id: 8, skill_id: 5, grants_expertise: true }] },
            { skill_effects: [{ skill_id: 9 }] },
          ],
        },
      ],
    }
    await syncFeatureEffects(ops, FEATURE_ID, prev, next)
    expect(ops.calls).toEqual([
      ['groups.patch', FEATURE_ID, 10, { pick_count: 2 }],
      ['optionEffects.patch', FEATURE_ID, 10, 77, 'skill', 8, { grants_expertise: true }],
      ['options.create', FEATURE_ID, 10, {
        sort_order: 1,
        effects: [{ effect_type: 'skill', items: [{ skill_id: 9, grants_expertise: false }] }],
      }],
      ['options.remove', FEATURE_ID, 10, 78],
    ])
  })

  it('deletes a group the editor removed', async () => {
    const ops = mockOps()
    await syncFeatureEffects(
      ops,
      FEATURE_ID,
      { choice_groups: [{ id: 10, choice_type: 'ARMOR', pick_count: 1, options: [] }] },
      { choice_groups: [] },
    )
    expect(ops.calls).toEqual([['groups.remove', FEATURE_ID, 10]])
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