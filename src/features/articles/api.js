import request from '@/lib/api/httpClient.js'

export const articlesApi = {
  list: (params) => request('/api/articles', { params }),
  search: (params) => request('/api/articles/search', { params }),
  latest: (params) => request('/api/articles/latest', { params }),
  get: (id) => request(`/api/articles/${id}`),
  children: (id) => request(`/api/articles/${id}/children`),
  ancestors: (id) => request(`/api/articles/${id}/ancestors`),
  create: (body) => request('/api/articles', { method: 'POST', body }),
  update: (id, body) => request(`/api/articles/${id}`, { method: 'PATCH', body }),
  remove: (id) => request(`/api/articles/${id}`, { method: 'DELETE' }),
  setTags: (id, tagIds) => request(`/api/articles/${id}/tags`, { method: 'PUT', body: { tag_ids: tagIds } }),
  relations: {
    list: (id) => request(`/api/articles/${id}/relations`),
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

// Бек не отдаёт статью по slug, только по id — поэтому в URL кладём
// «id-slug»: адрес читаемый, а роутинг по-прежнему работает через id.
export const articlePath = (article) => `/lore/${article.id}-${article.slug}`

export const parseArticleParam = (param) => {
  const match = /^\d+/.exec(param ?? '')
  return match ? Number(match[0]) : NaN
}

// Что видит игрок: опубликованная публичная статья (тот же предикат, что на бэке).
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
