import { itemRarityLabels, itemTypeLabels } from '@/lib/i18n/index.js'

const enumOptions = (labels) => Object.entries(labels).map(([value, label]) => ({ value, label }))

export const ITEM_FILTERS = [
  { name: 'item_type', label: 'Тип предмета', options: enumOptions(itemTypeLabels) },
  { name: 'rarity', label: 'Редкость', options: enumOptions(itemRarityLabels) },
]
