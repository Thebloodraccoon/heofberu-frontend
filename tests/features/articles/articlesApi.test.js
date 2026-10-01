import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api/httpClient.js', () => ({ default: vi.fn().mockResolvedValue({}) }))
import request from '@/lib/api/httpClient.js'
import { articlesApi, subtypesApi } from '@/features/articles/api.js'

describe('articlesApi', () => {
  beforeEach(() => request.mockClear())

  it('replaces tags with a tag_ids body', async () => {
    await articlesApi.setTags(5, [1, 2])
    expect(request).toHaveBeenCalledWith('/articles/5/tags', { method: 'PUT', body: { tag_ids: [1, 2] } })
  })

  it('uploads an image as multipart form data', async () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    await articlesApi.images.upload(5, file)
    const [path, opts] = request.mock.calls[0]
    expect(path).toBe('/articles/5/images')
    expect(opts.method).toBe('POST')
    expect(opts.body.get('image')).toBeInstanceOf(File)
    // Подпись и порядок живут в Markdown — в форму они больше не уходят.
    expect([...opts.body.keys()]).toEqual(['image'])
  })

  it('changes status only through a workflow action endpoint', async () => {
    await articlesApi.transition(5, 'publish')
    expect(request).toHaveBeenCalledWith('/articles/5/publish', { method: 'POST' })
  })

  it('lists and creates subtypes of one article type', async () => {
    await subtypesApi.list('location')
    expect(request).toHaveBeenCalledWith('/articles/subtypes', { params: { article_type: 'location' } })
    await subtypesApi.create('location', 'Таверна')
    expect(request).toHaveBeenCalledWith('/articles/subtypes', {
      method: 'POST',
      body: { article_type: 'location', name: 'Таверна' },
    })
  })
})
