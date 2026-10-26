// Выбранные свойства, чьи требования форма ещё не выполнила: { range, versatile } —
// имена свойств без дистанции / без урона двумя руками (бэк ответил бы 422).
// properties — словарь свойств оружия (GET /items/properties).
export function weaponPropertyGaps(form, properties = []) {
  const chosen = properties.filter((p) => (form.property_ids ?? []).includes(p.id))
  const versatileSet = Boolean(form.versatile_dice_count && form.versatile_dice_type)
  return {
    range: chosen.filter((p) => p.requires_range && !form.range_normal).map((p) => p.name),
    versatile: chosen.filter((p) => p.requires_versatile_damage && !versatileSet).map((p) => p.name),
  }
}

// Что придержать в PATCH /items/{id}/weapon, пока ГМ дозаполняет форму: свойства,
// чьи требования не выполнены (сначала добавил «Универсальное», потом кости), и
// поля, которых этим свойствам не хватает (стёртая дистанция у сохранённого
// «Метательного», кости двумя руками у «Универсального», половина пары костей), —
// иначе null ушёл бы при ещё выбранном свойстве. Без словаря требования неизвестны — ничего не держим.
export function weaponWithhold(form, properties = []) {
  const gaps = weaponPropertyGaps(form, properties)
  const held = new Set()
  if (gaps.range.length > 0 || gaps.versatile.length > 0) held.add('property_ids')
  if (gaps.range.length > 0) held.add('range_normal')
  if (gaps.versatile.length > 0 || Boolean(form.versatile_dice_count) !== Boolean(form.versatile_dice_type)) {
    held.add('versatile_dice_count')
    held.add('versatile_dice_type')
  }
  return [...held]
}
