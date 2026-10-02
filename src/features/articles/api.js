import request from '@/lib/api/httpClient.js'

export const articlesApi = {
  list: (params, { auth = true } = {}) => request('/articles', { params, auth }),
  search: (params, { auth = true } = {}) => request('/articles/search', { params, auth }),
  get: (id) => request(`/articles/${id}`),
  getBySlug: (slug) => request(`/articles/by-slug/${encodeURIComponent(slug)}`),
  children: (id, { auth = true } = {}) => request(`/articles/${id}/children`, { auth }),
  ancestors: (id, { auth = true } = {}) => request(`/articles/${id}/ancestors`, { auth }),
  create: (body) => request('/articles', { method: 'POST', body }),
  update: (id, body) => request(`/articles/${id}`, { method: 'PATCH', body }),
  // Статус меняется только переходами: submit (автор или основатель), publish/reject/archive/restore (основатель).
  // publish требует version — ту версию статьи, которую основатель проверил: если после неё статью
  // правили, бэк отвечает 409 и ничего не публикует.
  transition: (id, action, { version } = {}) =>
    request(`/articles/${id}/${action}`, { method: 'POST', ...(version != null ? { params: { version } } : {}) }),
  remove: (id) => request(`/articles/${id}`, { method: 'DELETE' }),
  // История версий (только ГМ). Читатели всегда получают последнюю версию и номера версии не видят.
  revisions: {
    list: (id, params) => request(`/articles/${id}/revisions`, { params }),
    get: (id, version) => request(`/articles/${id}/revisions/${version}`),
    diff: (id, version, against) =>
      request(`/articles/${id}/revisions/${version}/diff`, { params: against ? { against } : {} }),
    restore: (id, version) => request(`/articles/${id}/revisions/${version}/restore`, { method: 'POST' }),
  },
  // Предложения правок: ГМ-не-автор предлагает новое содержимое, автор или основатель принимает
  // (становится новой версией) или отклоняет. Принять нельзя, если статью правили после base_version (409).
  proposals: {
    list: (id, params) => request(`/articles/${id}/proposals`, { params }),
    get: (id, pid) => request(`/articles/${id}/proposals/${pid}`),
    create: (id, body) => request(`/articles/${id}/proposals`, { method: 'POST', body }),
    diff: (id, pid) => request(`/articles/${id}/proposals/${pid}/diff`),
    // action: accept (params { rebase: true } — сначала слить устаревшее с текущей версией) |
    // reject (body { reason }) | withdraw (только тот, кто предложил) | rebase (перенести на текущую версию).
    // Конфликт слияния — 409 с error.details { conflicts, body_conflicts, merged_body }.
    review: (id, pid, action, body, params) =>
      request(`/articles/${id}/proposals/${pid}/${action}`, { method: 'POST', body, ...(params ? { params } : {}) }),
    // Полная замена содержимого ждущего предложения (только тот, кто предложил); base_version — текущая версия статьи.
    replace: (id, pid, body) => request(`/articles/${id}/proposals/${pid}`, { method: 'PUT', body }),
  },
  setTags: (id, tagIds) => request(`/articles/${id}/tags`, { method: 'PUT', body: { tag_ids: tagIds } }),
  relations: {
    list: (id, { auth = true } = {}) => request(`/articles/${id}/relations`, { auth }),
    create: (id, body) => request(`/articles/${id}/relations`, { method: 'POST', body }),
    update: (id, relationId, body) =>
      request(`/articles/${id}/relations/${relationId}`, { method: 'PATCH', body }),
    remove: (id, relationId) => request(`/articles/${id}/relations/${relationId}`, { method: 'DELETE' }),
  },
  // Картинки статьи — просто загруженные файлы: где и с какой подписью они показаны,
  // решает Markdown (![alt](url)). Список приходит ГМ в самой статье (article.images).
  images: {
    upload: (id, file) => {
      const form = new FormData()
      form.append('image', file)
      return request(`/articles/${id}/images`, { method: 'POST', body: form })
    },
    remove: (id, imageId) => request(`/articles/${id}/images/${imageId}`, { method: 'DELETE' }),
  },
}

// Подтипы — словарь ГМ: у каждого ровно один article_type, статья берёт подтип только своего типа.
export const subtypesApi = {
  list: (articleType) => request('/articles/subtypes', { params: articleType ? { article_type: articleType } : {} }),
  create: (articleType, name) => request('/articles/subtypes', { method: 'POST', body: { article_type: articleType, name } }),
  rename: (id, name) => request(`/articles/subtypes/${id}`, { method: 'PATCH', body: { name } }),
  remove: (id) => request(`/articles/subtypes/${id}`, { method: 'DELETE' }),
}

export const tagsApi = {
  list: (params) => request('/tags', { params }),
  get: (id) => request(`/tags/${id}`),
  create: (name) => request('/tags', { method: 'POST', body: { name } }),
  rename: (id, name) => request(`/tags/${id}`, { method: 'PATCH', body: { name } }),
  remove: (id) => request(`/tags/${id}`, { method: 'DELETE' }),
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

// Править статью может её автор или основатель; чужую ГМ только читает (и смотрит историю).
export const canEditArticle = (article, user, isFounder) =>
  !!isFounder || (article?.author?.id != null && user?.id != null && String(article.author.id) === String(user.id))

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
