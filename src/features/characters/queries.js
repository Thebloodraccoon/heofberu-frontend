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
    queryKey: queryKeys.characters.detail(id),
    queryFn: () => charactersApi.get(id),
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
