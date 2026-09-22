import request from '@/lib/api/httpClient.js'

export const articlesApi = {
  list: (params) => request('/api/articles', { params }),
  search: (params) => request('/api/articles/search', { params }),
  latest: (params) => request('/api/articles/latest', { params }),
  get: (id) => request(`/api/articles/${id}`),
  create: (body) => request('/api/articles', { method: 'POST', body }),
  update: (id, body) => request(`/api/articles/${id}`, { method: 'PATCH', body }),
  remove: (id) => request(`/api/articles/${id}`, { method: 'DELETE' }),
  setTags: (id, tagIds) => request(`/api/articles/${id}/tags`, { method: 'PUT', body: { tag_ids: tagIds } }),
  relations: {
    list: (id) => request(`/api/articles/${id}/relations`),
    create: (id, body) => request(`/api/articles/${id}/relations`, { method: 'POST', body }),
    remove: (id, relationId) => request(`/api/articles/${id}/relations/${relationId}`, { method: 'DELETE' }),
  },
  images: {
    upload: (id, file, { caption, sortOrder } = {}) => {
      const form = new FormData()
      form.append('image', file)
      if (caption) form.append('caption', caption)
      if (sortOrder !== undefined) form.append('sort_order', String(sortOrder))
      return request(`/api/articles/${id}/images`, { method: 'POST', body: form })
    },
    update: (id, imageId, body) =>
      request(`/api/articles/${id}/images/${imageId}`, { method: 'PATCH', body }),
    remove: (id, imageId) => request(`/api/articles/${id}/images/${imageId}`, { method: 'DELETE' }),
  },
}

export const tagsApi = {
  list: (params) => request('/api/tags', { params }),
  create: (name) => request('/api/tags', { method: 'POST', body: { name } }),
  rename: (id, name) => request(`/api/tags/${id}`, { method: 'PATCH', body: { name } }),
  remove: (id) => request(`/api/tags/${id}`, { method: 'DELETE' }),
}

export const ARTICLE_TYPES = ['lore', 'region', 'location', 'faction', 'npc', 'event', 'artifact']
export const ARTICLE_STATUSES = ['draft', 'in_review', 'published', 'archived']
export const ARTICLE_VISIBILITY = ['public', 'gm_only']

export const RELATION_TYPES = [
  'LOCATED_IN', 'MEMBER_OF', 'RULES', 'PARENT_FACTION',
  'ALLY_OF', 'ENEMY_OF', 'RELATIVE_OF', 'MENTIONS', 'SEE_ALSO', 'PARTICIPATED_IN',
]
