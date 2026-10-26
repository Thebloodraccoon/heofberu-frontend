import { useMutation, useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { catalogApi } from '@/features/catalog/api.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { syncItemEffects } from '@/lib/utils/featureEffects.js'

const items = (page) => page?.items ?? []

// Ключ — по фактическим параметрам запроса: useSkills() и useSkills({ size: 100 }) — один кеш.
const listHook = (key, fn) => (params = {}, { enabled = true } = {}) => {
  const full = { size: 100, ...params }
  return useQuery({
    queryKey: key(full),
    queryFn: () => fn(full).then(items),
    enabled,
  })
}

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

export const useSubclassesForClass = (classId) =>
  useQuery({
    queryKey: ['catalog', 'classes', classId, 'subclasses'],
    queryFn: () =>
      catalogApi.classes.subclasses.list(Number(classId)).then((r) => (Array.isArray(r) ? r : r?.items ?? [])),
    enabled: !!classId,
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
    queryKey: queryKeys.catalog.itemDetail(Number(id)),
    queryFn: () => catalogApi.items.get(Number(id)),
    enabled: !!id,
  })

export const useBackgroundDetail = (id) =>
  useQuery({
    queryKey: queryKeys.catalog.backgroundDetail(id),
    queryFn: () => catalogApi.backgrounds.get(Number(id)),
    enabled: !!id,
  })

export const useCatalogPage = (resource, params = {}) =>
  useQuery({
    queryKey: ['catalog', resource, 'page', params],
    queryFn: () => catalogApi[resource].list({ size: 20, ...params }),
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

// Строки справочника по id (заклинания, предметы) — одним запросом списка
// GET /{resource}?id=…&id=… (по BY_IDS_CHUNK id на запрос), а не карточкой на id.
// Строка списка — лёгкая (имя, уровень/школа, вид…), не полная карточка.
// combine возвращает структурно равный результат, TanStack сохраняет ту же
// ссылку между рендерами — её можно класть в deps useMemo/useEffect.
// Справочник редко меняется, поэтому не перезапрашиваем его при каждом открытии.
const CATALOG_BY_ID_STALE_MS = 5 * 60 * 1000
const BY_IDS_CHUNK = 100

const useCatalogByIds = (resource, ids, pick) => {
  const unique = [...new Set((ids ?? []).filter((id) => id != null).map(Number))].sort((a, b) => a - b)
  const chunks = []
  for (let i = 0; i < unique.length; i += BY_IDS_CHUNK) chunks.push(unique.slice(i, i + BY_IDS_CHUNK))
  return useQueries({
    queries: chunks.map((chunk) => ({
      queryKey: ['catalog', resource, 'by-ids', chunk],
      queryFn: () => catalogApi[resource].list({ id: chunk, size: chunk.length }).then(items),
      staleTime: CATALOG_BY_ID_STALE_MS,
    })),
    combine: (results) =>
      Object.fromEntries(
        results.flatMap((r) => r.data ?? []).map((row) => [row.id, pick(row)]).filter(([, value]) => value),
      ),
  })
}

// Имена заклинаний по id: { [id]: name }.
export const useSpellNames = (ids) => useCatalogByIds('spells', ids, (spell) => spell?.name)

// Имена предметов по id (конкретное оружие и доспехи в эффектах владения).
export const useItemNames = (ids) => useCatalogByIds('items', ids, (item) => item?.name)

// Заклинания по id (тот же кеш, что у useSpellNames) — когда кроме имени нужны
// уровень и школа: { [id]: строка GET /spells }.
export const useSpellsById = (ids) => useCatalogByIds('spells', ids, (spell) => spell)

// Словарь свойств оружия — небольшой, без пагинации, отсортирован по имени.
export const useWeaponProperties = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: queryKeys.catalog.itemProperties,
    queryFn: () => catalogApi.items.properties.list(),
    select: (data) => (Array.isArray(data) ? data : []),
    staleTime: 5 * 60 * 1000,
    enabled,
  })

// Созданное свойство сразу кладём в словарь: форма оружия выбирает его тут же, и
// автосохранение до перезапроса словаря уже должно видеть его требования.
export const useCreateWeaponProperty = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => catalogApi.items.properties.create(body),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.catalog.itemProperties, (old) => [...(Array.isArray(old) ? old : []), created])
      return queryClient.invalidateQueries({ queryKey: queryKeys.catalog.itemProperties })
    },
  })
}

// Правка и удаление свойства: словарь перечитываем, а предметы — тоже (оружие
// отдаёт свойства с именами). Удаление свойства, которое стоит у оружия, — 409.
export const useUpdateWeaponProperty = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }) => catalogApi.items.properties.update(id, body),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.catalog.itemProperties }),
      queryClient.invalidateQueries({ queryKey: queryKeys.catalog.resource('items') }),
    ]),
  })
}

export const useDeleteWeaponProperty = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => catalogApi.items.properties.remove(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(queryKeys.catalog.itemProperties, (old) => (Array.isArray(old) ? old.filter((p) => p.id !== id) : old))
      return queryClient.invalidateQueries({ queryKey: queryKeys.catalog.itemProperties })
    },
  })
}

// Эффекты предмета (скорость/КД): prev → next точечными запросами (syncItemEffects).
// При сбое посреди серии часть запросов уже прошла — к ошибке прикладываем
// перечитанные эффекты (error.latest, null — если и перечитать не вышло), чтобы
// редактор считал следующий дифф от того, что реально на сервере.
export const useSyncItemEffects = (itemId) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ prev, next }) => {
      try {
        return await syncItemEffects(catalogApi.items.effects, itemId, prev, next)
      } catch (error) {
        error.latest = await catalogApi.items.effects.get(itemId).catch(() => null)
        throw error
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.catalog.resource('items') }),
  })
}
