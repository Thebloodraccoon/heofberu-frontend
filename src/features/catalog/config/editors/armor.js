import { catalogApi as api } from '../../api.js'
import { ARMOR_FILTERS } from '../../components/editor/itemFilters.js'
import { armorCategoryLabels } from '@/lib/i18n/index.js'
import { itemKindCfg } from './itemShared.js'
import { optOptional, toNum, toStr } from './shared.js'

const isShield = (f) => f.armor_category === 'SHIELD'

// Доспехи и щиты (щит — armor_category SHIELD): «Основное», «Характеристики»,
// «Влияние на КД и скорость» (эффекты armor_class и speed, пока надет).
export const armorCfg = itemKindCfg({
  kind: 'ARMOR',
  label: 'Доспехи и щиты',
  singular: 'доспех',
  newTitle: 'Новый доспех или щит',
  filters: ARMOR_FILTERS,
  categoryBadge: (item) => armorCategoryLabels[item.armor_category] ?? item.armor_category,
  fields: [
    { key: 'armor_category', label: 'Категория', type: 'chips', options: optOptional(armorCategoryLabels), full: true },
    // Компактная строка (row): КД, потолок Ловкости, Сила, Скрытность; пояснения — у заголовка.
    {
      key: 'h_ac',
      label: 'Класс доспеха',
      type: 'heading',
      showWhen: (f) => !isShield(f),
      hint: 'Собственный КД доспеха — Ловкость (по категории), щит и бонусы особенностей лист досчитает сам. Потолок Ловкости — только у среднего (пусто — 2). Не хватает Силы — скорость −10 фт.',
    },
    { key: 'h_shield', label: 'Щит', type: 'heading', showWhen: isShield, hint: 'Сколько щит прибавляет к КД (обычный щит — 2).' },
    { key: 'armor_class_base', label: 'КД', type: 'stepper', min: 0, max: 30, emptyText: '—', showWhen: (f) => !isShield(f), row: 'ac' },
    { key: 'armor_class_base', label: 'Бонус к КД', type: 'stepper', min: 0, max: 10, emptyText: '—', showWhen: isShield, row: 'ac' },
    { key: 'armor_class_max_dex_bonus', label: 'Макс. Ловкость', type: 'stepper', min: 0, max: 10, emptyText: '2', showWhen: (f) => f.armor_category === 'MEDIUM', row: 'ac' },
    { key: 'strength_requirement', label: 'Мин. Сила', type: 'stepper', min: 0, max: 30, emptyText: 'Нет', showWhen: (f) => !isShield(f), row: 'ac' },
    { key: 'stealth_disadvantage', label: 'Помеха Скрытности', type: 'checkbox', showWhen: (f) => !isShield(f), row: 'ac' },
  ],
  sections: [{ type: 'itemEffects', key: 'item_effects' }],
  detail: {
    fromRecord: (r) => {
      const a = r.armor ?? {}
      return {
        armor_category: a.armor_category ?? '',
        armor_class_base: toStr(a.armor_class_base),
        armor_class_max_dex_bonus: toStr(a.armor_class_max_dex_bonus),
        strength_requirement: toStr(a.strength_requirement),
        stealth_disadvantage: !!a.stealth_disadvantage,
      }
    },
    body: (form) => ({
      armor_category: form.armor_category || null,
      armor_class_base: toNum(form.armor_class_base),
      armor_class_max_dex_bonus: toNum(form.armor_class_max_dex_bonus),
      strength_requirement: toNum(form.strength_requirement),
      stealth_disadvantage: !!form.stealth_disadvantage,
    }),
    createBody: (core, armor) => ({ ...core, armor }),
    create: (body) => api.items.createArmor(body),
    update: (id, body) => api.items.updateArmor(id, body),
  },
})
