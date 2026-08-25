import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import { queryKeys } from '@/lib/api/queryKeys.js'

export const useCharacter = (id) =>
  useQuery({
    queryKey: queryKeys.characters.detail(Number(id)),
    queryFn: () => charactersApi.get(Number(id)),
    enabled: !!id,
  })

export const useMyCharacters = () =>
  useQuery({
    queryKey: queryKeys.characters.mine,
    queryFn: () => charactersApi.listMine({ size: 100 }).then((p) => p?.items ?? []),
  })

export const useAllCharacters = () =>
  useQuery({
    queryKey: queryKeys.characters.allCharacters,
    queryFn: () => charactersApi.listAll({ size: 100 }).then((p) => p?.items ?? []),
  })

export const useCharacterCount = (enabled = true) =>
  useQuery({
    queryKey: ['characters', 'count'],
    queryFn: () => charactersApi.listMine({ size: 1 }).then((p) => p?.total ?? p?.items?.length ?? 0),
    enabled,
  })

export const useCreateCharacter = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => charactersApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.characters.all }),
  })
}

export const useDeleteCharacter = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => charactersApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.characters.all }),
  })
}

const subResource =
  (keyFn, fn) =>
  (id) =>
    useQuery({
      queryKey: keyFn(Number(id)),
      queryFn: () => fn(Number(id)),
      enabled: !!id,
      select: (d) => (Array.isArray(d) ? d : d?.items ?? d?.spells ?? []),
    })

export const useCharacterSpells = subResource(queryKeys.characters.spells, charactersApi.spells.list)

export const useCharacterSpellSlots = (id) =>
  useQuery({
    queryKey: queryKeys.characters.spells(Number(id)),
    queryFn: () => charactersApi.spells.list(Number(id)),
    enabled: !!id,
    select: (d) => d?.spell_slots ?? [],
  })
export const useCharacterAttacks = subResource(queryKeys.characters.attacks, charactersApi.attacks.list)
export const useCharacterFeats = subResource(queryKeys.characters.feats, charactersApi.feats.list)
export const useCharacterFeatures = subResource(queryKeys.characters.features, charactersApi.features.list)
export const useCharacterItems = subResource(queryKeys.characters.items, charactersApi.gmPanel.items.list)
export const useCharacterConditions = subResource(queryKeys.characters.conditions, charactersApi.conditions.list)

export const useCharacterGmStats = (id) =>
  useQuery({
    queryKey: ['characters', Number(id), 'gm-panel', 'stats'],
    queryFn: () => charactersApi.gmPanel.stats(Number(id)),
    enabled: !!id,
  })

export const useCharacterMaxLevel = (id) =>
  useQuery({
    queryKey: ['characters', Number(id), 'gm-panel', 'max-level'],
    queryFn: () => charactersApi.gmPanel.maxLevel.get(Number(id)),
    enabled: !!id,
  })

export const useCharacterAsiAdjustments = (id) =>
  useQuery({
    queryKey: ['characters', Number(id), 'gm-panel', 'asi'],
    queryFn: () => charactersApi.gmPanel.asi.list(Number(id)),
    enabled: !!id,
    select: (d) => (Array.isArray(d) ? d : []),
  })

export const useCanLevelUp = (id) =>
  useQuery({
    queryKey: ['characters', Number(id), 'progression', 'can-level-up'],
    queryFn: () => charactersApi.progression.canLevelUp(Number(id)),
    enabled: !!id,
  })
