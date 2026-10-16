import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PublicCampaignKnowledgePage from '@/features/campaigns/pages/PublicCampaignKnowledgePage.jsx'

const state = vi.hoisted(() => ({ replace: vi.fn(() => Promise.resolve()) }))
const QUEST = { id: 2, slug: 'smotritel', title: 'Пропавший смотритель', article_type: 'quest', author: { id: 5, username: 'Ария' }, tags: [], body_markdown: 'Смотритель ушёл в шторм.' }
const LORE = { id: 1, slug: 'lestnica', title: 'Лестница', article_type: 'location', author: { id: 7, username: 'Бран' }, excerpt: 'Спуск к воде.', tags: [], body_markdown: 'Сто ступеней вниз.' }
vi.mock('@/features/articles/api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, articlesApi: { ...actual.articlesApi, get: (id) => Promise.resolve(id === 2 ? QUEST : LORE) } }
})
vi.mock('@/components/ToastProvider.jsx', () => ({ useToasts: () => ({ push: vi.fn() }) }))
vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => ({ user: { id: 5 }, isFounder: false }) }))
vi.mock('@/features/articles/pages/GmArticlesPage.jsx', () => ({ ArticleEditForm: ({ article, campaignMaterial }) => <div>Конструктор: {article.title}{campaignMaterial && ' материала кампании'}</div> }))
vi.mock('@/features/campaigns/queries.js', () => ({
  usePublicCampaign: () => ({ data: {
    id: 9, slug: 'mayak', title: 'Проклятие маяка', author: { id: 5 }, tags: [{ id: 3, name: 'море' }],
    description_markdown: 'Старый маяк.\n:::gm\nКлад под лестницей.\n:::',
  }, isLoading: false, refetch: vi.fn() }),
  usePublicCampaignArticles: () => ({ data: [
    { article_id: 1, slug: 'lestnica', title: 'Лестница', article_type: 'location', position: 0, note: 'Читать до первой сессии' },
    { article_id: 2, slug: 'smotritel', title: 'Пропавший смотритель', article_type: 'quest', position: 1, note: null },
  ], isLoading: false }),
  useReplacePublicCampaignArticles: () => ({ mutateAsync: state.replace, isPending: false }),
  useCampaignMaterials: (params) => ({ data: { items: params?.has_pending_proposals ? [{ id: 2, pending_proposals: 2 }] : [] }, isLoading: false }),
}))
vi.mock('@/features/articles/queries.js', () => ({
  useTagSearch: () => ({ data: { items: [] }, isLoading: false }),
  useArticleFinder: () => ({ data: { items: [] }, isLoading: false }),
  useInvalidateArticles: () => vi.fn(),
  useArticleDetail: (id) => ({ data: id === 2 ? QUEST : LORE, isLoading: false }),
  useArticleBySlug: (slug) => ({ data: slug ? (slug === 'smotritel' ? QUEST : LORE) : undefined, isLoading: false }),
}))

function setup(url = '/public-campaigns/mayak/knowledge') {
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={[url]}><Routes><Route path="/public-campaigns/:slug/knowledge" element={<PublicCampaignKnowledgePage />} /></Routes></MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}
const list = () => within(screen.getByRole('region', { name: 'Статьи базы знаний' }))

describe('public campaign knowledge base', () => {
  it('lists the campaign articles like the lore and searches them', async () => {
    const user = setup()
    expect(screen.getByRole('heading', { level: 1, name: 'Проклятие маяка' })).toBeVisible()
    expect(list().getByRole('link', { name: /Описание кампании/ })).toBeVisible()
    await user.type(screen.getByRole('searchbox', { name: 'Поиск в базе знаний' }), 'смотр{Enter}')
    expect(list().getByRole('link', { name: /Пропавший смотритель/ })).toBeVisible()
    expect(list().queryByRole('link', { name: /Лестница/ })).not.toBeInTheDocument()
  })

  it('shows authors, short descriptions and pending proposals, and filters by them', async () => {
    const user = setup()
    const row = await list().findByRole('link', { name: /Лестница/ })
    await waitFor(() => expect(row).toHaveTextContent('@Бран'))
    expect(row).toHaveTextContent('Спуск к воде.')
    expect(within(list().getByRole('link', { name: /Пропавший смотритель/ })).getByText('Ждут решения: 2')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Фильтры' }))
    await user.click(screen.getByRole('button', { name: 'Ждут правок' }))
    await user.click(screen.getByRole('button', { name: 'Применить' }))
    expect(list().getByRole('link', { name: /Пропавший смотритель/ })).toBeVisible()
    expect(list().queryByRole('link', { name: /Лестница/ })).not.toBeInTheDocument()
  })

  it('filters by article type in the filters drawer', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Фильтры' }))
    await user.click(screen.getByRole('button', { name: 'Квест' }))
    await user.click(screen.getByRole('button', { name: 'Применить' }))
    expect(list().getByRole('link', { name: /Пропавший смотритель/ })).toBeVisible()
    expect(list().queryByRole('link', { name: /Лестница/ })).not.toBeInTheDocument()
  })

  it('reads the description without editing and lore articles with a way to the lore', async () => {
    const user = setup()
    await user.click(list().getByRole('link', { name: /Описание кампании/ }))
    expect(screen.getByText(/Клад под лестницей/)).toBeVisible()
    expect(screen.queryByRole('button', { name: /Изменить/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Ко всем статьям базы знаний/ }))
    await user.click(list().getByRole('link', { name: /Лестница/ }))
    expect(screen.getByText('Сто ступеней вниз.')).toBeVisible()
    expect(screen.getByRole('link', { name: /Открыть в лоре/ })).toHaveAttribute('href', '/lore/lestnica')
    expect(screen.queryByRole('button', { name: /Редактировать/ })).not.toBeInTheDocument()
  })

  it('edits a quest with the article constructor in campaign-material mode, and unlinks', async () => {
    const user = setup('/public-campaigns/mayak/knowledge?article=smotritel')
    expect(screen.getByText('Смотритель ушёл в шторм.')).toBeVisible()
    expect(screen.queryByRole('link', { name: /Открыть в лоре/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Редактировать/ }))
    expect(screen.getByText('Конструктор: Пропавший смотритель материала кампании')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /Готово/ }))
    await user.click(screen.getByRole('button', { name: /Отвязать/ }))
    expect(state.replace).toHaveBeenCalledWith({ id: 9, articles: [{ article_id: 1, position: 0, note: 'Читать до первой сессии' }] })
  })
})
