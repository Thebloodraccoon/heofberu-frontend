// Секреты мастера внутри текста статьи: блок `:::gm` … `:::`. Бэк вырезает их для
// не-ГМ сам (GET /articles/{id}, поиск); здесь — разметка блоков для ГМ-просмотра и
// режим «глазами игрока». Незакрытый блок скрывает всё до конца текста — как на бэке.
const GM_BLOCK_RE = /:::gm([\s\S]*?)(?::::|$)/g

export const GM_BLOCK_OPEN = ':::gm'
export const GM_BLOCK_CLOSE = ':::'

// [{ secret: false, text }, { secret: true, text }, …] — пустые публичные куски отброшены.
export function splitGmBlocks(body) {
  const text = body ?? ''
  const segments = []
  let last = 0
  for (const match of text.matchAll(GM_BLOCK_RE)) {
    const before = text.slice(last, match.index)
    if (before.trim()) segments.push({ secret: false, text: before })
    segments.push({ secret: true, text: match[1] })
    last = match.index + match[0].length
  }
  const rest = text.slice(last)
  if (rest.trim()) segments.push({ secret: false, text: rest })
  return segments
}

export function stripGmBlocks(body) {
  return (body ?? '').replace(GM_BLOCK_RE, '')
}
