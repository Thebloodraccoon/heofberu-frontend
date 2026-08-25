import { catalogApi as api } from './api.js'
import {
  abilityLabels,
  damageTypeLabels,
  itemRarityLabels,
  itemTypeLabels,
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
  feats: {
    label: 'Черты',
    icon: 'Ч',
    desc: 'Особые таланты',
    api: api.feats,
    filters: [],
  },
  items: {
    label: 'Предметы',
    icon: 'Пр',
    desc: 'Оружие, броня и артефакты',
    api: api.items,
    filters: [
      { name: 'item_type', label: 'Тип предмета', options: enumOptions(itemTypeLabels) },
      { name: 'rarity', label: 'Редкость', options: enumOptions(itemRarityLabels) },
    ],
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
