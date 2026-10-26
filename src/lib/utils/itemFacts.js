import {
  armorCategoryLabels,
  attackTypeLabels,
  damageTypeLabels,
  diceTypeLabels,
  gearTypeLabels,
  itemKindLabels,
  toolCategoryLabels,
  weaponProficiencyLabels,
} from '@/lib/i18n/index.js'

const present = (v) => v != null && v !== ''
const dice = (count, type) => (count && type ? `${count}${diceTypeLabels[type] ?? type}` : null)
const signed = (n) => `${Number(n) > 0 ? '+' : ''}${Number(n)}`

// Характеристики вида лежат во вложенных item.weapon / item.armor / item.tool
// (у прочих видов — null); строка списка GET /items несёт плоские *_category.
// Читаем то и другое одним плоским объектом.
export const flattenItem = (item = {}) => ({ ...item, ...item.weapon, ...item.armor, ...item.tool })

// Подпись вида для бейджа: у прочих предметов — их подтип (зелье, кольцо…).
export function itemKindText(item = {}) {
  if (item.kind === 'GEAR') return gearTypeLabels[item.subtype] ?? itemKindLabels.GEAR
  return item.kind ? (itemKindLabels[item.kind] ?? item.kind) : null
}

// КД доспеха по его категории: лёгкий — база + Ловкость, средний — + Ловкость
// (макс. 2, если не задано иное), тяжёлый — только база, щит — бонус.
function armorClassText(item) {
  if (!present(item.armor_class_base)) return null
  const base = item.armor_class_base
  switch (item.armor_category) {
    case 'SHIELD':
      return signed(base)
    case 'LIGHT':
      return `${base} + Ловкость`
    case 'MEDIUM':
      return `${base} + Ловкость (макс. ${item.armor_class_max_dex_bonus ?? 2})`
    default:
      return item.armor_class_max_dex_bonus ? `${base} (макс. Ловкость ${item.armor_class_max_dex_bonus})` : String(base)
  }
}

function rangeText(item) {
  if (!present(item.range_normal)) return null
  return item.range_long ? `${item.range_normal}/${item.range_long} фт.` : `${item.range_normal} фт.`
}

function categoryText(item) {
  if (item.weapon_category) return weaponProficiencyLabels[item.weapon_category] ?? item.weapon_category
  if (item.armor_category) return armorCategoryLabels[item.armor_category] ?? item.armor_category
  if (item.tool_category) return toolCategoryLabels[item.tool_category] ?? item.tool_category
  return null
}

// Строки характеристик предмета для карточки справочника и выбора предмета:
// [{ key, label, value }], только заполненные. Эффекты надетого предмета
// (speed/armor_class) сюда не входят — их рисуют отдельно.
export function itemFactRows(record = {}) {
  const item = flattenItem(record)
  const damageDice = dice(item.damage_dice_count, item.damage_dice_type)
  const damageType = item.damage_type ? (damageTypeLabels[item.damage_type] ?? item.damage_type).toLowerCase() : ''
  const properties = (item.properties ?? []).map((p) => p.name).join(', ')
  return [
    { key: 'category', label: 'Категория', value: categoryText(item) },
    item.requires_attunement != null
      ? { key: 'attunement', label: 'Настройка', value: item.requires_attunement ? 'Требуется' : 'Не требуется' }
      : null,
    { key: 'weight', label: 'Вес', value: present(item.weight) ? `${item.weight} фнт.` : null },
    { key: 'cost', label: 'Цена', value: present(item.cost_gold) ? `${item.cost_gold} зм.` : null },
    { key: 'attack', label: 'Атака', value: item.attack_type ? attackTypeLabels[item.attack_type] ?? item.attack_type : null },
    { key: 'damage', label: 'Урон', value: damageDice ? `${damageDice} ${damageType}`.trim() : null },
    { key: 'versatile', label: 'Двумя руками', value: dice(item.versatile_dice_count, item.versatile_dice_type) },
    { key: 'range', label: 'Дистанция', value: rangeText(item) },
    { key: 'ac', label: 'Класс доспеха', value: armorClassText(item) },
    { key: 'str', label: 'Требование силы', value: present(item.strength_requirement) && item.strength_requirement > 0 ? `Сила ${item.strength_requirement}` : null },
    { key: 'stealth', label: 'Скрытность', value: item.stealth_disadvantage ? 'Помеха' : null },
    // properties — для отрисовки чипами с описанием (WeaponPropertyChips); value — текстом.
    { key: 'props', label: 'Свойства оружия', value: properties || null, properties: item.properties ?? [] },
  ].filter((row) => row && row.value)
}
