import { describe, expect, it } from 'vitest'
import { flattenItem, itemFactRows, itemKindText } from '@/lib/utils/itemFacts.js'
import { describeItemFilter, describeToolEffect } from '@/lib/utils/effectBundle.js'

const valueOf = (rows, key) => rows.find((r) => r.key === key)?.value

describe('itemFactRows', () => {
  it('describes a weapon: category, damage, two-handed damage, range, properties (no magic bonus)', () => {
    const rows = itemFactRows({
      kind: 'WEAPON',
      weapon: {
        weapon_category: 'SIMPLE',
        attack_type: 'MELEE_ATTACK',
        damage_dice_count: 1,
        damage_dice_type: 'D6',
        damage_type: 'PIERCING',
        versatile_dice_count: 1,
        versatile_dice_type: 'D8',
        range_normal: 20,
        range_long: 60,
      },
      armor: null,
      tool: null,
      magic_bonus: 1,
      properties: [{ id: 1, name: 'Метательное' }, { id: 2, name: 'Универсальное' }],
    })
    expect(valueOf(rows, 'category')).toBe('Простое оружие')
    expect(valueOf(rows, 'damage')).toBe('1к6 колющий')
    expect(valueOf(rows, 'versatile')).toBe('1к8')
    expect(valueOf(rows, 'range')).toBe('20/60 фт.')
    expect(valueOf(rows, 'magic')).toBeUndefined()
    expect(valueOf(rows, 'props')).toBe('Метательное, Универсальное')
  })

  it('derives the AC text from the armor category (shield is a bonus, medium caps DEX at 2)', () => {
    const armor = (stats) => ({ kind: 'ARMOR', armor: stats, weapon: null, tool: null })
    expect(valueOf(itemFactRows(armor({ armor_category: 'SHIELD', armor_class_base: 2 })), 'ac')).toBe('+2')
    expect(valueOf(itemFactRows(armor({ armor_category: 'MEDIUM', armor_class_base: 14 })), 'ac')).toBe('14 + Ловкость (макс. 2)')
    expect(valueOf(itemFactRows(armor({ armor_category: 'HEAVY', armor_class_base: 18, strength_requirement: 15 })), 'str')).toBe('Сила 15')
    expect(valueOf(itemFactRows(armor({ armor_category: 'LIGHT', armor_class_base: 11, strength_requirement: 0 })), 'str')).toBeUndefined()
  })

  it('reads the tool category from item.tool and the flat category of a list row', () => {
    expect(valueOf(itemFactRows({ kind: 'TOOL', tool: { tool_category: 'MUSICAL_INSTRUMENT' } }), 'category')).toBe('Музыкальный инструмент')
    expect(valueOf(itemFactRows({ kind: 'WEAPON', weapon_category: 'MARTIAL' }), 'category')).toBe('Воинское оружие')
    expect(flattenItem({ name: 'Лютня', tool: { tool_category: 'MUSICAL_INSTRUMENT' } })).toMatchObject({ name: 'Лютня', tool_category: 'MUSICAL_INSTRUMENT' })
  })
})

describe('itemKindText', () => {
  it('names the kind, and a gear item by its subtype', () => {
    expect(itemKindText({ kind: 'WEAPON' })).toBe('Оружие')
    expect(itemKindText({ kind: 'GEAR', subtype: 'POTION' })).toBe('Зелье')
    expect(itemKindText({ kind: 'GEAR', subtype: null })).toBe('Предметы')
    expect(itemKindText({})).toBeNull()
  })
})

describe('describeItemFilter / describeToolEffect', () => {
  it('names starting-equipment filter options with the right gender', () => {
    expect(describeItemFilter({ kind: 'WEAPON', weapon_category: 'SIMPLE' })).toBe('любое простое оружие')
    expect(describeItemFilter({ kind: 'TOOL', tool_category: 'MUSICAL_INSTRUMENT' })).toBe('любой музыкальный инструмент')
    expect(describeItemFilter({ kind: 'ARMOR' })).toBe('любой доспех')
    expect(describeItemFilter({ armor_category: 'SHIELD' })).toBe('любой щит')
  })

  it('names a concrete tool by its item name and an open one by category', () => {
    expect(describeToolEffect({ item_id: 3 }, { 3: 'Воровские инструменты' })).toBe('Воровские инструменты')
    expect(describeToolEffect({ item_id: null, tool_category: null })).toBe('любой инструмент')
  })
})
