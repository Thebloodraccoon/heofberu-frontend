import { catalogApi as api } from './api.js'
import { ARMOR_FILTERS, GEAR_FILTERS, TOOL_FILTERS, WEAPON_FILTERS } from './components/editor/itemFilters.js'
import {
  abilityLabels,
  damageTypeLabels,
  raceSizeLabels,
  spellCastTimeLabels,
  spellDurationLabels,
  spellLevelLabels,
  spellRangeLabels,
  spellSchoolLabels,
} from '@/lib/i18n/index.js'

const enumOptions = (labels) => Object.entries(labels).map(([value, label]) => ({ value, label }))

const boolOptions = [
  { value: 'true', label: 'Да' },
  { value: 'false', label: 'Нет' },
]

export const PAGE_SIZE = 50

// Предметы — один справочник /items, но в каталоге и редакторе по разделу на вид (kind).
export const ITEM_KIND_RESOURCE = { WEAPON: 'weapons', ARMOR: 'armor', TOOL: 'tools', GEAR: 'items' }
export const isItemResource = (resource) => Object.values(ITEM_KIND_RESOURCE).includes(resource)

const itemSection = (kind, extra) => ({
  api: api.items,
  apiResource: 'items',
  itemKind: kind,
  listParams: { kind: [kind] },
  ...extra,
})

export const catalog = {
  races: {
    label: 'Расы',
    icon: 'Р',
    desc: 'Народы и их способности',
    api: api.races,
    filters: [{ name: 'race_size', label: 'Размер', options: enumOptions(raceSizeLabels) }],
  },
  classes: {
    label: 'Классы',
    icon: 'К',
    desc: 'Призвания и навыки',
    api: api.classes,
    filters: [],
  },
  skills: {
    label: 'Навыки',
    icon: 'Н',
    desc: 'Владение навыками',
    api: api.skills,
    filters: [{ name: 'ability', label: 'Характеристика', options: enumOptions(abilityLabels) }],
  },
  spells: {
    label: 'Заклинания',
    icon: 'З',
    desc: 'Заклинания всех школ',
    api: api.spells,
    filters: [
      { name: 'school', label: 'Школа', options: enumOptions(spellSchoolLabels) },
      { name: 'level', label: 'Уровень', options: enumOptions(spellLevelLabels) },
      { name: 'cast_time', label: 'Время накладывания', options: enumOptions(spellCastTimeLabels) },
      { name: 'range_type', label: 'Дистанция', options: enumOptions(spellRangeLabels) },
      { name: 'duration', label: 'Длительность', options: enumOptions(spellDurationLabels) },
      { name: 'damage_type', label: 'Тип урона', options: enumOptions(damageTypeLabels) },
      { name: 'is_concentration', label: 'Концентрация', options: boolOptions },
      { name: 'is_ritual', label: 'Ритуал', options: boolOptions },
    ],
  },
  backgrounds: {
    label: 'Предыстории',
    icon: 'П',
    desc: 'Происхождение героя',
    api: api.backgrounds,
    filters: [],
  },
  weapons: itemSection('WEAPON', { label: 'Оружие', icon: 'Ор', desc: 'Мечи, луки и прочее оружие', filters: WEAPON_FILTERS }),
  armor: itemSection('ARMOR', { label: 'Доспехи и щиты', icon: 'Д', desc: 'Доспехи и щиты', filters: ARMOR_FILTERS }),
  tools: itemSection('TOOL', { label: 'Инструменты', icon: 'И', desc: 'Инструменты и наборы', filters: TOOL_FILTERS }),
  items: itemSection('GEAR', { label: 'Предметы', icon: 'Пр', desc: 'Зелья, кольца, снаряжение и артефакты', filters: GEAR_FILTERS }),
  feats: {
    label: 'Черты',
    icon: 'Ч',
    desc: 'Особые таланты',
    api: api.feats,
    filters: [],
  },
  features: {
    label: 'Особенности',
    icon: 'Ос',
    desc: 'Особенности вне классов и рас',
    api: api.features,
    filters: [],
    listParams: { source_type: 'OTHER' },
  },
}
