import {
  armorCategoryLabels,
  gearTypeLabels,
  itemRarityLabels,
  toolCategoryLabels,
  weaponProficiencyLabels,
} from '@/lib/i18n/index.js'

const enumOptions = (labels) => Object.entries(labels).map(([value, label]) => ({ value, label }))

const RARITY = { name: 'rarity', label: 'Редкость', options: enumOptions(itemRarityLabels) }
const WEAPON_CATEGORY = { name: 'weapon_category', label: 'Категория оружия', options: enumOptions(weaponProficiencyLabels) }
const ARMOR_CATEGORY = { name: 'armor_category', label: 'Категория доспеха', options: enumOptions(armorCategoryLabels) }
const TOOL_CATEGORY = { name: 'tool_category', label: 'Вид инструмента', options: enumOptions(toolCategoryLabels) }

// Фильтры списка предметов (каталог и выбор предмета); name — параметр GET /items.
export const ITEM_FILTERS = [
  {
    name: 'kind',
    label: 'Вид предмета',
    options: [
      { value: 'WEAPON', label: 'Оружие' },
      { value: 'ARMOR', label: 'Доспехи' },
      { value: 'TOOL', label: 'Инструменты' },
      { value: 'GEAR', label: 'Прочее' },
    ],
  },
  RARITY,
  WEAPON_CATEGORY,
  ARMOR_CATEGORY,
  TOOL_CATEGORY,
]

// Фильтры редакторов одного вида (kind задаёт сам редактор).
export const WEAPON_FILTERS = [RARITY, WEAPON_CATEGORY]
export const ARMOR_FILTERS = [RARITY, ARMOR_CATEGORY]
export const TOOL_FILTERS = [TOOL_CATEGORY]
export const GEAR_FILTERS = [{ name: 'subtype', label: 'Тип предмета', options: enumOptions(gearTypeLabels) }, RARITY]
export const ITEM_FILTERS_BY_KIND = { WEAPON: WEAPON_FILTERS, ARMOR: ARMOR_FILTERS, TOOL: TOOL_FILTERS, GEAR: GEAR_FILTERS }
