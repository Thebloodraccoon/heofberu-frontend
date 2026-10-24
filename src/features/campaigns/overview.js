import { FULL_PAGE } from './api.js'

// Итоги нельзя считать по первой странице: в составе также хранится история участий.
export async function readAllCampaignPages(loadPage) {
  const items = []
  let page = 1
  while (true) {
    const result = await loadPage({ page, size: FULL_PAGE })
    const batch = result?.items ?? []
    items.push(...batch)
    if (!batch.length || items.length >= (result?.total ?? items.length)) return items
    page += 1
  }
}

export function nextCampaignSession(sessions, now = Date.now()) {
  return sessions.filter((session) => session.status === 'planned' && session.scheduled_at && new Date(session.scheduled_at).getTime() >= now)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0] ?? null
}
