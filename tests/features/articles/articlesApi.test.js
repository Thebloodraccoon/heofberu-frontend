import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api/httpClient.js', () => ({ default: vi.fn().mockResolvedValue({}) }))
import request from '@/lib/api/httpClient.js'
import { articlesApi, canEditArticle, subtypesApi } from '@/features/articles/api.js'

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
    await articlesApi.transition(5, 'submit')
    expect(request).toHaveBeenCalledWith('/articles/5/submit', { method: 'POST' })
  })

  it('publishes a specific reviewed version', async () => {
    await articlesApi.transition(5, 'publish', { version: 3 })
    expect(request).toHaveBeenCalledWith('/articles/5/publish', { method: 'POST', params: { version: 3 } })
  })

  it('reads the version history, diffs and restores a version', async () => {
    await articlesApi.revisions.list(5, { page: 2, size: 20 })
    expect(request).toHaveBeenLastCalledWith('/articles/5/revisions', { params: { page: 2, size: 20 } })
    await articlesApi.revisions.get(5, 3)
    expect(request).toHaveBeenLastCalledWith('/articles/5/revisions/3')
    await articlesApi.revisions.diff(5, 3)
    expect(request).toHaveBeenLastCalledWith('/articles/5/revisions/3/diff', { params: {} })
    await articlesApi.revisions.diff(5, 3, 1)
    expect(request).toHaveBeenLastCalledWith('/articles/5/revisions/3/diff', { params: { against: 1 } })
    await articlesApi.revisions.restore(5, 2)
    expect(request).toHaveBeenLastCalledWith('/articles/5/revisions/2/restore', { method: 'POST' })
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

describe('canEditArticle', () => {
  it('allows the author and the founder, nobody else', () => {
    expect(canEditArticle({ author_id: 5 }, { id: 5 }, false)).toBe(true)
    expect(canEditArticle({ author_id: 5 }, { id: '5' }, false)).toBe(true)
    expect(canEditArticle({ author_id: 5 }, { id: 6 }, false)).toBe(false)
    expect(canEditArticle({ author_id: 5 }, { id: 6 }, true)).toBe(true)
    expect(canEditArticle({ author_id: null }, { id: 6 }, false)).toBe(false)
    expect(canEditArticle({ author_id: 5 }, null, false)).toBe(false)
  })
})
