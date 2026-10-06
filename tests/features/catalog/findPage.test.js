import { describe, expect, it, vi } from 'vitest'
import { findCatalogPage } from '@/features/catalog/findPage.js'

describe('findCatalogPage', () => {
  it('finds the selected record on the catalog page across larger lookup batches', async () => {
    const records = Array.from({ length: 245 }, (_, index) => ({ id: index + 1 }))
    const list = vi.fn(async ({ page, size, source_type }) => {
      expect(source_type).toBe('OTHER')
      return { items: records.slice((page - 1) * size, page * size), total: records.length }
    })

    expect(await findCatalogPage(list, 172, records.length, 50, { source_type: 'OTHER' })).toBe(4)
    expect(list).toHaveBeenCalledWith({ source_type: 'OTHER', page: 2, size: 100 })
  })

  it('returns null when a record is outside the catalog list', async () => {
    const list = vi.fn(async () => ({ items: [{ id: 1 }], total: 1 }))
    expect(await findCatalogPage(list, 9, 1, 50)).toBeNull()
  })
})
