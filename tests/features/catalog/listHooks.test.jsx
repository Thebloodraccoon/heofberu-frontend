import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { catalogApi } from '@/features/catalog/api.js'
import { useSkills } from '@/features/catalog/queries.js'

// listHook держит ссылку на функцию api с момента загрузки модуля — подменяем её моком модуля.
vi.mock('@/features/catalog/api.js', async () => {
  const actual = await vi.importActual('@/features/catalog/api.js')
  return { catalogApi: { ...actual.catalogApi, skills: { ...actual.catalogApi.skills, list: vi.fn() } } }
})

describe('catalog list hooks', () => {
  it('useSkills() and useSkills({ size: 100 }) share one cache entry and one request', async () => {
    const list = catalogApi.skills.list.mockReset().mockResolvedValue({ items: [{ id: 1, name: 'ATHLETICS' }], total: 1 })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const { result } = renderHook(() => [useSkills(), useSkills({ size: 100 })], { wrapper })

    await waitFor(() => expect(result.current[1].data).toEqual([{ id: 1, name: 'ATHLETICS' }]))
    expect(result.current[0].data).toBe(result.current[1].data)
    expect(list).toHaveBeenCalledTimes(1)
    expect(list).toHaveBeenCalledWith({ size: 100 })
  })

  it('does not request while disabled', () => {
    const list = catalogApi.skills.list.mockReset().mockResolvedValue({ items: [], total: 0 })
    const client = new QueryClient()
    const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    renderHook(() => useSkills({}, { enabled: false }), { wrapper })
    expect(list).not.toHaveBeenCalled()
  })
})
