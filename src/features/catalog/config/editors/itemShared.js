import { catalogApi as api } from '../../api.js'
import { gearTypeLabels, itemRarityLabels } from '@/lib/i18n/index.js'
import { opt, toNum, toStr } from './shared.js'

// Общее для редакторов предметов (оружие, доспехи, инструменты, прочее): вид
// (kind) задаёт сам редактор и не меняется, общие поля пишутся PATCH /items/{id},
// характеристики вида — своим PATCH /items/{id}/<detail.key>.

export const coreFields = [
  { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Длинный меч', full: true },
  { key: 'rarity', label: 'Редкость', type: 'chips', options: opt(itemRarityLabels), inline: true },
  { key: 'weight', label: 'Вес', type: 'number', unit: 'фунт.', min: 0, inline: true },
  { key: 'cost_gold', label: 'Цена', type: 'number', unit: 'зм', min: 0, inline: true },
  { key: 'requires_attunement', label: 'Требует настройки', type: 'checkbox' },
  { key: 'description', label: 'Описание', type: 'textarea', full: true },
]

// Одинаково у всех видов: название; вид (инструмента, подтип снаряжения) — своей строкой;
// редкость чипами; одной строкой (row, сетка в 4 колонки) — вес, цена и «Требует настройки»;
// описание.
const coreLayout = (kindField) => {
  const [name, rarity, weight, cost, attunement, description] = coreFields
  const row = (f, span = 1) => ({ ...f, inline: false, row: 'stats', span })
  return [
    name,
    ...(kindField ? [{ ...kindField, full: true }] : []),
    { ...rarity, inline: false, full: true },
    row(weight),
    row(cost),
    row(attunement, 2),
    description,
  ]
}

const coreFromRecord = (r) => ({
  name: r.name ?? '',
  subtype: r.subtype ?? 'OTHER',
  rarity: r.rarity ?? 'NONE',
  requires_attunement: !!r.requires_attunement,
  weight: toStr(r.weight),
  cost_gold: toStr(r.cost_gold),
  description: r.description ?? '',
})

// subtype есть только у прочих предметов (GEAR): у остальных видов бэк ответит 422.
const coreBody = (form, kind) => ({
  name: form.name,
  ...(kind === 'GEAR' ? { subtype: form.subtype || 'OTHER' } : {}),
  rarity: form.rarity,
  requires_attunement: form.requires_attunement,
  weight: toNum(form.weight),
  cost_gold: toNum(form.cost_gold),
  description: form.description,
})

const changed = (next, prev) =>
  Object.fromEntries(Object.entries(next).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(prev[key])))

// Тело POST для вида: общие поля + вложенные характеристики (detail.createBody).
export function itemCreateBody(cfg, form) {
  const core = coreBody(form, cfg.itemKind)
  return cfg.detail ? cfg.detail.createBody(core, cfg.detail.body(form)) : core
}

// PATCH только изменившихся полей, отдельно для общих полей и для характеристик
// вида: требования свойств (дистанция у «Метательного» и т.п.) бэк проверяет,
// лишь когда запрос их касается, — правка цены старого оружия не упадёт в 422.
// detail.withhold(form, ctx) — поля, которые пока придерживаем (не дозаполнены: свойство
// без нужных костей/дистанции, половина пары костей), — уйдут вместе, когда готовы.
// ctx — данные от вызывающего: { weaponProperties } — словарь свойств оружия.
export function itemPatches(cfg, form, rec, ctx = {}) {
  const prev = cfg.fromRecord(rec)
  const held = new Set(cfg.detail?.withhold?.(form, ctx) ?? [])
  const detail = cfg.detail ? changed(cfg.detail.body(form), cfg.detail.body(prev)) : {}
  return {
    core: changed(coreBody(form, cfg.itemKind), coreBody(prev, cfg.itemKind)),
    detail: Object.fromEntries(Object.entries(detail).filter(([key]) => !held.has(key))),
  }
}

// Конфиг редактора одного вида предметов для GmEditorPage (список — только этот kind).
// categoryBadge(row) — подпись категории в списке (строка списка несёт плоские *_category).
// newTitle — заголовок формы создания с правильным родом («Новое оружие», «Новый доспех»).
// statsRowField — поле вида, которое встаёт в одну строку с весом и ценой (инструменты, прочее).
export function itemKindCfg({ kind, label, singular, newTitle, fields = [], statsRowField = null, sections = [], detail = null, filters = [], categoryBadge = () => null }) {
  const fromRecord = (r) => ({ ...coreFromRecord(r), ...(detail ? detail.fromRecord(r) : {}) })
  const cfg = {
    label,
    singular,
    newTitle,
    itemKind: kind,
    // Все виды живут в одном /items: список берём через api.items с фильтром kind.
    apiResource: 'items',
    api: api.items,
    listParams: { kind: [kind] },
    filters,
    fields: [...coreLayout(statsRowField), ...fields],
    sections,
    detail,
    fromRecord,
    // После автосохранения форма перечитывается с сервера — придержанные поля
    // (см. itemPatches) оставляем из текущей формы, иначе выбор пропал бы.
    keepHeld: (fresh, form, ctx = {}) => {
      const held = detail?.withhold?.(form, ctx) ?? []
      return { ...fresh, ...Object.fromEntries(held.map((key) => [key, form[key]])) }
    },
    emptyForm: () => fromRecord({}),
    submitFields: async (form, rec, ctx = {}) => {
      if (!rec) return detail ? detail.create(itemCreateBody(cfg, form)) : api.items.create(itemCreateBody(cfg, form))
      const patch = itemPatches(cfg, form, rec, ctx)
      if (Object.keys(patch.core).length > 0) await api.items.update(rec.id, patch.core)
      if (Object.keys(patch.detail).length > 0) await detail.update(rec.id, patch.detail)
    },
    listBadges: (item) =>
      [
        kind === 'GEAR' && item.subtype ? { text: gearTypeLabels[item.subtype] ?? item.subtype, tone: 'default' } : null,
        categoryBadge(item) ? { text: categoryBadge(item), tone: 'default' } : null,
        item.rarity && item.rarity !== 'NONE' ? { text: itemRarityLabels[item.rarity] ?? item.rarity, tone: 'default' } : null,
      ].filter(Boolean),
  }
  return cfg
}
