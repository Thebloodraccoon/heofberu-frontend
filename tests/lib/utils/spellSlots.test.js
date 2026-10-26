import { describe, expect, it } from 'vitest'
import { PRESETS, applySlotPreset, setSlotCell, slotCell } from '@/lib/utils/spellSlots.js'

const column = (table, key) => Array.from({ length: 20 }, (_, i) => slotCell(table, i + 1, key))

describe('spell slot table', () => {
  it('a change runs down through inherited cells and stops at the next explicit one', () => {
    const table = { 1: { LEVEL_1: 2 }, 2: { LEVEL_1: 2 }, 3: { LEVEL_1: 2 }, 4: { LEVEL_1: 3 }, 5: { LEVEL_1: 3 } }
    const next = setSlotCell(table, 2, 'LEVEL_1', '4')
    expect(column(next, 'LEVEL_1').slice(0, 5)).toEqual([2, 4, 4, 3, 3])
  })

  it('clearing a cell makes it inherit the previous level, carried down too', () => {
    const table = { 1: { LEVEL_1: 2 }, 2: { LEVEL_1: 3 }, 3: { LEVEL_1: 3 } }
    expect(column(setSlotCell(table, 2, 'LEVEL_1', ''), 'LEVEL_1').slice(0, 3)).toEqual([2, 2, 2])
  })

  it('a preset fills circles 1–9 on all 20 levels and keeps the cantrips', () => {
    const full = PRESETS.find(([name]) => name === 'Полный заклинатель')[1]
    const table = applySlotPreset({ 1: { CANTRIP: 3, LEVEL_9: 5 } }, full)
    expect(slotCell(table, 1, 'CANTRIP')).toBe(3)
    expect(slotCell(table, 1, 'LEVEL_9')).toBe(0)
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => slotCell(table, 20, `LEVEL_${n}`))).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1])
    const warlock = applySlotPreset({}, PRESETS.find(([name]) => name === 'Колдун')[1])
    expect([slotCell(warlock, 3, 'LEVEL_1'), slotCell(warlock, 3, 'LEVEL_2')]).toEqual([0, 2])
  })
})
