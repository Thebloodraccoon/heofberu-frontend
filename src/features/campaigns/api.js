import request from '@/lib/api/httpClient.js'

export const CAMPAIGN_STATUSES = ['planning', 'active', 'paused', 'finished', 'abandoned']
export const CAMPAIGN_CLOSED_STATUSES = ['finished', 'abandoned']
export const CAMPAIGN_SESSION_STATUSES = ['planned', 'played', 'cancelled']
export const PUBLIC_CAMPAIGN_STATUSES = ['draft', 'published', 'archived']
export const CHARACTER_VISIBILITIES = ['hidden', 'full']
// Списки на бэке страничные, size ≤ 100; посещаемость и выбор пресета берут одну полную страницу.
export const FULL_PAGE = 100

// Игровая кампания: стол одного ГМа (состав, сессии, заметки, отзывы).
export const campaignsApi = {
  list: (params) => request('/campaigns', { params }),
  get: (id) => request(`/campaigns/${id}`),
  create: (body) => request('/campaigns', { method: 'POST', body }),
  update: (id, body) => request(`/campaigns/${id}`, { method: 'PATCH', body }),
  archive: (id) => request(`/campaigns/${id}/archive`, { method: 'POST' }),
  restore: (id) => request(`/campaigns/${id}/restore`, { method: 'POST' }),
  schedule: (params) => request('/campaigns/schedule', { params }),
  roster: {
    list: (id, params) => request(`/campaigns/${id}/characters`, { params }),
    candidates: (id, params) => request(`/campaigns/${id}/characters/candidates`, { params }),
    add: (id, characterId) => request(`/campaigns/${id}/characters`, { method: 'POST', body: { character_id: characterId } }),
    setStatus: (id, participationId, status) =>
      request(`/campaigns/${id}/characters/${participationId}`, { method: 'PATCH', body: { status } }),
  },
  sessions: {
    list: (id, params) => request(`/campaigns/${id}/sessions`, { params }),
    get: (id, sessionId) => request(`/campaigns/${id}/sessions/${sessionId}`),
    create: (id, body) => request(`/campaigns/${id}/sessions`, { method: 'POST', body }),
    update: (id, sessionId, body) => request(`/campaigns/${id}/sessions/${sessionId}`, { method: 'PATCH', body }),
    remove: (id, sessionId) => request(`/campaigns/${id}/sessions/${sessionId}`, { method: 'DELETE' }),
    publish: (id, sessionId) => request(`/campaigns/${id}/sessions/${sessionId}/publish`, { method: 'POST' }),
    unpublish: (id, sessionId) => request(`/campaigns/${id}/sessions/${sessionId}/unpublish`, { method: 'POST' }),
    setAttendance: (id, sessionId, participationIds) =>
      request(`/campaigns/${id}/sessions/${sessionId}/attendance`, { method: 'PUT', body: { participation_ids: participationIds } }),
  },
  notes: {
    list: (id, params) => request(`/campaigns/${id}/notes`, { params }),
    create: (id, body) => request(`/campaigns/${id}/notes`, { method: 'POST', body }),
    update: (id, noteId, body) => request(`/campaigns/${id}/notes/${noteId}`, { method: 'PATCH', body }),
    remove: (id, noteId) => request(`/campaigns/${id}/notes/${noteId}`, { method: 'DELETE' }),
  },
  reviews: {
    list: (id, params) => request(`/campaigns/${id}/reviews`, { params }),
    write: (id, body) => request(`/campaigns/${id}/review`, { method: 'PUT', body }),
    remove: (id) => request(`/campaigns/${id}/review`, { method: 'DELETE' }),
    hide: (reviewId) => request(`/campaign-reviews/${reviewId}/hide`, { method: 'POST' }),
    unhide: (reviewId) => request(`/campaign-reviews/${reviewId}/unhide`, { method: 'POST' }),
    session: {
      list: (id, sessionId, params) => request(`/campaigns/${id}/sessions/${sessionId}/reviews`, { params }),
      write: (id, sessionId, body) => request(`/campaigns/${id}/sessions/${sessionId}/review`, { method: 'PUT', body }),
      remove: (id, sessionId) => request(`/campaigns/${id}/sessions/${sessionId}/review`, { method: 'DELETE' }),
    },
  },
}

// Публичная кампания (пресет): зазывалка, с которой любой ГМ может начать свою игровую кампанию.
export const publicCampaignsApi = {
  list: (params) => request('/public-campaigns', { params }),
  getBySlug: (slug) => request(`/public-campaigns/by-slug/${encodeURIComponent(slug)}`),
  create: (body) => request('/public-campaigns', { method: 'POST', body }),
  update: (id, body) => request(`/public-campaigns/${id}`, { method: 'PATCH', body }),
  publish: (id) => request(`/public-campaigns/${id}/publish`, { method: 'POST' }),
  unpublish: (id) => request(`/public-campaigns/${id}/unpublish`, { method: 'POST' }),
  archive: (id) => request(`/public-campaigns/${id}/archive`, { method: 'POST' }),
  articles: {
    list: (id) => request(`/public-campaigns/${id}/articles`),
    replace: (id, articles) => request(`/public-campaigns/${id}/articles`, { method: 'PUT', body: { articles } }),
  },
  characters: (id, params) => request(`/public-campaigns/${id}/characters`, { params }),
  reviews: (id, params) => request(`/public-campaigns/${id}/reviews`, { params }),
}

// Публичная карточка персонажа и её видимость (меняет только владелец).
export const characterVisibilityApi = {
  card: (id) => request(`/characters/${id}/public`, { auth: false }),
  set: (id, publicVisibility) =>
    request(`/characters/${id}/public-visibility`, { method: 'PATCH', body: { public_visibility: publicVisibility } }),
}

// Материалы кампаний в базе знаний (квесты и сессии): общий список статей их не отдаёт.
export const campaignMaterialsApi = {
  list: (params) => request('/articles/campaign-materials', { params }),
  search: (params) => request('/articles/campaign-materials/search', { params }),
}

// Кто в кампании ГМ — решает бэк (viewer_role), а не глобальная роль: ГМ-игрок чужого стола видит её как игрок.
export const isCampaignGm = (campaign) => campaign?.viewer_role === 'gm'
export const isCampaignClosed = (campaign) => Boolean(campaign?.archived_at) || CAMPAIGN_CLOSED_STATUSES.includes(campaign?.status)
