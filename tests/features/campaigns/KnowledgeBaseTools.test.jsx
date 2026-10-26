import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import AttachArticleDrawer from '@/features/campaigns/components/KnowledgeBaseTools.jsx'
import { articlesApi } from '@/features/articles/api.js'
import { campaignMaterialsApi } from '@/features/campaigns/api.js'

vi.mock('@/features/articles/pages/GmArticlesPage.jsx', () => ({ ArticleCreateForm: () => null }))

const articles = (from, count, type) => Array.from({ length: count }, (_, i) => ({ id: from + i, title: `Статья ${from + i}`, article_type: type }))

let spies = []
beforeEach(() => {
  // jsdom без раскладки: список «на экране» и без прокрутки — догружается сам.
  spies = [
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300),
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(300),
  ]
})
afterEach(() => {
  spies.forEach((spy) => spy.mockRestore())
  vi.restoreAllMocks()
})

describe('AttachArticleDrawer merged paging', () => {
  it('pages materials and lore together and stops asking a source once it is exhausted', async () => {
    const materials = vi.spyOn(campaignMaterialsApi, 'list').mockResolvedValue({ items: articles(1, 3, 'quest'), total: 3, page: 1, size: 20 })
    const lore = vi.spyOn(articlesApi, 'list').mockImplementation(({ page }) =>
      Promise.resolve(page === 1 ? { items: articles(100, 20, 'location'), total: 25, page, size: 20 } : { items: articles(120, 5, 'location'), total: 25, page, size: 20 }),
    )
    renderWithProviders(<AttachArticleDrawer kb={{ links: [], attach: vi.fn() }} onClose={vi.fn()} />, { auth: false })

    expect(await screen.findByText('Статья 124')).toBeInTheDocument()
    expect(screen.getByText('Статья 1')).toBeInTheDocument()
    await waitFor(() => expect(lore).toHaveBeenCalledTimes(2))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(materials).toHaveBeenCalledTimes(1)
    expect(lore).toHaveBeenCalledTimes(2)
    expect(lore.mock.calls.map(([params]) => params.page)).toEqual([1, 2])
  })
})
