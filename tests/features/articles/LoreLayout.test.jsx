import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import LoreLayout from '@/features/articles/pages/LoreLayout.jsx'
import LorePage from '@/features/articles/pages/LorePage.jsx'
import ArticleDetailPage from '@/features/articles/pages/ArticleDetailPage.jsx'
import { ARTICLE_TYPES } from '@/features/articles/api.js'
import { articleTypeLabels } from '@/lib/i18n'

const articleVisibility = vi.hoisted(() => ({ current: 'public' }))
const articleStatus = vi.hoisted(() => ({ current: 'published' }))
const articleItems = vi.hoisted(() => ({ current: [] }))

vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => ({ isGM: true }) }))
vi.mock('@/features/articles/queries.js', () => ({
  useTagsByIds: (ids) => ids.map((id) => ({ id, name: `Тег ${id}` })),
  useRememberTags: () => vi.fn(),
  useTagSearch: () => ({ data: { items: [{ id: 1, name: 'История', usage_count: 4 }, { id: 2, name: 'Магия', usage_count: 3 }], total: 2 } }),
  useArticlesPage: (_params, { publicView } = {}) => ({ data: { items: publicView ? articleItems.current.filter((a) => a.status === 'published' && a.visibility === 'public') : articleItems.current, total: publicView ? articleItems.current.filter((a) => a.status === 'published' && a.visibility === 'public').length : 36 } }),
  useArticlesSearch: (_params, { publicView } = {}) => ({ data: { items: publicView ? articleItems.current.filter((a) => a.status === 'published' && a.visibility === 'public') : articleItems.current, total: publicView ? articleItems.current.filter((a) => a.status === 'published' && a.visibility === 'public').length : 36 } }),
  useArticleDetail: () => ({ data: { id: 1, title: 'Летопись', article_type: 'lore', status: articleStatus.current, visibility: articleVisibility.current, body_markdown: '## История\nТекст\n\n## География\nТекст\n\n:::gm\n## Тайна\nСекрет\n:::' } }),
  useArticleRelations: (_id, publicView) => ({ data: publicView ? [
    { id: 3, direction: 'outgoing', relation_type: 'SEE_ALSO', visibility: 'public', article: { id: 3, slug: 'public', title: 'Открытая статья', article_type: 'lore' } },
  ] : [
    { id: 2, direction: 'outgoing', relation_type: 'SEE_ALSO', visibility: 'public', article: { id: 2, slug: 'hidden', title: 'Закрытая статья', article_type: 'lore', status: 'published', visibility: 'gm_only' } },
    { id: 3, direction: 'outgoing', relation_type: 'SEE_ALSO', visibility: 'public', article: { id: 3, slug: 'public', title: 'Открытая статья', article_type: 'lore', status: 'published', visibility: 'public' } },
    { id: 5, direction: 'incoming', relation_type: 'RULES', visibility: 'gm_only', article: { id: 5, slug: 'secret-relation', title: 'Тайная связь', article_type: 'lore', status: 'published', visibility: 'public' } },
  ] }),
  useArticleAncestors: () => ({ data: [] }),
  useArticleChildren: (_id, publicView) => ({ data: publicView ? [
    { id: 6, slug: 'public-child', title: 'Открытый дочерний раздел', article_type: 'lore' },
  ] : [
    { id: 4, slug: 'hidden-child', title: 'Закрытый дочерний раздел', article_type: 'lore', status: 'published', visibility: 'gm_only' },
  ] }),
}))

function Location() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}{location.search}</output>
}

function setup(url = '/lore') {
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={[url]}><Location /><Routes><Route path="/lore" element={<LoreLayout />}><Route index element={<LorePage />} /><Route path=":idSlug" element={<ArticleDetailPage />} /></Route></Routes></MemoryRouter>)
  return user
}

beforeEach(() => {
  sessionStorage.clear()
  articleVisibility.current = 'public'
  articleStatus.current = 'published'
  articleItems.current = []
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

describe('Lore navigation and filters', () => {
  it('opens the article list at the top from the home page', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/']}><Routes>
      <Route path="/" element={<Link to="/lore">Все статьи</Link>} />
      <Route path="/lore" element={<LoreLayout />}><Route index element={<LorePage />} /></Route>
    </Routes></MemoryRouter>)
    window.scrollTo.mockClear()
    await user.click(screen.getByRole('link', { name: 'Все статьи' }))
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('applies types and tags together, preserves search and resets the page', async () => {
    const user = setup('/lore?q=мир&page=3')
    await user.click(screen.getByRole('button', { name: 'Фильтры' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: articleTypeLabels[ARTICLE_TYPES[0]], exact: true }))
    await user.click(within(dialog).getByRole('button', { name: /#История/ }))
    await user.click(within(dialog).getByRole('button', { name: /#Магия/ }))
    await user.click(within(dialog).getByRole('checkbox'))
    expect(screen.getByTestId('location').textContent).toBe('/lore?q=мир&page=3')
    await user.click(within(dialog).getByRole('button', { name: 'Применить' }))
    const params = new URLSearchParams(screen.getByTestId('location').textContent.split('?')[1])
    expect(params.get('q')).toBe('мир')
    expect(params.get('type')).toBe(ARTICLE_TYPES[0])
    expect(params.get('tags')).toBe('1,2')
    expect(params.get('match')).toBe('all')
    expect(params.has('page')).toBe(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('discards draft changes on Escape and restores focus', async () => {
    const user = setup('/lore?page=2')
    const trigger = screen.getByRole('button', { name: 'Фильтры' })
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: articleTypeLabels[ARTICLE_TYPES[0]], exact: true }))
    await user.keyboard('{Escape}')
    expect(screen.getByTestId('location')).toHaveTextContent('/lore?page=2')
    expect(trigger).toHaveFocus()
    expect(document.body.style.overflow).toBe('')
  })

  it('reset immediately clears applied filters while preserving the query', async () => {
    const user = setup(`/lore?q=мир&type=${ARTICLE_TYPES[0]}&tags=1,2&match=all&page=2`)
    await user.click(screen.getByRole('button', { name: /Фильтры/ }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Сбросить' }))
    const params = new URLSearchParams(screen.getByTestId('location').textContent.split('?')[1])
    expect([...params.keys()]).toEqual(['q'])
    expect(params.get('q')).toBe('мир')
  })

  it('shows detail navigation without search and places editing beside player view', () => {
    setup('/lore/1-history?tags=1')
    expect(screen.queryByRole('searchbox', { name: 'Поиск по статьям' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Поиск' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ко всем статьям' })).toHaveAttribute('href', '/lore?tags=1')
    expect(screen.getByRole('switch', { name: 'Глазами игрока' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Редактировать' })).toHaveAttribute('href', '/gm/articles?id=1')
  })

  it('uses the shared paginator for boundary navigation', async () => {
    const user = setup('/lore?tags=1')
    await user.click(screen.getByRole('button', { name: 'Последняя страница' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/lore?tags=1&page=3')
    await user.click(screen.getByRole('button', { name: 'Первая страница' }))
    expect(screen.getByTestId('location').textContent).toBe('/lore?tags=1')
  })

  it('removes secret headings from the table of contents in player view', async () => {
    const user = setup('/lore/1-history')
    expect(within(screen.getByRole('navigation', { name: 'Оглавление статьи' })).getByRole('link', { name: 'Тайна' })).toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Глазами игрока' }))
    const toc = screen.getByRole('navigation', { name: 'Оглавление статьи' })
    expect(within(toc).queryByRole('link', { name: 'Тайна' })).not.toBeInTheDocument()
    expect(within(toc).getAllByRole('link')).toHaveLength(2)
    expect(screen.queryByRole('heading', { name: 'Тайна' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'История' })).toHaveAttribute('id', 'article-section-1')
    expect(screen.queryByRole('link', { name: /Закрытая статья/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Закрытый дочерний раздел/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Тайная связь/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Открытая статья/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Открытый дочерний раздел/ })).toBeInTheDocument()
  })

  it('shows only published public articles in player view', async () => {
    articleItems.current = [
      { id: 10, slug: 'published', title: 'Опубликованная', article_type: 'lore', status: 'published', visibility: 'public' },
      { id: 11, slug: 'review', title: 'На проверке', article_type: 'lore', status: 'in_review', visibility: 'public' },
      { id: 12, slug: 'default', title: 'Без ограничения', article_type: 'lore', status: 'published' },
      { id: 13, slug: 'draft', title: 'Черновик', article_type: 'lore', status: 'draft', visibility: 'public' },
      { id: 14, slug: 'gm', title: 'Для мастера', article_type: 'lore', status: 'published', visibility: 'gm_only' },
    ]
    const user = setup()
    await user.click(screen.getByRole('switch', { name: 'Глазами игрока' }))
    expect(screen.getByRole('link', { name: /Опубликованная/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /На проверке/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Без ограничения/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Черновик/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Для мастера/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Статей:/)).not.toBeInTheDocument()
  })

  it('hides an unpublished article in player view', async () => {
    articleStatus.current = 'in_review'
    const user = setup('/lore/1-history')
    await user.click(screen.getByRole('switch', { name: 'Глазами игрока' }))
    expect(screen.queryByRole('heading', { name: 'Летопись' })).not.toBeInTheDocument()
    expect(screen.getByText(/Игроки эту статью не видят/)).toBeInTheDocument()
  })

  it('shows the GM badge in article details and on GM-only related articles', () => {
    articleVisibility.current = 'gm_only'
    setup('/lore/1-history')
    const article = screen.getByRole('article')
    expect(within(article).getAllByText('ГМ')).toHaveLength(4)
    expect(screen.getByRole('heading', { name: 'Летопись' }).nextElementSibling.firstElementChild).toHaveTextContent('ГМ')
    expect(within(article).queryByText('Только для ГМ')).not.toBeInTheDocument()
    const relatedCard = screen.getByRole('link', { name: /Закрытая статья/ })
    expect(within(relatedCard).getByText('ГМ').compareDocumentPosition(within(relatedCard).getByText(articleTypeLabels.lore)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(screen.getByRole('link', { name: /Закрытый дочерний раздел/ })).getByText('ГМ')).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /Открытая статья/ })).queryByText('ГМ')).not.toBeInTheDocument()
  })

  it('shows an inline GM badge instead of a lock for a secret relation', () => {
    setup('/lore/1-history')
    const card = screen.getByRole('link', { name: /Тайная связь/ })
    expect(within(card).getByText('ГМ')).toHaveAttribute('data-tone', 'violet')
    expect(card).toHaveTextContent('Правит этой статьёй')
    expect(within(card).getByText('ГМ').compareDocumentPosition(within(card).getByText(articleTypeLabels.lore)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(card).not.toHaveTextContent('🔒')
  })

  it('returns to the top when opening a related article', async () => {
    const user = setup('/lore/1-history')
    window.scrollTo.mockClear()
    await user.click(screen.getByRole('link', { name: /Открытая статья/ }))
    expect(screen.getByTestId('location')).toHaveTextContent('/lore/3-public')
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('shows player view and editing in the same navigation row', () => {
    setup('/lore/1-history')
    const navigation = screen.getByRole('link', { name: 'Ко всем статьям' }).parentElement
    expect(within(navigation).getByRole('switch', { name: 'Глазами игрока' })).toBeInTheDocument()
    expect(within(navigation).getByRole('link', { name: 'Редактировать' })).toBeInTheDocument()
    expect(within(navigation).queryByRole('button', { name: 'Поиск' })).not.toBeInTheDocument()
  })
})
