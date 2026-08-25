import { catalogApi as api } from '../../api.js'
import { damageTypeLabels, diceTypeLabels, itemRarityLabels, itemTypeLabels } from '@/lib/i18n/index.js'
import { opt, optOptional, toNum, toStr } from './shared.js'

export const itemsCfg = {
  singular: 'предмет',
  fields: [
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Длинный меч' },
    { key: 'item_type', label: 'Тип предмета', type: 'select', options: opt(itemTypeLabels) },
    { key: 'rarity', label: 'Редкость', type: 'select', options: opt(itemRarityLabels) },
    { key: 'requires_attunement', label: 'Требует настройки', type: 'checkbox' },
    { key: 'weight', label: 'Вес (фунты)', type: 'number', min: 0 },
    { key: 'cost_gold', label: 'Цена (золото)', type: 'number', min: 0 },
    { key: 'damage_dice_count', label: 'Количество костей урона', type: 'number', min: 0, showWhen: (f) => f.item_type === 'WEAPON' },
    { key: 'damage_dice_type', label: 'Кость урона', type: 'select', options: optOptional(diceTypeLabels), showWhen: (f) => f.item_type === 'WEAPON' },
    { key: 'damage_type', label: 'Тип урона', type: 'select', options: optOptional(damageTypeLabels), showWhen: (f) => f.item_type === 'WEAPON' },
    { key: 'weapon_properties', label: 'Свойства оружия', type: 'text', placeholder: 'Например: FINESSE,LIGHT,THROWN', showWhen: (f) => f.item_type === 'WEAPON' },
    { key: 'armor_class_base', label: 'КД (базовый)', type: 'number', min: 0, showWhen: (f) => f.item_type === 'ARMOR' || f.item_type === 'SHIELD' },
    { key: 'armor_class_dex_bonus', label: 'КД + Ловкость', type: 'checkbox', showWhen: (f) => f.item_type === 'ARMOR' || f.item_type === 'SHIELD' },
    { key: 'armor_class_max_dex_bonus', label: 'Макс. бонус Ловкости к КД', type: 'number', min: 0, showWhen: (f) => f.item_type === 'ARMOR' || f.item_type === 'SHIELD' },
    { key: 'strength_requirement', label: 'Требование силы', type: 'number', min: 0, showWhen: (f) => f.item_type === 'ARMOR' || f.item_type === 'SHIELD' },
    { key: 'stealth_disadvantage', label: 'Помеха к скрытности', type: 'checkbox', showWhen: (f) => f.item_type === 'ARMOR' || f.item_type === 'SHIELD' },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
  ],
  sections: [],
  emptyForm: () => ({
    name: '',
    item_type: 'WEAPON',
    rarity: 'NONE',
    requires_attunement: false,
    weight: '',
    cost_gold: '',
    damage_dice_count: '',
    damage_dice_type: '',
    damage_type: '',
    weapon_properties: '',
    armor_class_base: '',
    armor_class_dex_bonus: true,
    armor_class_max_dex_bonus: '',
    strength_requirement: '',
    stealth_disadvantage: false,
    description: '',
  }),
  fromRecord: (r) => ({
    name: r.name,
    item_type: r.item_type,
    rarity: r.rarity ?? 'NONE',
    requires_attunement: !!r.requires_attunement,
    weight: toStr(r.weight),
    cost_gold: toStr(r.cost_gold),
    damage_dice_count: toStr(r.damage_dice_count),
    damage_dice_type: r.damage_dice_type ?? '',
    damage_type: r.damage_type ?? '',
    weapon_properties: r.weapon_properties ?? '',
    armor_class_base: toStr(r.armor_class_base),
    armor_class_dex_bonus: r.armor_class_dex_bonus ?? true,
    armor_class_max_dex_bonus: toStr(r.armor_class_max_dex_bonus),
    strength_requirement: toStr(r.strength_requirement),
    stealth_disadvantage: !!r.stealth_disadvantage,
    description: r.description ?? '',
  }),
  submitFields: async (form, rec) => {
    const base = {
      name: form.name,
      item_type: form.item_type,
      rarity: form.rarity,
      requires_attunement: form.requires_attunement,
      weight: toNum(form.weight),
      cost_gold: toNum(form.cost_gold),
      damage_dice_count: toNum(form.damage_dice_count),
      damage_dice_type: form.damage_dice_type || null,
      damage_type: form.damage_type || null,
      weapon_properties: form.weapon_properties,
      armor_class_base: toNum(form.armor_class_base),
      armor_class_dex_bonus: form.armor_class_dex_bonus,
      armor_class_max_dex_bonus: toNum(form.armor_class_max_dex_bonus),
      strength_requirement: toNum(form.strength_requirement),
      stealth_disadvantage: form.stealth_disadvantage,
      description: form.description,
    }
    if (form.item_type !== 'WEAPON') {
      base.damage_dice_count = 0
      base.damage_dice_type = null
      base.damage_type = null
      base.weapon_properties = ''
    }
    if (form.item_type !== 'ARMOR' && form.item_type !== 'SHIELD') {
      base.armor_class_base = 0
      base.armor_class_dex_bonus = false
      base.armor_class_max_dex_bonus = 0
      base.strength_requirement = 0
      base.stealth_disadvantage = false
    }
    if (rec) await api.items.update(rec.id, base)
    else await api.items.create(base)
  },
  listBadges: (item) =>
    [
      item.item_type ? { text: itemTypeLabels[item.item_type] ?? item.item_type, tone: 'default' } : null,
      item.rarity && item.rarity !== 'NONE' ? { text: itemRarityLabels[item.rarity] ?? item.rarity, tone: 'default' } : null,
    ].filter(Boolean),
}
