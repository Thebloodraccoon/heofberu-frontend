// То же правило, что на бэке (status_change_allowed): активное участие может закончиться как угодно,
// закончившееся — только исключением, а назад в игру — лишь новым добавлением (история участий сохраняется).
export function allowedStatusMoves(current) {
  if (current === 'active') return ['dead', 'retired', 'removed']
  if (current === 'dead' || current === 'retired') return ['removed']
  return []
}

// Исключение забирает у игрока доступ к кампании — спрашиваем подтверждение.
export const needsConfirmation = (status) => status === 'removed'
