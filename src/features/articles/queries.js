import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { articlesApi, tagsApi } from '@/features/articles/api.js'
import { queryKeys } from '@/lib/api/queryKeys.js'

// placeholderData: пока грузится новая страница/запрос, показываем прошлые результаты,
// а не пустой скелетон — список не «мигает» при смене фильтров.
export const useArticlesPage = (params, { enabled = true } = {}) =>
  useQuery({
    queryKey: queryKeys.articles.list(params),
    queryFn: () => articlesApi.list(params),
    enabled,
    placeholderData: keepPreviousData,
  })

export const useArticlesSearch = (params) =>
  useQuery({
    queryKey: queryKeys.articles.search(params),
    queryFn: () => articlesApi.search(params),
    enabled: !!params?.q && params.q.trim().length >= 2,
    placeholderData: keepPreviousData,
  })

export const useLatestArticles = (params, { enabled = true } = {}) =>
  useQuery({
    queryKey: queryKeys.articles.latest(params),
    queryFn: () => articlesApi.latest(params),
    enabled,
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
    if (id) qc.invalidateQueries({ queryKey: queryKeys.articles.detail(id) })
  }
}

export const useArticleRelations = (id) =>
  useQuery({
    queryKey: queryKeys.articles.relations(id),
    queryFn: () => articlesApi.relations.list(Number(id)),
    enabled: !!id,
  })

export const useArticleChildren = (id) =>
  useQuery({
    queryKey: queryKeys.articles.children(id),
    queryFn: () => articlesApi.children(Number(id)),
    enabled: !!id,
  })

export const useArticleAncestors = (id) =>
  useQuery({
    queryKey: queryKeys.articles.ancestors(id),
    queryFn: () => articlesApi.ancestors(Number(id)),
    enabled: !!id,
  })

export const useTagsPage = (params) =>
  useQuery({ queryKey: queryKeys.tags.page(params), queryFn: () => tagsApi.list(params) })
