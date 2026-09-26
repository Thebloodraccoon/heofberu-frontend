import { ARTICLE_TYPES } from '@/features/articles/api.js'

// Фильтры лора живут в URL: ?q=…&type=npc,location&tags=3,7&match=all&page=2.
// Несколько типов — через запятую (бэк принимает повторяющийся article_type).
export const parseTypes = (params) =>
  (params.get('type') ?? '').split(',').filter((t) => ARTICLE_TYPES.includes(t))

export const parseTagIds = (params) =>
  (params.get('tags') ?? '')
    .split(',')
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n > 0)
