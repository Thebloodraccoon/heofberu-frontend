import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { articlesApi } from '@/features/articles/api.js'
import { useRevisionFeed } from '@/features/articles/queries.js'

const rev = (version) => ({ version, title: `v${version}` })

describe('useRevisionFeed', () => {
  it('loads the latest page by cursor, appends the next one and stops without next_cursor', async () => {
    const pages = {
      first: { items: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3].map(rev), next_cursor: 'c2', size: 10 },
      c2: { items: [2, 1].map(rev), next_cursor: null, size: 10 },
    }
    const list = vi.spyOn(articlesApi.revisions, 'list').mockImplementation(async (_id, { cursor }) => pages[cursor ?? 'first'])
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const { result } = renderHook(() => useRevisionFeed(1), { wrapper })

    await waitFor(() => expect(result.current.items).toHaveLength(10))
    expect(list).toHaveBeenLastCalledWith(1, { pagination: 'cursor', size: 10 })
    expect(result.current.hasNextPage).toBe(true)

    await act(() => result.current.fetchNextPage())
    await waitFor(() => expect(result.current.items.map((r) => r.version)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]))
    expect(list).toHaveBeenLastCalledWith(1, { pagination: 'cursor', size: 10, cursor: 'c2' })
    expect(result.current.hasNextPage).toBe(false)
    list.mockRestore()
  })
})
