import { describe, expect, it } from 'vitest'
import { ownedProficiencyItems } from '@/features/characters/components/sheet/ownedProficiencies.js'

const OPTIONS = {
  categoryKey: 'armor_type',
  categoryLabels: { LIGHT: 'Лёгкие доспехи', MEDIUM: 'Средние доспехи', SHIELD: 'Щит' },
  itemFallback: 'доспех',
}

describe('ownedProficiencyItems', () => {
  it('lists categories in the label map order, then concrete items by name', () => {
    const out = ownedProficiencyItems(
      [
        { armor_type: 'SHIELD' },
        { armor_type: null, item_id: 1 },
        { armor_type: 'LIGHT' },
        { armor_type: null, item_id: 2 },
      ],
      { ...OPTIONS, itemNames: { 1: 'Кольчуга', 2: 'Бронза' } },
    )
    expect(out).toEqual([
      { key: 'LIGHT', label: 'Лёгкие доспехи' },
      { key: 'SHIELD', label: 'Щит' },
      { key: 'item-2', label: 'Бронза' },
      { key: 'item-1', label: 'Кольчуга' },
    ])
  })

  it('accepts plain string entries as categories', () => {
    expect(ownedProficiencyItems(['MEDIUM', 'LIGHT'], OPTIONS)).toEqual([
      { key: 'LIGHT', label: 'Лёгкие доспехи' },
      { key: 'MEDIUM', label: 'Средние доспехи' },
    ])
  })

  it('dedupes repeated categories and items', () => {
    const out = ownedProficiencyItems(
      [{ armor_type: 'LIGHT' }, { armor_type: 'LIGHT' }, { armor_type: null, item_id: 3 }, { armor_type: null, item_id: 3 }],
      OPTIONS,
    )
    expect(out.map((p) => p.key)).toEqual(['LIGHT', 'item-3'])
  })

  it('leaves the label empty (a skeleton on the sheet) until the item name loads, after the named ones', () => {
    expect(
      ownedProficiencyItems([{ armor_type: null, item_id: 3 }, { armor_type: null, item_id: 1 }], {
        ...OPTIONS,
        itemNames: { 1: 'Кольчуга' },
      }),
    ).toEqual([
      { key: 'item-1', label: 'Кольчуга' },
      { key: 'item-3', label: null },
    ])
  })

  it('treats a missing list as empty', () => {
    expect(ownedProficiencyItems(null, OPTIONS)).toEqual([])
  })
})
