export const EMPTY_CHARACTER_FILTERS = { minLevel: '', maxLevel: '', classId: '', subclassId: '', playerId: '' }
export const CHARACTER_SORTS = [['name', 'По имени'], ['level-desc', 'Уровень: по убыванию'], ['level-asc', 'Уровень: по возрастанию'], ['player', 'По игроку']]

export function filterAndSortCharacters(characters, { query, filters, sort, users }) {
  const userById = new Map(users.map((user) => [Number(user.id), user.username ?? '']))
  const playerName = (character) => userById.get(Number(character.owner_id)) ?? `#${character.owner_id}`
  const search = query.trim().toLocaleLowerCase('ru')
  const compareName = (a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), 'ru') || Number(a.id) - Number(b.id)
  return characters.filter((character) => (
    (!search || `${character.name ?? ''} ${playerName(character)}`.toLocaleLowerCase('ru').includes(search)) &&
    (filters.minLevel === '' || character.level >= Number(filters.minLevel)) &&
    (filters.maxLevel === '' || character.level <= Number(filters.maxLevel)) &&
    (!filters.classId || Number(character.class_id) === Number(filters.classId)) &&
    (!filters.subclassId || Number(character.subclass_id) === Number(filters.subclassId)) &&
    (!filters.playerId || Number(character.owner_id) === Number(filters.playerId))
  )).sort((a, b) => {
    if (sort === 'level-desc') return Number(b.level) - Number(a.level) || compareName(a, b)
    if (sort === 'level-asc') return Number(a.level) - Number(b.level) || compareName(a, b)
    if (sort === 'player') return playerName(a).localeCompare(playerName(b), 'ru') || compareName(a, b)
    return compareName(a, b)
  })
}
