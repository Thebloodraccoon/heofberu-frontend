import request from '@/lib/api/httpClient.js'

export const articlesApi = {
  list: (params, { auth = true } = {}) => request('/api/articles', { params, auth }),
  search: (params, { auth = true } = {}) => request('/api/articles/search', { params, auth }),
  get: (id) => request(`/api/articles/${id}`),
  getBySlug: (slug) => request(`/api/articles/by-slug/${encodeURIComponent(slug)}`),
  children: (id, { auth = true } = {}) => request(`/api/articles/${id}/children`, { auth }),
  ancestors: (id, { auth = true } = {}) => request(`/api/articles/${id}/ancestors`, { auth }),
  create: (body) => request('/api/articles', { method: 'POST', body }),
  update: (id, body) => request(`/api/articles/${id}`, { method: 'PATCH', body }),
  // Статус меняется только переходами: submit (ГМ), publish/reject/archive/restore (основатель).
  transition: (id, action) => request(`/api/articles/${id}/${action}`, { method: 'POST' }),
  remove: (id) => request(`/api/articles/${id}`, { method: 'DELETE' }),
  setTags: (id, tagIds) => request(`/api/articles/${id}/tags`, { method: 'PUT', body: { tag_ids: tagIds } }),
  relations: {
    list: (id, { auth = true } = {}) => request(`/api/articles/${id}/relations`, { auth }),
    create: (id, body) => request(`/api/articles/${id}/relations`, { method: 'POST', body }),
    update: (id, relationId, body) =>
      request(`/api/articles/${id}/relations/${relationId}`, { method: 'PATCH', body }),
    remove: (id, relationId) => request(`/api/articles/${id}/relations/${relationId}`, { method: 'DELETE' }),
  },
  // Картинки статьи — просто загруженные файлы: где и с какой подписью они показаны,
  // решает Markdown (![alt](url)). Список приходит ГМ в самой статье (article.images).
  images: {
    upload: (id, file) => {
      const form = new FormData()
      form.append('image', file)
      return request(`/api/articles/${id}/images`, { method: 'POST', body: form })
    },
    remove: (id, imageId) => request(`/api/articles/${id}/images/${imageId}`, { method: 'DELETE' }),
  },
}

// Подтипы — словарь ГМ: у каждого ровно один article_type, статья берёт подтип только своего типа.
export const subtypesApi = {
  list: (articleType) => request('/api/articles/subtypes', { params: articleType ? { article_type: articleType } : {} }),
  create: (articleType, name) => request('/api/articles/subtypes', { method: 'POST', body: { article_type: articleType, name } }),
}

export const tagsApi = {
  list: (params) => request('/api/tags', { params }),
  get: (id) => request(`/api/tags/${id}`),
  create: (name) => request('/api/tags', { method: 'POST', body: { name } }),
  rename: (id, name) => request(`/api/tags/${id}`, { method: 'PATCH', body: { name } }),
  remove: (id) => request(`/api/tags/${id}`, { method: 'DELETE' }),
}

export const ARTICLE_TYPES = [
  'lore', 'region', 'location', 'faction', 'npc', 'event', 'artifact',
  'deity', 'religion', 'creature', 'culture', 'language', 'document', 'condition', 'quest', 'session',
]
export const ARTICLE_STATUSES = ['draft', 'in_review', 'published', 'archived']
export const ARTICLE_VISIBILITY = ['public', 'gm_only']

export const RELATION_TYPES = [
  'LOCATED_IN', 'MEMBER_OF', 'RULES', 'PARENT_FACTION',
  'ALLY_OF', 'ENEMY_OF', 'RELATIVE_OF', 'MENTIONS', 'SEE_ALSO', 'PARTICIPATED_IN',
]

// Публичный адрес статьи — её slug (GET /articles/by-slug/{slug}). Slug меняется при
// переименовании, только пока статья ни разу не публиковалась, дальше он постоянный.
export const articlePath = (article) => `/lore/${encodeURIComponent(article.slug)}`

// Старые ссылки были вида /lore/{id}-{slug}. Если такой «slug» не нашёлся — пробуем id.
export const legacyArticleId = (param) => {
  const match = /^(\d+)-/.exec(param ?? '')
  return match ? Number(match[1]) : null
}

// Игрок видит только опубликованные публичные статьи; краткие карточки не содержат этих полей.
export const isPublicArticle = (a) => a?.status === 'published' && a?.visibility === 'public'

// Те же ограничения, что проверяет бэк (ImageStorageService) — проверяем до загрузки,
// чтобы не гонять 5 МБ ради ответа 400.
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024

export function validateImageFile(file) {
  if (!IMAGE_MIME_TYPES.includes(file.type)) {
    throw new Error(`«${file.name}»: поддерживаются только JPEG, PNG, WebP и GIF.`)
  }
  if (file.size > IMAGE_MAX_BYTES) {
    throw new Error(`«${file.name}» больше 5 МБ.`)
  }
}
