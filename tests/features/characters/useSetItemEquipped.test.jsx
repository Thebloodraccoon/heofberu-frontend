import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import { useSetItemEquipped } from '@/features/characters/queries.js'
import { queryKeys } from '@/lib/api/queryKeys.js'

describe('useSetItemEquipped', () => {
  it('PATCHes the stack and refreshes the inventory and the combat stats (AC/speed depend on worn items)', async () => {
    const setEquipped = vi.spyOn(charactersApi.items, 'setEquipped').mockResolvedValue({})
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const { result } = renderHook(() => useSetItemEquipped('7'), { wrapper })

    await act(() => result.current.mutateAsync({ stackId: 3, isEquipped: true }))

    expect(setEquipped).toHaveBeenCalledWith(7, 3, true)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.characters.items(7) })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.characters.combatStats(7) })
    setEquipped.mockRestore()
  })
})
