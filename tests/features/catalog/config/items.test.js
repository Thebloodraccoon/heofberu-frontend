import { describe, expect, it } from 'vitest'
import { itemCreateBody, itemPatches } from '@/features/catalog/config/editors/itemShared.js'
import { weaponsCfg } from '@/features/catalog/config/editors/weapons.js'
import { armorCfg } from '@/features/catalog/config/editors/armor.js'
import { toolsCfg } from '@/features/catalog/config/editors/tools.js'
import { itemsCfg } from '@/features/catalog/config/editors/items.js'
import { weaponWithhold } from '@/lib/utils/weaponProperties.js'

const weapon = {
  id: 1,
  name: 'Копьё',
  kind: 'WEAPON',
  subtype: null,
  rarity: 'NONE',
  requires_attunement: false,
  weight: 3,
  cost_gold: null,
  magic_bonus: null,
  description: '',
  weapon: {
    weapon_category: 'SIMPLE',
    attack_type: 'MELEE_ATTACK',
    damage_dice_count: 1,
    damage_dice_type: 'D6',
    damage_type: 'PIERCING',
    range_normal: 20,
    range_long: 60,
    versatile_dice_count: 1,
    versatile_dice_type: 'D8',
  },
  armor: null,
  tool: null,
  properties: [{ id: 5, name: 'Метательное' }],
}

describe('item editors: create body per kind', () => {
  it('weapon: core + nested weapon stats + top-level property_ids, no subtype', () => {
    const form = { ...weaponsCfg.emptyForm(), name: 'Кинжал', damage_dice_count: '1', damage_dice_type: 'D4', property_ids: [5] }
    const body = itemCreateBody(weaponsCfg, form)
    expect(body).toMatchObject({ name: 'Кинжал', rarity: 'NONE', property_ids: [5] })
    expect(body.weapon).toMatchObject({ damage_dice_count: 1, damage_dice_type: 'D4', range_normal: null })
    expect(body.weapon).not.toHaveProperty('property_ids')
    expect(body).not.toHaveProperty('subtype')
  })

  it('armor and tool: nested stats under their own key', () => {
    const shield = itemCreateBody(armorCfg, { ...armorCfg.emptyForm(), name: 'Щит', armor_category: 'SHIELD', armor_class_base: '2' })
    expect(shield.armor).toEqual({
      armor_category: 'SHIELD',
      armor_class_base: 2,
      armor_class_max_dex_bonus: null,
      strength_requirement: null,
      stealth_disadvantage: false,
    })
    const lute = itemCreateBody(toolsCfg, { ...toolsCfg.emptyForm(), name: 'Лютня', tool_category: 'MUSICAL_INSTRUMENT' })
    expect(lute.tool).toEqual({ tool_category: 'MUSICAL_INSTRUMENT' })
  })

  it('gear: flat body with subtype (default OTHER)', () => {
    expect(itemCreateBody(itemsCfg, { ...itemsCfg.emptyForm(), name: 'Верёвка' })).toMatchObject({ name: 'Верёвка', subtype: 'OTHER' })
    expect(itemCreateBody(itemsCfg, { ...itemsCfg.emptyForm(), name: 'Зелье', subtype: 'POTION' }).subtype).toBe('POTION')
  })
})

describe('item editors: PATCH only what changed', () => {
  it('splits core changes and weapon changes (incl. property_ids) into their own bodies', () => {
    const form = { ...weaponsCfg.fromRecord(weapon), cost_gold: '1', range_long: '80', property_ids: [5, 7] }
    expect(itemPatches(weaponsCfg, form, weapon)).toEqual({
      core: { cost_gold: 1 },
      detail: { range_long: 80, property_ids: [5, 7] },
    })
  })

  it('sends nothing when the form is untouched', () => {
    expect(itemPatches(weaponsCfg, weaponsCfg.fromRecord(weapon), weapon)).toEqual({ core: {}, detail: {} })
  })

  it('a gear subtype change goes to the core PATCH; a tool category to the tool PATCH', () => {
    const potion = { id: 2, name: 'Зелье', kind: 'GEAR', subtype: 'POTION', rarity: 'COMMON', description: '' }
    expect(itemPatches(itemsCfg, { ...itemsCfg.fromRecord(potion), subtype: 'OTHER' }, potion)).toEqual({ core: { subtype: 'OTHER' }, detail: {} })
    const tool = { id: 3, name: 'Лютня', kind: 'TOOL', rarity: 'NONE', description: '', tool: { tool_category: null } }
    expect(itemPatches(toolsCfg, { ...toolsCfg.fromRecord(tool), tool_category: 'MUSICAL_INSTRUMENT' }, tool)).toEqual({
      core: {},
      detail: { tool_category: 'MUSICAL_INSTRUMENT' },
    })
  })

  it('every kind editor lists only its own kind', () => {
    expect([weaponsCfg, armorCfg, toolsCfg, itemsCfg].map((c) => c.listParams.kind)).toEqual([['WEAPON'], ['ARMOR'], ['TOOL'], ['GEAR']])
  })
})

describe('weapon properties wait for their requirements', () => {
  const props = [{ id: 1, name: 'Универсальное', requires_versatile_damage: true }, { id: 2, name: 'Метательное', requires_range: true }]
  const plain = { ...weapon, weapon: { ...weapon.weapon, range_normal: null, range_long: null, versatile_dice_count: null, versatile_dice_type: null }, properties: [] }

  it('holds property_ids and the dice until the dice are set, then sends them together', () => {
    const added = { ...weaponsCfg.fromRecord(plain), property_ids: [1] }
    expect(weaponWithhold(added, props)).toEqual(['property_ids', 'versatile_dice_count', 'versatile_dice_type'])
    const half = { ...added, versatile_dice_count: '1' }
    expect(weaponWithhold(half, props)).toEqual(['property_ids', 'versatile_dice_count', 'versatile_dice_type'])
    expect(weaponWithhold({ ...half, versatile_dice_type: 'D10' }, props)).toEqual([])
    expect(weaponWithhold({ ...weaponsCfg.fromRecord(plain), property_ids: [2] }, props)).toEqual(['property_ids', 'range_normal'])
    expect(weaponWithhold(added, [])).toEqual([])
  })

  it('the PATCH skips held fields (dictionary passed by the caller), keepHeld keeps them in the form', () => {
    const ctx = { weaponProperties: props }
    const form = { ...weaponsCfg.fromRecord(plain), property_ids: [1], cost_gold: '2' }
    expect(itemPatches(weaponsCfg, form, plain, ctx)).toEqual({ core: { cost_gold: 2 }, detail: {} })
    expect(weaponsCfg.keepHeld(weaponsCfg.fromRecord(plain), form, ctx).property_ids).toEqual([1])
    const ready = { ...form, versatile_dice_count: '1', versatile_dice_type: 'D10' }
    expect(itemPatches(weaponsCfg, ready, plain, ctx).detail).toEqual({ versatile_dice_count: 1, versatile_dice_type: 'D10', property_ids: [1] })
  })

  it('a saved thrown / versatile weapon: clearing the range or both dice is held back while the property stays', () => {
    const ctx = { weaponProperties: props }
    const saved = { ...weapon, properties: [{ id: 1, name: 'Универсальное' }, { id: 2, name: 'Метательное' }] }
    const form = weaponsCfg.fromRecord(saved)
    const cleared = { ...form, range_normal: '', versatile_dice_count: '', versatile_dice_type: '', range_long: '90' }
    expect(itemPatches(weaponsCfg, cleared, saved, ctx).detail).toEqual({ range_long: 90 })
    expect(weaponsCfg.keepHeld(weaponsCfg.fromRecord(saved), cleared, ctx)).toMatchObject({ range_normal: '', versatile_dice_count: '', versatile_dice_type: '' })
    // Сняли свойства вместе с полями — уходит одним PATCH.
    expect(itemPatches(weaponsCfg, { ...cleared, property_ids: [] }, saved, ctx).detail).toEqual({
      range_normal: null,
      range_long: 90,
      versatile_dice_count: null,
      versatile_dice_type: null,
      property_ids: [],
    })
  })
})
