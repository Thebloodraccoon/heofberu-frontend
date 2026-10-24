import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PublicCampaignKnowledgePage from '@/features/campaigns/pages/PublicCampaignKnowledgePage.jsx'
import CampaignKnowledgeBase from '@/features/campaigns/components/CampaignKnowledgeBase.jsx'
import CampaignEditorNav from '@/features/campaigns/components/CampaignEditorNav.jsx'

const state = vi.hoisted(() => ({ replace: vi.fn(() => Promise.resolve()), auth: {}, links: null }))
const QUEST = { id: 2, slug: 'smotritel', title: 'Пропавший смотритель', article_type: 'quest', author: { id: 5, username: 'Ария' }, tags: [], body_markdown: 'Смотритель ушёл в шторм.' }
const LORE = { id: 1, slug: 'lestnica', title: 'Лестница', article_type: 'location', author: { id: 7, username: 'Бран' }, excerpt: 'Спуск к воде.', tags: [], body_markdown: 'Сто ступеней вниз.' }
vi.mock('@/features/articles/api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, articlesApi: { ...actual.articlesApi, get: (id) => Promise.resolve(id === 2 ? QUEST : LORE) } }
})
vi.mock('@/components/ToastProvider.jsx', () => ({ useToasts: () => ({ push: vi.fn() }) }))
vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => state.auth }))
vi.mock('@/features/articles/pages/GmArticlesPage.jsx', () => ({ ArticleEditForm: ({ article, campaignMaterial, headingActions }) => <div>Конструктор: {article.title}{campaignMaterial && ' материала кампании'}{headingActions}</div> }))
vi.mock('@/features/campaigns/queries.js', () => ({
  usePublicCampaign: () => ({ data: {
    id: 9, slug: 'mayak', title: 'Проклятие маяка', author: { id: 5 }, tags: [{ id: 3, name: 'море' }],
    description_markdown: 'Старый маяк.\n:::gm\nКлад под лестницей.\n:::',
  }, isLoading: false, refetch: vi.fn() }),
  usePublicCampaignArticles: () => ({ data: state.links ?? [
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

function KnowledgeWorkspace() {
  const preset = { id: 9, slug: 'mayak', title: 'Проклятие маяка', tags: [], description_markdown: 'Старый маяк.\n:::gm\nКлад под лестницей.\n:::' }
  return <><h1>{preset.title}</h1><CampaignEditorNav slug={preset.slug} active="knowledge" /><CampaignKnowledgeBase preset={preset} /></>
}

function setup(url = '/gm/public-campaigns?slug=mayak&tab=knowledge') {
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={[url]}><Routes><Route path="/public-campaigns/:slug/knowledge" element={<PublicCampaignKnowledgePage />} /><Route path="/gm/public-campaigns" element={<KnowledgeWorkspace />} /></Routes></MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}
const list = () => within(screen.getByRole('region', { name: 'Статьи базы знаний' }))

describe('public campaign knowledge base', () => {
  beforeEach(() => { state.links = null; state.auth = { user: { id: 5 }, isGM: true, isFounder: false }; state.replace.mockClear(); vi.spyOn(window, 'scrollTo').mockImplementation(() => {}) })

  it.each([4, 5])('shows pagination in all three headings only above four records (%i)', (count) => {
    state.links = ['quest', 'session', 'location'].flatMap((type, group) => Array.from({ length: count }, (_, i) => ({ article_id: group * 100 + i + 10, slug: `${type}-${i}`, title: `${type} ${i + 1}`, article_type: type, position: i, note: '' })))
    setup()
    for (const name of ['Квесты', 'Планы сессий', 'Справка из лора']) {
      const section = within(screen.getByRole('region', { name }))
      expect(section.getAllByRole('listitem')).toHaveLength(4)
      if (count === 5) {
        const pager = section.getByRole('navigation', { name: 'Навигация по страницам' })
        expect(pager.closest('.kb-section-heading')).not.toBeNull()
        expect(within(pager).getByRole('button', { name: 'Предыдущая страница' })).toBeDisabled()
      } else expect(section.queryByRole('navigation')).not.toBeInTheDocument()
    }
  })

  it('pages each section independently and supports first and last pages', async () => {
    state.links = ['quest', 'session', 'location'].flatMap((type, group) => Array.from({ length: 9 }, (_, i) => ({ article_id: group * 100 + i + 10, slug: `${type}-${i}`, title: `${type} ${i + 1}`, article_type: type, position: i, note: '' })))
    const user = setup()
    for (const [name, type] of [['Квесты', 'quest'], ['Планы сессий', 'session'], ['Справка из лора', 'location']]) {
      const section = within(screen.getByRole('region', { name }))
      await user.click(section.getByRole('button', { name: 'Следующая страница' }))
      expect(section.getByText(`${type} 5`)).toBeVisible()
      expect(section.queryByText(`${type} 1`)).not.toBeInTheDocument()
      await user.click(section.getByRole('button', { name: 'Последняя страница' }))
      expect(section.getAllByRole('listitem')).toHaveLength(1)
      expect(section.getByText(`${type} 9`)).toBeVisible()
      expect(section.getByRole('button', { name: 'Следующая страница' })).toBeDisabled()
      await user.click(section.getByRole('button', { name: 'Первая страница' }))
      expect(section.getByText(`${type} 1`)).toBeVisible()
    }
  })

  it('returns sections to the first page when search changes', async () => {
    state.links = Array.from({ length: 9 }, (_, i) => ({ article_id: i + 10, slug: `quest-${i}`, title: `Квест ${i + 1}`, article_type: 'quest', position: i, note: '' }))
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Последняя страница' }))
    expect(screen.getByText('Квест 9')).toBeVisible()
    await user.type(screen.getByRole('searchbox', { name: 'Поиск в базе знаний' }), 'Квест 1')
    await user.click(screen.getByRole('button', { name: 'Найти' }))
    expect(screen.getByText('Квест 1')).toBeVisible()
    expect(screen.queryByRole('navigation', { name: 'Навигация по страницам' })).not.toBeInTheDocument()
  })

  it('places creation and attachment actions in their sections', () => {
    setup()
    expect(within(screen.getByRole('region', { name: 'Квесты' })).getByRole('link', { name: 'Новый квест' })).toHaveAttribute('href', '/gm/public-campaigns?slug=mayak&tab=knowledge&article=new&type=quest')
    expect(within(screen.getByRole('region', { name: 'Планы сессий' })).getByRole('link', { name: 'Новый план сессии' })).toHaveAttribute('href', '/gm/public-campaigns?slug=mayak&tab=knowledge&article=new&type=session')
    expect(within(screen.getByRole('region', { name: 'Справка из лора' })).getByRole('button', { name: 'Добавить существующую' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Новый квест или сессия' })).not.toBeInTheDocument()
  })

  it('distinguishes lore notes from editing a material and updates only the knowledge link', async () => {
    const user = setup()
    expect(screen.getByRole('link', { name: 'Редактировать: Пропавший смотритель' })).toBeVisible()
    const note = screen.getByRole('button', { name: 'Изменить пометку: Лестница' })
    expect(note).toHaveTextContent('Пометка')
    await user.click(note)
    const drawer = within(screen.getByRole('dialog', { name: 'Изменить пометку' }))
    expect(drawer.getByText(/Текст статьи не изменяется/)).toBeVisible()
    const input = drawer.getByRole('textbox', { name: 'Зачем читать' })
    expect(input).toHaveValue('Читать до первой сессии')
    await user.clear(input)
    await user.type(input, 'Подготовить карту')
    await user.click(drawer.getByRole('button', { name: 'Сохранить', exact: true }))
    await waitFor(() => expect(state.replace).toHaveBeenCalledWith({ id: 9, articles: [
      { article_id: 1, position: 0, note: 'Подготовить карту' }, { article_id: 2, position: 1, note: null },
    ] }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Подготовить карту', { exact: false })).toBeVisible()
  })

  it('labels adding a note separately and can remove a lore reference without deleting the article', async () => {
    state.links = [{ article_id: 1, slug: 'lestnica', title: 'Лестница', article_type: 'location', note: null }]
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Добавить пометку: Лестница' }))
    const drawer = within(screen.getByRole('dialog', { name: 'Добавить пометку' }))
    expect(drawer.getByRole('textbox', { name: 'Зачем читать' })).toHaveValue('')
    expect(drawer.getByText('В лоре она останется.', { exact: false })).toBeVisible()
    await user.click(drawer.getByRole('button', { name: 'Убрать из базы' }))
    await waitFor(() => expect(state.replace).toHaveBeenCalledWith({ id: 9, articles: [] }))
    expect(screen.queryByRole('link', { name: /Лестница/ })).not.toBeInTheDocument()
  })

  it('opens the existing article picker with the new action name', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Добавить существующую' }))
    expect(screen.getByRole('dialog', { name: 'Добавить существующую' })).toBeVisible()
    expect(screen.getByRole('searchbox', { name: 'Поиск статей' })).toBeVisible()
  })

  it('lists materials with search and without a campaign brief', () => {
    setup()
    const navigation = within(screen.getByRole('navigation', { name: 'Разделы публичной кампании' }))
    expect(navigation.getByRole('link', { name: 'База знаний' })).toHaveAttribute('aria-current', 'page')
    expect(navigation.getByRole('link', { name: 'Текст' })).toHaveAttribute('href', '/gm/public-campaigns?slug=mayak')
    expect(screen.getByRole('heading', { level: 1, name: 'Проклятие маяка' })).toBeVisible()
    expect(screen.getByRole('searchbox', { name: 'Поиск в базе знаний' })).toBeVisible()
    expect(list().queryByRole('link', { name: /Описание кампании/ })).not.toBeInTheDocument()
    expect(list().getByRole('link', { name: /^Квест/ })).toBeVisible()
    expect(list().getByRole('link', { name: /Лестница/ })).toBeVisible()
  })

  it('shows material authors and pending proposals, and filters by them', async () => {
    const user = setup()
    const row = list().getByRole('link', { name: /^Квест/ })
    await waitFor(() => expect(row).toHaveTextContent('@Ария'))
    expect(within(list().getByRole('link', { name: /^Квест/ })).getByText('Ждут решения: 2')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Фильтры' }))
    await user.click(screen.getByRole('button', { name: 'Ждут правок' }))
    await user.click(screen.getByRole('button', { name: 'Применить' }))
    expect(list().getByRole('link', { name: /^Квест/ })).toBeVisible()
    expect(list().queryByRole('link', { name: /Лестница/ })).not.toBeInTheDocument()
  })

  it('filters by article type in the filters drawer', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Фильтры' }))
    await user.click(screen.getByRole('button', { name: 'Квест' }))
    await user.click(screen.getByRole('button', { name: 'Применить' }))
    expect(list().getByRole('link', { name: /^Квест/ })).toBeVisible()
    expect(list().queryByRole('link', { name: /Лестница/ })).not.toBeInTheDocument()
  })

  it('reads the description without editing and lore articles with a way to the lore', async () => {
    const user = setup('/gm/public-campaigns?slug=mayak&tab=knowledge&article=about')
    expect(screen.getByText(/Клад под лестницей/)).toBeVisible()
    expect(screen.queryByRole('button', { name: /Изменить/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Ко всем статьям базы знаний/ }))
    expect(list().getByRole('link', { name: /Лестница/ })).toHaveAttribute('href', '/lore/lestnica')
  })

  it('edits a quest with the article constructor in campaign-material mode, and unlinks', async () => {
    const user = setup('/public-campaigns/mayak/knowledge?article=smotritel&edit=1')
    expect(screen.queryByRole('link', { name: /Открыть в лоре/ })).not.toBeInTheDocument()
    expect(screen.getByText('Конструктор: Пропавший смотритель материала кампании')).toBeVisible()
    expect(screen.getByRole('button', { name: /Ко всем статьям базы знаний/ })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Убрать из базы' }))
    expect(state.replace).toHaveBeenCalledWith({ id: 9, articles: [{ article_id: 1, position: 0, note: 'Читать до первой сессии' }] })
  })

  it('lets any GM edit quests and the links, not only the authors', async () => {
    state.auth = { user: { id: 77 }, isGM: true, isFounder: false }
    const user = setup('/public-campaigns/mayak/knowledge?article=smotritel&edit=1')
    expect(screen.getByText('Конструктор: Пропавший смотритель материала кампании')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Убрать из базы' }))
    expect(state.replace).toHaveBeenCalledWith({ id: 9, articles: [{ article_id: 1, position: 0, note: 'Читать до первой сессии' }] })
  })
})
