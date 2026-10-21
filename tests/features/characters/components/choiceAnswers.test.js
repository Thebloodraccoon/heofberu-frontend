import { describe, expect, it } from 'vitest'
import {
  addAnswer,
  groupComplete,
  initialAnswers,
  isOptionAvailable,
  optionNeedsSkill,
  optionNeedsSpell,
  patchAnswer,
  toAnswerItems,
  toggleOption,
} from '@/features/characters/components/choiceAnswers.jsx'

const openOption = { id: 30, needs_skill: true }
const concrete = { id: 10, needs_skill: false }
const unavailable = { id: 11, needs_skill: false, available: false }

describe('optionNeedsSkill', () => {
  it('trusts the pending flag and falls back to an open skill effect for catalog options', () => {
    expect(optionNeedsSkill(openOption)).toBe(true)
    expect(optionNeedsSkill(concrete)).toBe(false)
    expect(optionNeedsSkill({ id: 1, skill_effects: [{ skill_id: null, mode: 'EXPERTISE' }] })).toBe(true)
    expect(optionNeedsSkill({ id: 2, skill_effects: [{ skill_id: 4 }] })).toBe(false)
  })
})

describe('optionNeedsSpell', () => {
  it('trusts the pending flag and falls back to an open spell effect for catalog options', () => {
    expect(optionNeedsSpell({ id: 1, needs_spell: true })).toBe(true)
    expect(optionNeedsSpell({ id: 2, needs_spell: false, spell_effects: [{ spell_id: null }] })).toBe(false)
    expect(optionNeedsSpell({ id: 3, spell_effects: [{ spell_id: null, castable_only: true }] })).toBe(true)
    expect(optionNeedsSpell({ id: 4, spell_effects: [{ spell_id: 7 }] })).toBe(false)
  })
})

describe('open spell option', () => {
  const openSpell = {
    id: 40,
    needs_spell: true,
    allowed_spells: [
      { id: 7, name: 'Огненный шар', level: 'LEVEL_3' },
      { id: 9, name: 'Молния', level: 'LEVEL_3' },
    ],
  }
  const group = { id: 4, pick_count: 2, options: [openSpell] }

  it('is complete only when every entry names a spell, and sends spell_id', () => {
    let list = toggleOption([], group, openSpell)
    list = addAnswer(list, group, openSpell)
    expect(groupComplete(list, group)).toBe(false)

    const [first, second] = list
    list = patchAnswer(list, first.key, { spell_id: 7 })
    expect(groupComplete(list, group)).toBe(false)
    list = patchAnswer(list, second.key, { spell_id: 9 })
    expect(groupComplete(list, group)).toBe(true)
    expect(toAnswerItems(group.id, list)).toEqual([
      { choice_group_id: 4, choice_option_id: 40, spell_id: 7 },
      { choice_group_id: 4, choice_option_id: 40, spell_id: 9 },
    ])
  })
})

describe('toggleOption', () => {
  const group = { id: 1, pick_count: 1, options: [concrete, unavailable] }

  it('picks and unpicks an option', () => {
    const picked = toggleOption([], group, concrete)
    expect(picked.map((a) => a.choice_option_id)).toEqual([10])
    expect(toggleOption(picked, group, concrete)).toEqual([])
  })

  it('never picks an option the backend marked unavailable', () => {
    expect(isOptionAvailable(unavailable)).toBe(false)
    expect(toggleOption([], group, unavailable)).toEqual([])
  })
})

describe('open option picked several times', () => {
  const group = { id: 3, pick_count: 2, options: [openOption] }

  it('fills a pick_count=2 group with two skills from one open option', () => {
    let list = toggleOption([], group, openOption)
    list = addAnswer(list, group, openOption)
    expect(addAnswer(list, group, openOption)).toBe(list) // the group is full

    const [first, second] = list
    expect(first.key).not.toBe(second.key)
    expect(groupComplete(list, group)).toBe(false) // no skill named yet

    list = patchAnswer(list, first.key, { skill_id: 4 })
    list = patchAnswer(list, second.key, { skill_id: 5 })
    expect(groupComplete(list, group)).toBe(true)
    expect(toAnswerItems(group.id, list)).toEqual([
      { choice_group_id: 3, choice_option_id: 30, skill_id: 4 },
      { choice_group_id: 3, choice_option_id: 30, skill_id: 5 },
    ])
  })
})

describe('groupComplete against the allowed lists', () => {
  it('does not count a spell the refetched allowed_spells no longer offers', () => {
    const option = { id: 41, needs_spell: true, allowed_spells: [{ id: 7 }] }
    const group = { id: 5, pick_count: 1, options: [option] }
    const list = [{ key: 1, choice_option_id: 41, skill_id: null, spell_id: 8 }]
    expect(groupComplete(list, group)).toBe(false)
    expect(groupComplete([{ ...list[0], spell_id: 7 }], group)).toBe(true)
  })

  it('does not count a skill the refetched allowed_skill_ids no longer offers', () => {
    const option = { id: 42, needs_skill: true, allowed_skill_ids: [4] }
    const group = { id: 6, pick_count: 1, options: [option] }
    const list = [{ key: 1, choice_option_id: 42, skill_id: 5, spell_id: null }]
    expect(groupComplete(list, group)).toBe(false)
    expect(groupComplete([{ ...list[0], skill_id: 4 }], group)).toBe(true)
  })

  it('checks nothing when the allowed lists are absent', () => {
    const option = { id: 43, needs_skill: true }
    const group = { id: 7, pick_count: 1, options: [option] }
    expect(groupComplete([{ key: 1, choice_option_id: 43, skill_id: 9, spell_id: null }], group)).toBe(true)
  })
})

describe('initialAnswers', () => {
  it('preselects a group with no real choice, but not one with an unavailable option', () => {
    const init = initialAnswers([
      { id: 1, pick_count: 1, options: [concrete] },
      { id: 2, pick_count: 1, options: [unavailable] },
    ])
    expect(init[1].map((a) => a.choice_option_id)).toEqual([10])
    expect(init[2]).toBeUndefined()
  })
})
