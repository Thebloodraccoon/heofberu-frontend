import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import { queryKeys } from '@/lib/api/queryKeys.js'

export const useCharacters = () =>
  useQuery({
    queryKey: queryKeys.characters.all,
    queryFn: () => charactersApi.list({ size: 100 }).then((p) => p?.items ?? []),
  })

export const useCharacter = (id) =>
  useQuery({
    queryKey: queryKeys.characters.detail(Number(id)),
    queryFn: () => charactersApi.get(Number(id)),
    enabled: !!id,
  })

export const useCharacterCount = (enabled = true) =>
  useQuery({
    queryKey: ['characters', 'count'],
    queryFn: () => charactersApi.list({ size: 1 }).then((p) => p?.total ?? p?.items?.length ?? 0),
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
      select: (d) => (Array.isArray(d) ? d : d?.items ?? []),
    })

export const useCharacterSpells = subResource(queryKeys.characters.spells, charactersApi.spells.list)
export const useCharacterAttacks = subResource(queryKeys.characters.attacks, charactersApi.attacks.list)
export const useCharacterFeats = subResource(queryKeys.characters.feats, charactersApi.feats.list)
export const useCharacterFeatures = subResource(queryKeys.characters.features, charactersApi.features.list)
export const useCharacterItems = subResource(queryKeys.characters.items, charactersApi.items.list)
export const useCharacterSpellSlots = subResource(
  (id) => ['characters', id, 'spell-slots'],
  charactersApi.spellSlots.list
)
export const useCharacterConditions = subResource(queryKeys.characters.conditions, charactersApi.conditions.list)
