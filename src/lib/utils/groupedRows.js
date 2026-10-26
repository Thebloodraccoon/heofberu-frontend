// Строки одной группы (например, «Идеалы» предыстории) в порядке показа: по id,
// несохранённые (без id) — в конце.
export const groupRows = (rows = [], groupKey, groupValue) =>
  rows
    .filter((row) => row[groupKey] === groupValue)
    .sort((a, b) => (a.id ?? Infinity) - (b.id ?? Infinity))

// Новый список всех строк после правки одной группы в панели: texts — тексты в
// нужном порядке. Бэк хранит порядок только по id, поэтому существующие id группы
// (по возрастанию) раздаются текстам по порядку: перестановка = правка текстов
// (PATCH), лишние тексты — новые строки (POST), лишние id — удаление (DELETE).
// Пустые тексты отбрасываются. Строки других групп не меняются.
export function replaceGroupRows(rows = [], groupKey, groupValue, textKey, texts = []) {
  const ids = groupRows(rows, groupKey, groupValue)
    .map((row) => row.id)
    .filter((id) => id != null)
  const next = texts
    .filter((text) => String(text ?? '').trim())
    .map((text, i) => ({ ...(ids[i] != null ? { id: ids[i] } : {}), [groupKey]: groupValue, [textKey]: text }))
  return [...rows.filter((row) => row[groupKey] !== groupValue), ...next]
}
