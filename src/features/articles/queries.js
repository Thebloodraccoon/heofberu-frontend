import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { articlesApi, tagsApi } from '@/features/articles/api.js'
import { queryKeys } from '@/lib/api/queryKeys.js'

export const useArticlesPage = (params, { enabled = true } = {}) =>
  useQuery({ queryKey: queryKeys.articles.list(params), queryFn: () => articlesApi.list(params), enabled })

export const useArticlesSearch = (params) =>
  useQuery({
    queryKey: queryKeys.articles.search(params),
    queryFn: () => articlesApi.search(params),
    enabled: !!params?.q && params.q.trim().length >= 2,
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

export const useTags = () =>
  useQuery({
    queryKey: queryKeys.tags.list({ size: 100 }),
    queryFn: () => tagsApi.list({ size: 100 }).then((p) => p?.items ?? []),
  })

export const useCreateTag = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name) => tagsApi.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tags.all }),
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

export const useTagsPage = (params) =>
  useQuery({ queryKey: queryKeys.tags.page(params), queryFn: () => tagsApi.list(params) })
