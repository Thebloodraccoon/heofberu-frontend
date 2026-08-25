import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/features/users/api.js'
import { queryKeys } from '@/lib/api/queryKeys.js'

export const useUsers = () =>
  useQuery({
    queryKey: queryKeys.users.all,
    queryFn: () => usersApi.list({ size: 100 }).then((p) => p?.items ?? []),
  })

export const useUserCount = (enabled = true) =>
  useQuery({
    queryKey: ['users', 'count'],
    queryFn: () => usersApi.list({ size: 1 }).then((p) => p?.total ?? p?.items?.length ?? 0),
    enabled,
  })

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => usersApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  })
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => usersApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  })
}

export const useUpdateMe = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => usersApi.updateMe(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.me }),
  })
}
