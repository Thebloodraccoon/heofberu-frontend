import { describe, it, expect } from 'vitest'
import {
  allChoiceGroups,
  buildItemChoiceIds,
  choiceGroupsComplete,
} from '@/lib/utils/characterCreate.js'

const classDetail = {
  starting_choice_groups: [
    { pick_count: 1, options: [{ id: 10, item_id: 100, quantity: 1 }, { id: 11, item_id: 101, quantity: 1 }] },
    { pick_count: 2, options: [{ id: 12, item_id: 102, quantity: 1 }, { id: 13, item_id: 103, quantity: 1 }, { id: 14, item_id: 104, quantity: 1 }] },
  ],
}

const backgroundDetail = {
  choice_groups: [
    { pick_count: 1, options: [{ id: 20, item_id: 200, quantity: 1 }] },
  ],
}

describe('allChoiceGroups', () => {
  it('flattens class and background groups with distinct source keys', () => {
    const groups = allChoiceGroups(classDetail, backgroundDetail)
    expect(groups).toHaveLength(3)
    expect(groups[0]).toMatchObject({ source: 'class', gi: 0 })
    expect(groups[1]).toMatchObject({ source: 'class', gi: 1 })
    expect(groups[2]).toMatchObject({ source: 'background', gi: 0 })
  })

  it('returns empty when neither source has groups', () => {
    expect(allChoiceGroups(null, {})).toEqual([])
  })

  it('falls back from starting_choice_groups to choice_groups', () => {
    const groups = allChoiceGroups({ choice_groups: backgroundDetail.choice_groups }, null)
    expect(groups).toHaveLength(1)
    expect(groups[0].source).toBe('class')
  })
})

describe('buildItemChoiceIds', () => {
  it('returns the chosen option ids across class and background groups', () => {
    const choices = { 'class:0': [10], 'class:1': [12, 13], 'background:0': [20] }
    expect(buildItemChoiceIds(classDetail, backgroundDetail, choices)).toEqual([10, 12, 13, 20])
  })

  it('returns empty array when nothing is chosen', () => {
    expect(buildItemChoiceIds(classDetail, backgroundDetail, {})).toEqual([])
  })

  it('uses opt.id preferentially and ignores unselected options', () => {
    const choices = { 'class:0': [11] }
    expect(buildItemChoiceIds(classDetail, backgroundDetail, choices)).toEqual([11])
  })
})

describe('choiceGroupsComplete', () => {
  it('is complete only when every group reaches its pick_count', () => {
    const full = { 'class:0': [10], 'class:1': [12, 13], 'background:0': [20] }
    expect(choiceGroupsComplete(classDetail, backgroundDetail, full)).toBe(true)
  })

  it('is incomplete when a group has too few choices', () => {
    const partial = { 'class:0': [10], 'class:1': [12], 'background:0': [20] }
    expect(choiceGroupsComplete(classDetail, backgroundDetail, partial)).toBe(false)
  })

  it('is true when there are no groups at all', () => {
    expect(choiceGroupsComplete(null, null, {})).toBe(true)
  })
})
