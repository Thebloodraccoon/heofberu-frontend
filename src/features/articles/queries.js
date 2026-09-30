import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { articlesApi, legacyArticleId, subtypesApi, tagsApi } from '@/features/articles/api.js'
import { queryKeys } from '@/lib/api/queryKeys.js'

// placeholderData: пока грузится новая страница/запрос, показываем прошлые результаты,
// а не пустой скелетон — список не «мигает» при смене фильтров.
export const useArticlesPage = (params, { enabled = true, publicView = false } = {}) =>
  useQuery({
    queryKey: [...queryKeys.articles.list(params), publicView],
    queryFn: () => articlesApi.list(params, { auth: !publicView }),
    enabled,
    placeholderData: (previousData, previousQuery) => previousQuery?.queryKey.at(-1) === publicView ? previousData : undefined,
  })

export const useArticlesSearch = (params, { publicView = false } = {}) =>
  useQuery({
    queryKey: [...queryKeys.articles.search(params), publicView],
    queryFn: () => articlesApi.search(params, { auth: !publicView }),
    enabled: !!params?.q && params.q.trim().length >= 2,
    placeholderData: (previousData, previousQuery) => previousQuery?.queryKey.at(-1) === publicView ? previousData : undefined,
  })

// Отдельного /latest на бэке нет: это список опубликованных, новые первыми.
export const useLatestArticles = ({ limit = 10 } = {}, { enabled = true } = {}) =>
  useQuery({
    queryKey: queryKeys.articles.latest({ limit }),
    queryFn: () => articlesApi.list({ status: 'published', sort: 'newest', size: limit }),
    select: (page) => page.items,
    enabled,
  })

// Выбор статьи (родитель, связь, список ГМ): от 2 символов — полнотекстовый /articles/search
// (он же ищет по опечаткам в названии), иначе обычный список. Ответы совместимы: {items, total}.
export const useArticleFinder = ({ text = '', sort, ...params } = {}, { enabled = true } = {}) => {
  const q = text.trim()
  const searching = q.length >= 2
  const listParams = { ...params, ...(sort ? { sort } : {}) }
  return useQuery({
    queryKey: searching ? queryKeys.articles.search({ ...params, q }) : queryKeys.articles.list(listParams),
    queryFn: () => (searching ? articlesApi.search({ ...params, q }) : articlesApi.list(listParams)),
    enabled,
    placeholderData: keepPreviousData,
  })
}

export const useArticleSubtypes = (articleType) =>
  useQuery({
    queryKey: queryKeys.articles.subtypes(articleType),
    queryFn: () => subtypesApi.list(articleType),
    staleTime: 10 * 60 * 1000,
  })

export const useCreateSubtype = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ articleType, name }) => subtypesApi.create(articleType, name),
    onSuccess: (subtype) => qc.invalidateQueries({ queryKey: queryKeys.articles.subtypes(subtype.article_type) }),
  })
}

// Чтение в лоре — по slug; старая ссылка «id-slug» (404 по slug) дочитывается по id,
// а страница затем заменяет адрес на канонический.
export const useArticleBySlug = (slug) =>
  useQuery({
    queryKey: queryKeys.articles.bySlug(slug),
    queryFn: async () => {
      try {
        return await articlesApi.getBySlug(slug)
      } catch (error) {
        const legacyId = legacyArticleId(slug)
        if (error?.status === 404 && legacyId) return articlesApi.get(legacyId)
        throw error
      }
    },
    enabled: !!slug,
  })

export const useArticleDetail = (id) =>
  useQuery({
    queryKey: queryKeys.articles.detail(id),
    queryFn: () => articlesApi.get(Number(id)),
    enabled: !!id,
  })

// Тегов много, поэтому списком целиком их не тянем: поиск идёт на сервере
// (?search=, ?sort=popular|name), страница до 100 штук + total для подсказки «уточните».
export const useTagSearch = ({ search = '', sort = 'popular', size = 100 } = {}) => {
  const params = { sort, size, ...(search ? { search } : {}) }
  return useQuery({
    queryKey: queryKeys.tags.list(params),
    queryFn: () => tagsApi.list(params),
    placeholderData: keepPreviousData,
  })
}

// В URL фильтра лежат только id тегов — имена для чипов добираем по одному
// (и кэшируем надолго; модалка сама кладёт имена в кэш через rememberTags).
export const useTagsByIds = (ids) =>
  useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.tags.detail(id),
      queryFn: () => tagsApi.get(id),
      staleTime: 30 * 60 * 1000,
    })),
    combine: (results) => ids.map((id, i) => results[i].data ?? { id, name: `#${id}` }),
  })

export const useRememberTags = () => {
  const qc = useQueryClient()
  return (tags) => tags.forEach((t) => qc.setQueryData(queryKeys.tags.detail(t.id), { id: t.id, name: t.name }))
}

export const useCreateTag = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name) => tagsApi.create(name),
    onSuccess: (tag) => {
      qc.setQueryData(queryKeys.tags.detail(tag.id), tag)
      qc.invalidateQueries({ queryKey: ['tags', 'list'] })
    },
  })
}

// Список и деталь статей инвалидируем точечно: после сохранения/удаления/загрузки картинок.
export const useInvalidateArticles = () => {
  const qc = useQueryClient()
  return (id) => {
    qc.invalidateQueries({ queryKey: ['articles', 'list'] })
    qc.invalidateQueries({ queryKey: ['articles', 'slug'] })
    if (id) qc.invalidateQueries({ queryKey: queryKeys.articles.detail(id) })
  }
}

export const useArticleRelations = (id, publicView = false) =>
  useQuery({
    queryKey: [...queryKeys.articles.relations(id), publicView],
    queryFn: () => articlesApi.relations.list(Number(id), { auth: !publicView }),
    enabled: !!id,
  })

export const useArticleChildren = (id, publicView = false) =>
  useQuery({
    queryKey: [...queryKeys.articles.children(id), publicView],
    queryFn: () => articlesApi.children(Number(id), { auth: !publicView }),
    enabled: !!id,
  })

export const useArticleAncestors = (id, publicView = false) =>
  useQuery({
    queryKey: [...queryKeys.articles.ancestors(id), publicView],
    queryFn: () => articlesApi.ancestors(Number(id), { auth: !publicView }),
    enabled: !!id,
  })

export const useTagsPage = (params) =>
  useQuery({ queryKey: queryKeys.tags.page(params), queryFn: () => tagsApi.list(params) })
