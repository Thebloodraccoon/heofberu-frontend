import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import GmArticlesPage from '@/features/articles/pages/GmArticlesPage.jsx'

const auth = vi.hoisted(() => ({ isFounder: false, userId: 5 }))
const article = vi.hoisted(() => ({ status: 'draft', authorId: 5, version: 3 }))
const transition = vi.hoisted(() => vi.fn())
const getArticle = vi.hoisted(() => vi.fn())
const propose = vi.hoisted(() => vi.fn())
const update = vi.hoisted(() => vi.fn())
const finder = vi.hoisted(() => vi.fn())

vi.mock('@/components/ToastProvider.jsx', () => ({ useToasts: () => ({ push: vi.fn() }) }))
vi.mock('@/features/auth/useAuth.js', () => ({
  useAuth: () => ({ isGM: true, isFounder: auth.isFounder, user: { id: auth.userId } }),
}))
vi.mock('@/features/articles/api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, articlesApi: { ...actual.articlesApi, transition, get: getArticle, update } }
})
vi.mock('@/features/users/queries.js', () => ({
  useUserNames: () => new Map([[99, 'Саруман']]),
  useUsers: () => ({ data: [{ id: 5, username: 'Я', role: 'gm' }, { id: 99, username: 'Саруман', role: 'gm' }, { id: 7, username: 'Игрок', role: 'player' }] }),
}))
vi.mock('@/features/articles/queries.js', () => ({
  useTagSearch: () => ({ data: { items: [{ id: 1, name: 'История' }], total: 1 } }),
  useInvalidateArticles: () => vi.fn(),
  useArticleFinder: (params) => (finder(params), { data: { items: [{ id: 1, title: 'Летопись', article_type: 'lore', status: 'draft', subtype: { id: 7, name: 'Хроника' }, author: { id: 99, username: 'Саруман' }, pending_proposals: 2 }], total: 1 } }),
  useArticleDetail: () => ({ data: { id: 1, title: 'Летопись', article_type: 'lore', status: article.status, visibility: 'public', body_markdown: 'Исходный текст', subtype: { id: 7, name: 'Хроника' }, author: { id: article.authorId, username: article.authorId === 99 ? 'Саруман' : 'Я' }, version: article.version } }),
  useRevisionFeed: () => ({ items: [], total: 0 }),
  useProposalFeed: () => ({ items: [], total: 0 }),
  useRevisionDiff: () => ({ data: undefined }),
  useArticleSubtypes: () => ({ data: [{ id: 7, article_type: 'lore', name: 'Хроника' }] }),
  useCreateSubtype: () => ({ mutateAsync: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
  useRenameSubtype: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
  useDeleteSubtype: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
  useArticleProposals: () => ({ data: { items: [], total: 2 } }),
  useProposalDiff: () => ({ data: undefined }),
  useCreateProposal: () => ({ mutate: propose, isPending: false }),
  useReviewProposal: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/features/articles/components/TagInput.jsx', () => ({ default: () => <div>Теги статьи</div> }))
vi.mock('@/features/articles/components/ArticleRelations.jsx', () => ({ default: ({ readOnly }) => <div>Список связей{readOnly && ' (просмотр)'}</div> }))
vi.mock('@/features/articles/components/ArticleImages.jsx', () => ({ default: ({ readOnly }) => <div>Галерея статьи{readOnly && ' (просмотр)'}</div> }))
vi.mock('@/components/ui/RichTextEditor.jsx', () => ({ default: ({ value, onChange }) => <textarea aria-label="Текст статьи" value={value} onChange={onChange} /> }))

// data-router, как в App.jsx: без него не работает useBlocker (UnsavedGuard).
let router
function setup(url = '/gm/articles?id=1') {
  router = createMemoryRouter(
    [{ path: '/gm/articles', element: <GmArticlesPage /> }, { path: '/lore', element: <p>Страница лора</p> }],
    { initialEntries: [url] },
  )
  render(<RouterProvider router={router} />)
  return userEvent.setup()
}

afterEach(() => {
  vi.unstubAllGlobals()
  auth.isFounder = false
  auth.userId = 5
  article.status = 'draft'
  article.authorId = 5
  transition.mockReset()
  getArticle.mockReset()
  propose.mockReset()
  update.mockReset()
})

describe('Article editor workspace', () => {
  it('marks articles with proposals awaiting a decision in the library', () => {
    setup('/gm/articles')
    const row = screen.getByRole('button', { name: /Летопись/ })
    expect(row).toHaveClass('article-library-row--pending')
    expect(within(row).getByText('Ждёт решения: 2')).toBeVisible()
    expect(within(row).getByText('автор: Саруман')).toBeVisible()
  })

  it('sorts the article list like the lore, newest first by default', async () => {
    const user = setup('/gm/articles')
    expect(finder).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'newest', page: 1 }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Сортировка' }), 'title')
    expect(finder).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'title', page: 1 }))
  })

  it('filters the library by author and by proposals awaiting a decision from the filters drawer', async () => {
    const user = setup('/gm/articles')
    await user.click(screen.getByRole('button', { name: /Фильтры/ }))
    const authors = screen.getByRole('group', { name: 'Автор' })
    expect(within(authors).queryByRole('button', { name: 'Игрок' })).not.toBeInTheDocument()
    await user.click(within(authors).getByRole('button', { name: 'Мои статьи' }))
    await user.click(screen.getByRole('button', { name: 'Ждут решения' }))
    await user.click(screen.getByRole('button', { name: 'Применить' }))
    expect(finder).toHaveBeenLastCalledWith(expect.objectContaining({ author_id: '5', has_pending_proposals: true, page: 1 }))
    expect(screen.getByRole('button', { name: 'Убрать фильтр автора' })).toHaveTextContent('Мои статьи')
    await user.click(screen.getByRole('button', { name: 'Убрать фильтр Ждут решения' }))
    expect(finder).toHaveBeenLastCalledWith(expect.not.objectContaining({ has_pending_proposals: true }))
  })

  it('highlights pending proposals when an article is opened', async () => {
    const user = setup()
    const banner = screen.getByText('Ждут решения: 2').closest('[role="status"]')
    expect(banner).toBeVisible()
    await user.click(within(banner).getByRole('button', { name: 'Рассмотреть' }))
    expect(screen.getByRole('button', { name: 'Предложения (2)' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText(/Ждут решения: 2/)).not.toBeInTheDocument()
  })

  it('provides parent selection instead of a separate article list', () => {
    setup()
    expect(screen.queryByRole('button', { name: 'Статьи', exact: true })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Выбрать родительскую статью' })).toBeVisible()
  })

  it('asks before leaving an unsaved body edit and stays on cancel', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Изменить текст статьи' }))
    await user.type(screen.getByRole('textbox', { name: 'Текст статьи' }), ' черновик')
    await user.click(screen.getByRole('button', { name: 'Вернуться к статьям' }))
    expect(screen.getByRole('heading', { name: 'Уйти без сохранения?' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Остаться' }))
    expect(router.state.location.search).toBe('?id=1')
    expect(screen.getByRole('textbox', { name: 'Текст статьи' })).toHaveValue('Исходный текст черновик')
  })

  it('leaves after confirmation, and does not ask without changes', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Изменить текст статьи' }))
    // открыт редактор, но текст не менялся — уходим без вопроса
    await act(() => router.navigate('/lore'))
    expect(screen.getByText('Страница лора')).toBeVisible()
    await act(() => router.navigate('/gm/articles?id=1'))
    await user.click(screen.getByRole('button', { name: 'Изменить текст статьи' }))
    await user.type(screen.getByRole('textbox', { name: 'Текст статьи' }), '!')
    await act(() => router.navigate('/lore'))
    await user.click(screen.getByRole('button', { name: 'Уйти без сохранения' }))
    expect(screen.getByText('Страница лора')).toBeVisible()
  })

  it('keeps the text draft when switching between editor sections', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Изменить текст статьи' }))
    await user.type(screen.getByRole('textbox', { name: 'Текст статьи' }), ' дополнение')
    await user.click(screen.getByRole('button', { name: 'Изображения', exact: true }))
    expect(screen.getByText('Галерея статьи')).toBeVisible()
    expect(screen.queryByRole('textbox', { name: 'Текст статьи' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Связи', exact: true }))
    expect(screen.getByText('Список связей')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Текст', exact: true }))
    expect(screen.getByRole('textbox', { name: 'Текст статьи' })).toHaveValue('Исходный текст дополнение')
  })

  it('opens mobile settings in a dismissible drawer', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    const user = setup()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Параметры статьи' }))
    expect(screen.getByRole('dialog', { name: 'Параметры статьи' })).toBeVisible()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps type and tag controls inside the filters drawer', async () => {
    const user = setup('/gm/articles')
    expect(screen.queryByRole('button', { name: 'Все типы' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Фильтры' }))
    expect(screen.getByRole('dialog', { name: 'Фильтры лора' })).toBeVisible()
    expect(screen.getByText('Типы статей')).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Поиск тегов' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: '#История', exact: true }))
    expect(screen.getByRole('button', { name: '#История', exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Применить' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('places article actions in a dismissible dropdown', async () => {
    const user = setup()
    expect(screen.queryByRole('button', { name: 'Новая статья' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Открыть в лоре' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Действия со статьёй' }))
    expect(screen.getByRole('link', { name: 'Открыть в лоре' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Удалить статью' })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('link', { name: 'Открыть в лоре' })).not.toBeInTheDocument()
  })

  it('offers deleting only to the founder', async () => {
    auth.isFounder = true
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Действия со статьёй' }))
    expect(screen.getByRole('button', { name: 'Удалить статью' })).toBeVisible()
  })

  it('uses the expanded layout for a new article', () => {
    setup('/gm/articles?id=new')
    expect(screen.getByRole('button', { name: 'Создать статью' })).toBeDisabled()
    expect(screen.getByRole('complementary', { name: 'Параметры статьи' })).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Текст статьи' })).toBeVisible()
  })

  it('shows the subtype name in the list and the article editor', () => {
    setup('/gm/articles')
    expect(screen.getByText('Хроника')).toBeVisible()
  })

  it('lets a GM send a draft for review but not publish it', async () => {
    transition.mockResolvedValue({ id: 1, title: 'Летопись', status: 'in_review' })
    const user = setup()
    expect(screen.queryByRole('button', { name: 'Опубликовать' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Отправить на проверку' }))
    expect(transition).toHaveBeenCalledWith(1, 'submit')
    expect(await screen.findByText('Ждёт проверки основателем.')).toBeVisible()
  })

  it('lets the founder publish, reject or archive an article under review', async () => {
    auth.isFounder = true
    article.status = 'in_review'
    transition.mockResolvedValue({ id: 1, title: 'Летопись', status: 'published' })
    const user = setup()
    expect(screen.getByRole('button', { name: 'Вернуть в черновик' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'В архив' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Опубликовать' }))
    expect(transition).toHaveBeenCalledWith(1, 'publish', { version: 3 })
    expect(await screen.findByRole('button', { name: 'В архив' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Опубликовать' })).not.toBeInTheDocument()
  })

  it('refreshes the text and refuses to publish when the article was edited after it was opened', async () => {
    auth.isFounder = true
    article.status = 'in_review'
    transition.mockRejectedValue(Object.assign(new Error('edited meanwhile'), { status: 409 }))
    getArticle.mockResolvedValue({
      id: 1, title: 'Летопись', article_type: 'lore', status: 'in_review', visibility: 'public',
      body_markdown: 'Тайная правка после проверки', subtype: { id: 7, name: 'Хроника' }, author: { id: 5, username: 'Я' }, version: 4,
    })
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Опубликовать' }))
    expect(await screen.findByText(/Статью изменили после вашего просмотра/)).toBeVisible()
    expect(screen.getByText('Тайная правка после проверки')).toBeVisible()
    transition.mockResolvedValue({ id: 1, title: 'Летопись', status: 'published', version: 4 })
    await user.click(screen.getByRole('button', { name: 'Опубликовать' }))
    expect(transition).toHaveBeenLastCalledWith(1, 'publish', { version: 4 })
  })

  it('shows the plain error when publishing fails for another reason', async () => {
    auth.isFounder = true
    article.status = 'in_review'
    transition.mockRejectedValue(Object.assign(new Error('Cannot publish article 1: it is draft.'), { status: 409 }))
    getArticle.mockResolvedValue({ id: 1, title: 'Летопись', status: 'draft', version: 3 })
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Опубликовать' }))
    expect(await screen.findByText('Cannot publish article 1: it is draft.')).toBeVisible()
  })

  it('makes another GM\'s article read-only but keeps its history', async () => {
    article.authorId = 99
    const user = setup()
    expect(screen.getByText(/Эту статью написал другой ГМ/)).toBeVisible()
    // те же поля, что у автора, только отрендеренные и без «Изменить»
    for (const label of ['Название', 'Краткое описание', 'Текст']) expect(screen.getByText(label, { selector: '.text-label' })).toBeVisible()
    expect(screen.getByText('Название', { selector: '.text-label' }).nextSibling).toHaveTextContent('Летопись')
    expect(screen.getByText('Исходный текст')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Изменить' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Изменить текст статьи' })).not.toBeInTheDocument()
    // параметры видны, но без полей правки и workflow
    const settings = screen.getByRole('complementary', { name: 'Параметры статьи' })
    expect(within(settings).getByText('Хроника')).toBeVisible()
    expect(within(settings).getByText('Саруман')).toBeVisible()
    expect(within(settings).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Отправить на проверку' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Изображения', exact: true }))
    expect(screen.getByText('Галерея статьи (просмотр)')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Связи', exact: true }))
    expect(screen.getByText('Список связей (просмотр)')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'История', exact: true }))
    expect(screen.getByRole('heading', { name: 'История изменений' })).toBeVisible()
  })

  it('lets another GM propose a change with only the edited fields and a note', async () => {
    article.authorId = 99
    const user = setup()
    expect(screen.getByRole('button', { name: 'Предложения (2)' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Предложить изменение' }))
    await user.type(screen.getByRole('textbox', { name: 'Текст статьи' }), ' и правка')
    await user.type(screen.getByRole('textbox', { name: 'Что и зачем изменено' }), 'опечатка')
    await user.click(screen.getByRole('button', { name: 'Отправить предложение' }))
    expect(propose).toHaveBeenCalledWith({ body_markdown: 'Исходный текст и правка', change_note: 'опечатка' }, expect.any(Object))
  })

  it('sends the optional change note with a body save', async () => {
    update.mockResolvedValue({ id: 1, title: 'Летопись', article_type: 'lore', status: 'draft', visibility: 'public', body_markdown: 'Исходный текст!', version: 4 })
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Изменить текст статьи' }))
    await user.type(screen.getByRole('textbox', { name: 'Текст статьи' }), '!')
    await user.type(screen.getByRole('textbox', { name: 'Что изменено (для истории, необязательно)' }), 'восклицание')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(update).toHaveBeenCalledWith(1, { body_markdown: 'Исходный текст!', change_note: 'восклицание' })
  })

  it('lets the founder propose a change to the author instead of editing directly', async () => {
    auth.isFounder = true
    article.authorId = 99
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Предложить автору' }))
    expect(screen.queryByRole('button', { name: 'Изменить текст статьи' })).not.toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Текст статьи' }), ' уточнение')
    await user.click(screen.getByRole('button', { name: 'Отправить предложение' }))
    expect(propose).toHaveBeenCalledWith({ body_markdown: 'Исходный текст уточнение', change_note: null }, expect.any(Object))
  })

  it('does not offer the founder to propose to themselves', () => {
    auth.isFounder = true
    auth.userId = 99
    article.authorId = 99
    setup()
    expect(screen.queryByRole('button', { name: 'Предложить автору' })).not.toBeInTheDocument()
  })

  it('lets the founder edit any article', () => {
    auth.isFounder = true
    article.authorId = 99
    setup()
    expect(screen.getByRole('button', { name: 'Изменить текст статьи' })).toBeVisible()
  })

  it('keeps the status actions in the article settings panel', () => {
    setup()
    const settings = screen.getByRole('complementary', { name: 'Параметры статьи' })
    expect(within(settings).getByRole('button', { name: 'Отправить на проверку' })).toBeVisible()
    expect(within(settings).getByText('Хроника')).toBeVisible()
  })

  it('filters by several statuses from the filters drawer, status section first', async () => {
    const user = setup('/gm/articles')
    expect(screen.queryByRole('button', { name: 'Статус статей' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Фильтры' }))
    const dialog = screen.getByRole('dialog', { name: 'Фильтры лора' })
    expect(within(dialog).getAllByRole('group')[0]).toHaveTextContent('Статус')
    await user.click(within(dialog).getByRole('button', { name: 'На проверке' }))
    await user.click(within(dialog).getByRole('button', { name: 'Черновик' }))
    await user.click(within(dialog).getByRole('button', { name: 'Применить' }))
    expect(screen.getByRole('button', { name: 'Убрать статус На проверке' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Убрать статус Черновик' })).toBeVisible()
  })
})
