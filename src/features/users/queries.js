import { useMemo } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/features/users/api.js'
import { queryKeys } from '@/lib/api/queryKeys.js'

export const useUsers = (options = {}) =>
  useQuery({
    queryKey: queryKeys.users.all,
    queryFn: () => usersApi.list({ size: 100 }).then((p) => p?.items ?? []),
    enabled: options.enabled !== false,
  })

// id → имя для подписей «кто правил» (список пользователей доступен ГМ).
export const useUserNames = (enabled = true) => {
  const { data } = useUsers({ enabled })
  return useMemo(() => new Map((data ?? []).map((u) => [u.id, u.username])), [data])
}

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

export const useUsersPage = (params) =>
  useQuery({
    queryKey: [...queryKeys.users.all, 'page', params],
    queryFn: () => usersApi.list(params),
    placeholderData: keepPreviousData,
  })

export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => usersApi.update(id, body),
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

export const useFlushCache = () => useMutation({ mutationFn: () => usersApi.flushCache() })

export const useUpdateMe = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => usersApi.updateMe(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.me }),
  })
}
