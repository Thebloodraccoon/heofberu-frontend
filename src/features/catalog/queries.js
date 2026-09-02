import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@/features/catalog/api.js'
import { queryKeys } from '@/lib/api/queryKeys.js'

const items = (page) => page?.items ?? []

const listHook = (key, fn) => (params = {}) =>
  useQuery({
    queryKey: key(params),
    queryFn: () => fn({ size: 100, ...params }).then(items),
  })

export const useRaces = listHook(queryKeys.catalog.races, catalogApi.races.list)
export const useClasses = listHook(queryKeys.catalog.classes, catalogApi.classes.list)
export const useBackgrounds = listHook(queryKeys.catalog.backgrounds, catalogApi.backgrounds.list)
export const useSkills = listHook(queryKeys.catalog.skills, catalogApi.skills.list)
export const useSpells = listHook(queryKeys.catalog.spells, catalogApi.spells.list)
export const useFeats = listHook(queryKeys.catalog.feats, catalogApi.feats.list)
export const useFeatures = listHook(queryKeys.catalog.features, catalogApi.features.list)
export const useItems = listHook(queryKeys.catalog.items, catalogApi.items.list)

export const useRaceDetail = (id) =>
  useQuery({
    queryKey: queryKeys.catalog.raceDetail(id),
    queryFn: () => catalogApi.races.get(Number(id)),
    enabled: !!id,
  })

export const useRaceFeatures = (id) =>
  useQuery({
    queryKey: ['catalog', 'races', id, 'features'],
    queryFn: () => catalogApi.races.features.list(Number(id)),
    enabled: !!id,
    select: (data) => (Array.isArray(data) ? data : []),
  })

export const useSubraceDetail = (raceId, subraceId) =>
  useQuery({
    queryKey: ['catalog', 'races', raceId, 'subraces', subraceId],
    queryFn: () => catalogApi.races.subraces.get(Number(raceId), Number(subraceId)),
    enabled: !!raceId && !!subraceId,
  })

export const useSubracesForRace = (raceId) =>
  useQuery({
    queryKey: ['catalog', 'races', raceId, 'subraces'],
    queryFn: () =>
      catalogApi.races.subraces.list(Number(raceId)).then((r) => (Array.isArray(r) ? r : r?.items ?? [])),
    enabled: !!raceId,
  })

export const useClassDetail = (id) =>
  useQuery({
    queryKey: queryKeys.catalog.classDetail(id),
    queryFn: () => catalogApi.classes.get(Number(id)),
    enabled: !!id,
  })

export const useSubclassDetail = (classId, subclassId) =>
  useQuery({
    queryKey: ['catalog', 'classes', classId, 'subclasses', subclassId],
    queryFn: () => catalogApi.classes.subclasses.get(Number(classId), Number(subclassId)),
    enabled: !!classId && !!subclassId,
  })

export const useItemDetail = (id) =>
  useQuery({
    queryKey: ['catalog', 'items', id],
    queryFn: () => catalogApi.items.get(Number(id)),
    enabled: !!id,
  })

export const useBackgroundDetail = (id) =>
  useQuery({
    queryKey: queryKeys.catalog.backgroundDetail(id),
    queryFn: () => catalogApi.backgrounds.get(Number(id)),
    enabled: !!id,
  })

export const useCatalogList = (resource, params = {}) =>
  useQuery({
    queryKey: queryKeys.catalog[resource]?.(params) ?? ['catalog', resource, params],
    queryFn: () => catalogApi[resource].list({ size: 100, ...params }).then(items),
  })

export const useCatalogPage = (resource, params = {}) =>
  useQuery({
    queryKey: ['catalog', resource, 'page', params],
    queryFn: () => catalogApi[resource].list({ size: 20, ...params }),
  })

export const useFeatsFull = () =>
  useQuery({
    queryKey: ['catalog', 'feats', 'full'],
    queryFn: async () => {
      const page = await catalogApi.feats.list({ size: 100 })
      const list = page?.items ?? []
      const full = await Promise.all(list.map((f) => catalogApi.feats.get(f.id).catch(() => null)))
      return full.filter(Boolean)
    },
    staleTime: Infinity,
  })

const fetchAllPages = async (fn, params = {}) => {
  const size = 100
  let page = 1
  let out = []
  for (;;) {
    const res = await fn({ ...params, page, size })
    const batch = res?.items ?? []
    out = out.concat(batch)
    const total = Number(res?.total ?? 0)
    if (batch.length < size || (total > 0 && out.length >= total) || page >= 50) return out
    page += 1
  }
}

export const useAllFeats = (search = '') =>
  useQuery({
    queryKey: ['catalog', 'feats', 'all', search],
    queryFn: () => fetchAllPages(catalogApi.feats.list, { search: search || undefined }),
    placeholderData: (prev) => prev,
  })

export const useFeatDetail = (id) =>
  useQuery({
    queryKey: ['catalog', 'feats', Number(id)],
    queryFn: () => catalogApi.feats.get(Number(id)),
    enabled: !!id,
  })

export const useSpellDetail = (id) =>
  useQuery({
    queryKey: ['catalog', 'spells', Number(id)],
    queryFn: () => catalogApi.spells.get(Number(id)),
    enabled: !!id,
  })
