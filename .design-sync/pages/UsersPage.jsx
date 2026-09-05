// Design-sync reference wrapper around the real admin users page
// (src/features/users/pages/UsersPage.jsx). Seeds the exact React Query
// cache key useUsers() reads — no router/auth context needed, the real page
// doesn't use either.
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api/queryKeys.js'
import RealUsersPage from '@/features/users/pages/UsersPage.jsx'

const USERS = [
  { id: 1, username: 'thordak_gm', email: 'thordak@heofberu.local', role: 'found_father', created_at: '2025-01-12T10:00:00Z' },
  { id: 2, username: 'elyra', email: 'elyra@heofberu.local', role: 'gm', created_at: '2025-03-02T10:00:00Z' },
  { id: 3, username: 'wanderer42', email: 'wanderer42@example.com', role: 'player', created_at: '2025-06-18T10:00:00Z' },
  { id: 4, username: 'moonshadow', email: 'moonshadow@example.com', role: 'player', created_at: '2025-08-01T10:00:00Z' },
]

function seedQueryClient(qc) {
  qc.setQueryData(queryKeys.users.all, USERS)
}

/** Admin user-management page — user table with role badges + create form. */
export function UsersPage() {
  const [queryClient] = useState(() => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60000, retry: false } } })
    seedQueryClient(qc)
    return qc
  })
  return (
    <QueryClientProvider client={queryClient}>
      <RealUsersPage />
    </QueryClientProvider>
  )
}
