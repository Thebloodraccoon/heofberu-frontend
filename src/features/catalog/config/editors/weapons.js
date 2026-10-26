import { catalogApi as api } from '../../api.js'
import { WEAPON_FILTERS } from '../../components/editor/itemFilters.js'
import { attackTypeLabels, weaponProficiencyLabels } from '@/lib/i18n/index.js'
import { weaponWithhold } from '@/lib/utils/weaponProperties.js'
import { itemKindCfg } from './itemShared.js'
import { optOptional, toNum, toStr } from './shared.js'

// Оружие: вкладки (tabs.js) «Основное», «Характеристики» (поля ниже), «Свойства»
// (словарь свойств, property_ids, + урон двумя руками у «Универсального» — его
// рисует WeaponPropertiesPicker). Эффектов у оружия нет.
// row — компактная строка сетки в 4 колонки (full — на 2), на телефоне столбиком.
export const weaponsCfg = itemKindCfg({
  kind: 'WEAPON',
  label: 'Оружие',
  singular: 'оружие',
  newTitle: 'Новое оружие',
  filters: WEAPON_FILTERS,
  categoryBadge: (item) => weaponProficiencyLabels[item.weapon_category] ?? item.weapon_category,
  fields: [
    { key: 'weapon_category', label: 'Категория', type: 'chips', options: optOptional(weaponProficiencyLabels), inline: true },
    { key: 'attack_type', label: 'Атака', type: 'chips', options: optOptional(attackTypeLabels), inline: true },
    {
      key: 'damage_dice_count', label: 'Кость урона', type: 'dice', countKey: 'damage_dice_count', typeKey: 'damage_dice_type', optional: true,
      aside: { key: 'damage_type', label: 'Тип урона', type: 'damageType' },
    },
    {
      key: 'h_range',
      label: 'Дистанция — для метательного и стрелкового',
      type: 'heading',
      hint: 'Дальше нормальной — атака с помехой, дальше максимальной — нельзя.',
    },
    // Типичные пары из книги одним кликом; дальше — ручная правка двух полей.
    { key: 'range_presets', label: 'Типичные дистанции', type: 'rangePresets', keys: ['range_normal', 'range_long'], presets: [[20, 60], [25, 100], [30, 120], [80, 320], [100, 400], [150, 600]] },
    { key: 'range_normal', label: 'Нормальная', type: 'number', unit: 'фт.', min: 1, row: 'range' },
    { key: 'range_long', label: 'Максимальная', type: 'number', unit: 'фт.', min: 1, row: 'range' },
  ],
  sections: [{ type: 'weaponProperties', key: 'property_ids' }],
  detail: {
    fromRecord: (r) => {
      const w = r.weapon ?? {}
      return {
        weapon_category: w.weapon_category ?? '',
        attack_type: w.attack_type ?? '',
        damage_dice_count: toStr(w.damage_dice_count),
        damage_dice_type: w.damage_dice_type ?? '',
        damage_type: w.damage_type ?? '',
        range_normal: toStr(w.range_normal),
        range_long: toStr(w.range_long),
        versatile_dice_count: toStr(w.versatile_dice_count),
        versatile_dice_type: w.versatile_dice_type ?? '',
        property_ids: (r.properties ?? []).map((p) => p.id),
      }
    },
    // Тело PATCH /items/{id}/weapon (property_ids заменяет список целиком).
    body: (form) => ({
      weapon_category: form.weapon_category || null,
      attack_type: form.attack_type || null,
      damage_dice_count: toNum(form.damage_dice_count) || null,
      damage_dice_type: form.damage_dice_type || null,
      damage_type: form.damage_type || null,
      range_normal: toNum(form.range_normal) || null,
      range_long: toNum(form.range_long) || null,
      versatile_dice_count: toNum(form.versatile_dice_count) || null,
      versatile_dice_type: form.versatile_dice_type || null,
      property_ids: (form.property_ids ?? []).map(Number),
    }),
    // Словарь свойств передаёт вызывающий (GmEditorPage), см. itemPatches.
    withhold: (form, { weaponProperties } = {}) => weaponWithhold(form, weaponProperties),
    createBody: (core, { property_ids, ...weapon }) => ({ ...core, weapon, property_ids }),
    create: (body) => api.items.createWeapon(body),
    update: (id, body) => api.items.updateWeapon(id, body),
  },
})
