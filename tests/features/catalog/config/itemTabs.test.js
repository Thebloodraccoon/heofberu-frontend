import { describe, expect, it } from 'vitest'
import { catalogEditorTabs, catalogFieldTab, catalogSectionTab } from '@/features/catalog/config/editors/tabs.js'
import { toolsCfg } from '@/features/catalog/config/editors/tools.js'
import { itemsCfg } from '@/features/catalog/config/editors/items.js'
import { weaponsCfg } from '@/features/catalog/config/editors/weapons.js'

const tabKeys = (resource) => (catalogEditorTabs[resource] ?? []).map(([key]) => key)

describe('item editor tabs', () => {
  it('weapons have no effects tab, armor and gear show AC and speed, tools have no tabs', () => {
    expect(tabKeys('weapons')).toEqual(['main', 'kind', 'properties'])
    expect(catalogEditorTabs.armor.at(-1)).toEqual(['effects', 'Влияние на КД и скорость'])
    expect(catalogEditorTabs.gear.at(-1)).toEqual(['effects', 'Влияние на КД и скорость'])
    expect(catalogEditorTabs.tools).toBeUndefined()
    expect(weaponsCfg.sections.map((s) => s.type)).toEqual(['weaponProperties'])
  })

  it('puts the effects editor node (React key item_effects-<id>) on the effects tab', () => {
    expect(catalogSectionTab('gear', 'item_effects-12')).toBe('effects')
    expect(catalogSectionTab('armor', 'item_effects-3')).toBe('effects')
    expect(catalogSectionTab('weapons', 'property_ids')).toBe('properties')
  })

  it('every kind: the kind field on its own row before rarity, then weight, cost and attunement in one row (1 : 1 : 2)', () => {
    for (const [cfg, resource, key] of [[toolsCfg, 'tools', 'tool_category'], [itemsCfg, 'gear', 'subtype'], [weaponsCfg, 'weapons', null]]) {
      const keys = cfg.fields.map((f) => f.key)
      if (key) expect(keys.indexOf(key)).toBe(keys.indexOf('rarity') - 1)
      expect(cfg.fields.find((f) => f.key === 'rarity').type).toBe('chips')
      const row = cfg.fields.filter((f) => f.row === 'stats')
      expect(row.map((f) => [f.key, f.span])).toEqual([['weight', 1], ['cost_gold', 1], ['requires_attunement', 2]])
      expect(row.every((f) => catalogFieldTab(resource, f.key) === 'main')).toBe(true)
    }
  })

  it('weapon two-handed damage is not a Характеристики field (it lives with the properties)', () => {
    expect(weaponsCfg.fields.some((f) => f.key.startsWith('versatile_'))).toBe(false)
    expect(weaponsCfg.fields.find((f) => f.type === 'dice')).toMatchObject({ countKey: 'damage_dice_count', typeKey: 'damage_dice_type' })
  })
})

describe('feature / feat effect tabs', () => {
  it('split «Эффекты» into «Статичные эффекты» and «Выбор эффектов»', () => {
    for (const resource of ['features', 'feats']) {
      expect(catalogEditorTabs[resource].slice(-2)).toEqual([['static', 'Статичные эффекты'], ['choices', 'Выбор эффектов']])
      expect(catalogSectionTab(resource, 'effects-static')).toBe('static')
      expect(catalogSectionTab(resource, 'effects-choice')).toBe('choices')
      expect(catalogSectionTab(resource, 'scaling')).toBe('scaling')
    }
  })
})

describe('catalog section order', () => {
  it('public catalog and GM editor list sections in the same order', async () => {
    const { catalog } = await import('@/features/catalog/catalog.js')
    const { editorConfig } = await import('@/features/catalog/config/editors/index.js')
    const order = ['Расы', 'Классы', 'Навыки', 'Заклинания', 'Предыстории', 'Оружие', 'Доспехи и щиты', 'Инструменты', 'Предметы', 'Черты', 'Особенности']
    expect(Object.values(catalog).map((c) => c.label)).toEqual(order)
    expect(Object.values(editorConfig).map((c) => c.label)).toEqual(order)
  })
})
