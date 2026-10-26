import { describe, expect, it, vi } from 'vitest'
import {
  effectBadges,
  effectSummaryLines,
  flattenEffectGroups,
  normalizeEffects,
  normalizeEffectsTree,
  syncFeatureEffects,
  syncItemEffects,
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
      'tool_effects',
      'spell_effects',
      'speed_effects',
      'armor_class_effects',
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

  it('sends an open spell row with its whole filter, never the backend summary', async () => {
    const ops = mockOps()
    await syncFeatureEffects(ops, FEATURE_ID, {}, {
      choice_groups: [
        {
          choice_type: 'SPELL',
          pick_count: 2,
          options: [
            {
              spell_effects: [
                {
                  spell_id: null,
                  castable_only: true,
                  schools: ['EVOCATION'],
                  class_ids: ['3'],
                  summary: ['школа: Воплощение'],
                },
              ],
            },
          ],
        },
      ],
    })
    expect(ops.calls).toEqual([
      ['groups.create', FEATURE_ID, {
        choice_type: 'SPELL',
        pick_count: 2,
        sort_order: 0,
        options: [{
          sort_order: 0,
          effects: [{
            effect_type: 'spell',
            items: [{
              spell_id: null,
              class_ids: [3],
              min_level: null,
              max_level: null,
              castable_only: true,
              schools: ['EVOCATION'],
              ritual_only: false,
            }],
          }],
        }],
      }],
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
    const kept = { id: 1, skill_id: 5, mode: 'PROFICIENCY' }
    await syncFeatureEffects(
      ops,
      FEATURE_ID,
      { skill_effects: [kept, { id: 2, skill_id: 6, mode: 'PROFICIENCY' }] },
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
            { id: 77, sort_order: 0, skill_effects: [{ id: 8, skill_id: 5, mode: 'PROFICIENCY' }] },
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
            { id: 77, sort_order: 0, skill_effects: [{ id: 8, skill_id: 5, mode: 'EXPERTISE' }] },
            { skill_effects: [{ skill_id: 9 }] },
            { skill_effects: [{ skill_id: null, mode: 'UPGRADE' }] },
          ],
        },
      ],
    }
    await syncFeatureEffects(ops, FEATURE_ID, prev, next)
    expect(ops.calls).toEqual([
      ['groups.patch', FEATURE_ID, 10, { pick_count: 2 }],
      ['optionEffects.patch', FEATURE_ID, 10, 77, 'skill', 8, { mode: 'EXPERTISE' }],
      ['options.create', FEATURE_ID, 10, {
        sort_order: 1,
        effects: [{ effect_type: 'skill', items: [{ skill_id: 9, mode: 'PROFICIENCY' }] }],
      }],
      ['options.create', FEATURE_ID, 10, {
        sort_order: 2,
        effects: [{ effect_type: 'skill', items: [{ skill_id: null, mode: 'UPGRADE' }] }],
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

  it('names a concrete armor item next to categories', () => {
    const lines = effectSummaryLines({
      armor_effects: [{ armor_type: null, item_id: 7 }, { armor_type: 'LIGHT' }],
    })
    expect(lines.find((l) => l.key === 'armor')?.text).toBe('конкретный доспех, Лёгкие доспехи')
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

describe('tool / speed / armor_class effects', () => {
  it('reads the new types out of static_groups and flattened option effects', () => {
    const tree = normalizeEffectsTree({
      static_groups: [
        { effect_type: 'tool', items: [{ id: 1, item_id: 5, tool_category: null }] },
        { effect_type: 'speed', items: [{ id: 2, speed_type: 'WALK', mode: 'BONUS', value: 10 }] },
        { effect_type: 'armor_class', items: [{ id: 3, mode: 'FORMULA', value: 10, abilities: ['DEX', 'CON'] }] },
      ],
    })
    expect(tree.tool_effects).toHaveLength(1)
    expect(tree.speed_effects[0].value).toBe(10)
    expect(tree.armor_class_effects[0].abilities).toEqual(['DEX', 'CON'])
    const option = flattenEffectGroups({ effects: [{ effect_type: 'tool', items: [{ item_id: null, tool_category: 'KIT' }] }] })
    expect(option.tool_effects).toEqual([{ item_id: null, tool_category: 'KIT' }])
  })

  it('posts new fixed rows with defaults; a concrete tool never carries a category, abilities only on FORMULA', async () => {
    const ops = mockOps()
    await syncFeatureEffects(ops, FEATURE_ID, {}, {
      tool_effects: [{ item_id: '5', tool_category: 'KIT' }],
      speed_effects: [{ speed_type: 'FLY', mode: 'SET', value: '50' }],
      armor_class_effects: [{ mode: 'BONUS', value: 1, abilities: ['DEX'] }],
    })
    expect(ops.calls).toEqual([
      ['effects.add', FEATURE_ID, {
        static_groups: [
          { effect_type: 'tool', items: [{ item_id: 5, tool_category: null }] },
          { effect_type: 'speed', items: [{ speed_type: 'FLY', mode: 'SET', value: 50, condition: 'NONE', min_level: null }] },
          {
            effect_type: 'armor_class',
            items: [{ mode: 'BONUS', value: 1, abilities: [], allows_shield: true, condition: 'NONE', min_level: null }],
          },
        ],
      }],
    ])
  })

  it('patches only the changed fields of a speed row', async () => {
    const ops = mockOps()
    const row = { id: 4, speed_type: 'WALK', mode: 'BONUS', value: 10, condition: 'NONE', min_level: null }
    await syncFeatureEffects(ops, FEATURE_ID, { speed_effects: [row] }, {
      speed_effects: [{ ...row, value: 15, condition: 'NO_HEAVY_ARMOR' }],
    })
    expect(ops.calls).toEqual([['effects.patch', FEATURE_ID, 'speed', 4, { value: 15, condition: 'NO_HEAVY_ARMOR' }]])
  })

  it('creates a TOOL choice group with an open "any musical instrument" option', async () => {
    const ops = mockOps()
    await syncFeatureEffects(ops, FEATURE_ID, {}, {
      choice_groups: [
        {
          effect_type: 'tool_effects',
          pick_count: 3,
          options: [{ tool_effects: [{ item_id: null, tool_category: 'MUSICAL_INSTRUMENT' }] }],
        },
      ],
    })
    expect(ops.calls).toEqual([
      ['groups.create', FEATURE_ID, {
        choice_type: 'TOOL',
        pick_count: 3,
        sort_order: 0,
        options: [
          { sort_order: 0, effects: [{ effect_type: 'tool', items: [{ item_id: null, tool_category: 'MUSICAL_INSTRUMENT' }] }] },
        ],
      }],
    ])
  })

  it('summarises the new types in Russian', () => {
    const lines = effectSummaryLines({
      tool_effects: [{ item_id: null, tool_category: 'GAMING_SET' }],
      speed_effects: [{ speed_type: 'WALK', mode: 'BONUS', value: 10, condition: 'NO_HEAVY_ARMOR' }],
      armor_class_effects: [{ mode: 'FORMULA', value: 10, abilities: ['DEX', 'CON'], allows_shield: true }],
    })
    const textOf = (key) => lines.find((l) => l.key === key)?.text
    expect(textOf('tool')).toBe('любой игровой набор')
    expect(textOf('speed')).toBe('Ходьба +10 фт. (без тяжёлого доспеха)')
    expect(textOf('armor_class')).toBe('КД = 10 + Ловкость + Телосложение')
  })
})

describe('syncItemEffects', () => {
  const itemOps = () => {
    const calls = []
    const rec = (name) => (...args) => {
      calls.push([name, ...args])
      return Promise.resolve({ item_id: 9, effects: [] })
    }
    return { calls, add: rec('add'), remove: rec('remove') }
  }

  it('replaces a changed row with delete + add (items have no PATCH), drops removed rows, adds new ones', async () => {
    const ops = itemOps()
    const ac = { id: 1, mode: 'BONUS', value: 1, abilities: [], allows_shield: true, condition: 'NONE', min_level: null }
    const swim = { id: 2, speed_type: 'SWIM', mode: 'SET', value: 40, condition: 'NONE', min_level: null }
    const res = await syncItemEffects(ops, 9, { armor_class_effects: [ac], speed_effects: [swim] }, {
      armor_class_effects: [{ ...ac, value: 2 }],
      speed_effects: [{ speed_type: 'CLIMB', mode: 'EQUAL_TO_WALK', value: 0 }],
    })
    expect(ops.calls).toEqual([
      ['remove', 9, 'speed', 2],
      ['remove', 9, 'armor_class', 1],
      ['add', 9, {
        static_groups: [
          { effect_type: 'speed', items: [{ speed_type: 'CLIMB', mode: 'EQUAL_TO_WALK', value: 0, condition: 'NONE', min_level: null }] },
          { effect_type: 'armor_class', items: [{ mode: 'BONUS', value: 2, abilities: [], allows_shield: true, condition: 'NONE', min_level: null }] },
        ],
      }],
    ])
    expect(res).toEqual({ item_id: 9, effects: [] })
  })

  it('does nothing when unchanged', async () => {
    const ops = itemOps()
    const ac = { id: 1, mode: 'BONUS', value: 1 }
    expect(await syncItemEffects(ops, 9, { armor_class_effects: [ac] }, { armor_class_effects: [ac] })).toBeNull()
    expect(ops.calls).toEqual([])
  })

  it('rejects on a failed request and stops there (rows already removed stay removed, the add is not sent)', async () => {
    const ops = itemOps()
    const failing = vi.fn().mockRejectedValueOnce(new Error('404'))
    ops.remove = (...args) => {
      ops.calls.push(['remove', ...args])
      return ops.calls.length === 1 ? Promise.resolve({ item_id: 9, effects: [] }) : failing()
    }
    const a = { id: 1, mode: 'BONUS', value: 1 }
    const b = { id: 2, mode: 'BONUS', value: 2 }
    await expect(syncItemEffects(ops, 9, { armor_class_effects: [a, b] }, { armor_class_effects: [{ mode: 'BONUS', value: 3 }] })).rejects.toThrow('404')
    expect(ops.calls).toEqual([['remove', 9, 'armor_class', 1], ['remove', 9, 'armor_class', 2]])
  })
})