// Владения доспехами/оружием для листа: категория (лёгкие доспехи, воинское
// оружие…) или конкретный предмет из справочника (item_id) — общий вид
// { key, label } для списка «Доспехи»/«Оружие» и таблицы владений.
// Сначала категории в порядке справочника меток, потом предметы по имени.

export function ownedProficiencyItems(list, { categoryKey, categoryLabels, itemNames = {}, itemFallback }) {
  const categoryOrder = Object.keys(categoryLabels)
  const seen = new Set()
  const categories = []
  const items = []
  for (const entry of list ?? []) {
    const value = typeof entry === 'string' ? entry : entry?.[categoryKey]
    const itemId = typeof entry === 'string' ? null : entry?.item_id
    if (itemId != null) {
      const key = `item-${itemId}`
      if (seen.has(key)) continue
      seen.add(key)
      items.push({ key, label: itemNames[itemId] ?? `${itemFallback} #${itemId}` })
    } else if (value != null) {
      if (seen.has(value)) continue
      seen.add(value)
      categories.push({ key: value, label: categoryLabels[value] ?? value })
    }
  }
  categories.sort((a, b) => categoryOrder.indexOf(a.key) - categoryOrder.indexOf(b.key))
  items.sort((a, b) => a.label.localeCompare(b.label, 'ru'))
  return [...categories, ...items]
}
