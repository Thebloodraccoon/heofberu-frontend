import { describe, expect, it } from 'vitest'
import { bundleItemIds, describeChoiceKind, describeEffectBundle } from '@/lib/utils/effectBundle.js'

describe('effectBundle on answered choices', () => {
  it('shows the skill and the spell the player named instead of «любой на выбор»', () => {
    const skill = { skill_effects: [{ skill_id: null, mode: 'PROFICIENCY' }], picked_skill_id: 4 }
    const spell = { spell_effects: [{ spell_id: null }], picked_spell_id: 9 }
    const names = { skillNames: { 4: 'Скрытность' }, spellNames: { 9: 'Щит' } }

    expect(describeEffectBundle(skill, names)).toBe('Скрытность')
    expect(describeEffectBundle(spell, names)).toBe('Щит')
  })

  it('gives the named tool to the first open tool effect only', () => {
    const bundle = {
      tool_effects: [
        { item_id: null, tool_category: 'GAMING_SET' },
        { item_id: null, tool_category: 'VEHICLE' },
      ],
      picked_item_id: 222,
    }

    const text = describeEffectBundle(bundle, { itemNames: { 222: 'Игральные карты' } })

    expect(text.startsWith('Игральные карты, ')).toBe(true)
    expect(text.match(/Игральные карты/g)).toHaveLength(1)
  })

  it('names the kind of the choice and collects every referenced item id', () => {
    const bundle = { armor_effects: [{ item_id: 1745 }, { armor_type: 'HEAVY' }], picked_item_id: null }

    expect(describeChoiceKind(bundle)).toBe('Доспехи')
    expect(describeChoiceKind({})).toBe('—')
    expect(bundleItemIds(bundle)).toEqual([1745])
    expect(bundleItemIds({ tool_effects: [{ item_id: null }], picked_item_id: 5 })).toEqual([5])
  })
})
