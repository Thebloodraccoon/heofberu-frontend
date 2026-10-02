import { useMemo } from 'react'
import { keepPreviousData, useInfiniteQuery, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
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

// Лента «Показать ещё» (история, предложения, очередь): курсорная пагинация бэка — сначала
// FEED_SIZE последних, дальше по next_cursor. Новые записи сверху не сдвигают уже загруженное.
const FEED_SIZE = 10
const useFeed = (queryKey, fetchPage, enabled = true) => {
  const q = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage({ pagination: 'cursor', size: FEED_SIZE, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: null,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled,
  })
  const items = useMemo(() => (q.data?.pages ?? []).flatMap((p) => p.items), [q.data])
  return { ...q, items }
}

// История версий для ГМ. Лежит под ключом статьи, поэтому её сбрасывает и общая инвалидация detail(id).
export const useRevisionFeed = (id) =>
  useFeed(queryKeys.articles.revisions(id, { feed: true }), (params) => articlesApi.revisions.list(Number(id), params), !!id)

// statuses — массив (бэк принимает несколько ?status=), пустой/null — все.
export const useProposalFeed = (id, statuses, { enabled = true } = {}) =>
  useFeed(
    queryKeys.articles.proposals(id, { feed: true, status: statuses ?? null }),
    (params) => articlesApi.proposals.list(Number(id), { ...params, ...(statuses?.length ? { status: statuses } : {}) }),
    !!id && enabled,
  )

export const useRevisionDiff = (id, version, against, { enabled = true } = {}) =>
  useQuery({
    queryKey: queryKeys.articles.revisionDiff(id, version, against),
    queryFn: () => articlesApi.revisions.diff(Number(id), version, against),
    enabled: !!id && !!version && enabled,
  })

export const useArticleProposals = (id, params, { enabled = true } = {}) =>
  useQuery({
    queryKey: queryKeys.articles.proposals(id, params),
    queryFn: () => articlesApi.proposals.list(Number(id), params),
    enabled: !!id && enabled,
    placeholderData: keepPreviousData,
  })

export const useProposal = (id, pid) =>
  useQuery({
    queryKey: queryKeys.articles.proposal(id, pid),
    queryFn: () => articlesApi.proposals.get(Number(id), pid),
    enabled: !!id && !!pid,
  })

export const useProposalDiff = (id, pid) =>
  useQuery({
    queryKey: queryKeys.articles.proposalDiff(id, pid),
    queryFn: () => articlesApi.proposals.diff(Number(id), pid),
    enabled: !!id && !!pid,
  })

// Создание/разбор предложения меняют и список предложений, и (при accept) версию с историей —
// всё это лежит под ключом статьи, поэтому сбрасываем его целиком.
export const useCreateProposal = (id) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => articlesApi.proposals.create(Number(id), body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.articles.detail(id) })
      qc.invalidateQueries({ queryKey: ['articles', 'list'] })
    },
  })
}

// Разрешённый конфликт: тот, кто предложил, заменяет содержимое предложения целиком.
export const useReplaceProposal = (id) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pid, body }) => articlesApi.proposals.replace(Number(id), pid, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.articles.detail(id) }),
  })
}

export const useReviewProposal = (id) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pid, action, body, params }) => articlesApi.proposals.review(Number(id), pid, action, body, params),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.articles.detail(id) })
      qc.invalidateQueries({ queryKey: ['articles', 'list'] })
    },
  })
}

const invalidateSubtypes = (qc) => qc.invalidateQueries({ queryKey: ['articles', 'subtypes'] })

export const useRenameSubtype = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, name }) => subtypesApi.rename(id, name), onSuccess: () => invalidateSubtypes(qc) })
}

export const useDeleteSubtype = () => {
  const qc = useQueryClient()
  // Статьи с этим подтипом остались без него — сбрасываем и их.
  return useMutation({ mutationFn: (id) => subtypesApi.remove(id), onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.articles.all }) })
}

export const useTagsPage = (params) =>
  useQuery({ queryKey: queryKeys.tags.page(params), queryFn: () => tagsApi.list(params) })
