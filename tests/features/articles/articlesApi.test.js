import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api/httpClient.js', () => ({ default: vi.fn().mockResolvedValue({}) }))
import request from '@/lib/api/httpClient.js'
import { articlesApi } from '@/features/articles/api.js'

describe('articlesApi', () => {
  beforeEach(() => request.mockClear())

  it('replaces tags with a tag_ids body', async () => {
    await articlesApi.setTags(5, [1, 2])
    expect(request).toHaveBeenCalledWith('/api/articles/5/tags', { method: 'PUT', body: { tag_ids: [1, 2] } })
  })

  it('uploads an image as multipart form data', async () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    await articlesApi.images.upload(5, file, { caption: 'Врата', sortOrder: 1 })
    const [path, opts] = request.mock.calls[0]
    expect(path).toBe('/api/articles/5/images')
    expect(opts.method).toBe('POST')
    expect(opts.body.get('caption')).toBe('Врата')
    expect(opts.body.get('sort_order')).toBe('1')
    expect(opts.body.get('image')).toBeInstanceOf(File)
  })
})
