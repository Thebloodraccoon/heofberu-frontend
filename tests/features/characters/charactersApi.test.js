import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api/httpClient.js', () => ({ default: vi.fn().mockResolvedValue({}) }))
import request from '@/lib/api/httpClient.js'
import { charactersApi } from '@/features/characters/api.js'

describe('charactersApi', () => {
  beforeEach(() => request.mockClear())

  it('lists own characters with scope=mine', async () => {
    await charactersApi.listMine({ size: 100 })
    expect(request).toHaveBeenCalledWith('/characters', { params: { size: 100, scope: 'mine' } })
  })

  it('lists every character with scope=all', async () => {
    await charactersApi.listAll({ size: 100 })
    expect(request).toHaveBeenCalledWith('/characters', { params: { size: 100, scope: 'all' } })
  })

  it('passes cursor params through to the list', async () => {
    await charactersApi.list({ pagination: 'cursor', size: 20 })
    expect(request).toHaveBeenCalledWith('/characters', { params: { pagination: 'cursor', size: 20 } })
  })

  it('removes a spell via a resource URL', async () => {
    await charactersApi.spells.remove(3, 5)
    expect(request).toHaveBeenCalledWith('/characters/3/spells/5', { method: 'DELETE' })
  })

  it('updates and removes a condition via a resource URL', async () => {
    await charactersApi.conditions.update(3, 'EXHAUSTION', { exhaustion_level: 2 })
    expect(request).toHaveBeenCalledWith('/characters/3/conditions/EXHAUSTION', {
      method: 'PATCH',
      body: { exhaustion_level: 2 },
    })
    await charactersApi.conditions.remove(3, 'POISONED')
    expect(request).toHaveBeenCalledWith('/characters/3/conditions/POISONED', { method: 'DELETE' })
  })
})
