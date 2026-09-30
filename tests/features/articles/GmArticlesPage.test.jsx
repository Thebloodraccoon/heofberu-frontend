import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import GmArticlesPage from '@/features/articles/pages/GmArticlesPage.jsx'

const auth = vi.hoisted(() => ({ isFounder: false }))
const article = vi.hoisted(() => ({ status: 'draft' }))
const transition = vi.hoisted(() => vi.fn())

vi.mock('@/components/ToastProvider.jsx', () => ({ useToasts: () => ({ push: vi.fn() }) }))
vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => ({ isGM: true, isFounder: auth.isFounder }) }))
vi.mock('@/features/articles/api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, articlesApi: { ...actual.articlesApi, transition } }
})
vi.mock('@/features/articles/queries.js', () => ({
  useTagSearch: () => ({ data: { items: [{ id: 1, name: 'История' }], total: 1 } }),
  useInvalidateArticles: () => vi.fn(),
  useArticleFinder: () => ({ data: { items: [{ id: 1, title: 'Летопись', article_type: 'lore', status: 'draft', subtype: { id: 7, name: 'Хроника' } }], total: 1 } }),
  useArticleDetail: () => ({ data: { id: 1, title: 'Летопись', article_type: 'lore', status: article.status, visibility: 'public', body_markdown: 'Исходный текст', subtype: { id: 7, name: 'Хроника' } } }),
  useArticleSubtypes: () => ({ data: [{ id: 7, article_type: 'lore', name: 'Хроника' }] }),
  useCreateSubtype: () => ({ mutateAsync: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
}))
vi.mock('@/features/articles/components/TagInput.jsx', () => ({ default: () => <div>Теги статьи</div> }))
vi.mock('@/features/articles/components/ArticleRelations.jsx', () => ({ default: () => <div>Список связей</div> }))
vi.mock('@/features/articles/components/ArticleImages.jsx', () => ({ default: () => <div>Галерея статьи</div> }))
vi.mock('@/components/ui/RichTextEditor.jsx', () => ({ default: ({ value, onChange }) => <textarea aria-label="Текст статьи" value={value} onChange={onChange} /> }))

function setup(url = '/gm/articles?id=1') {
  render(<MemoryRouter initialEntries={[url]}><GmArticlesPage /></MemoryRouter>)
  return userEvent.setup()
}

afterEach(() => {
  vi.unstubAllGlobals()
  auth.isFounder = false
  article.status = 'draft'
  transition.mockReset()
})

describe('Article editor workspace', () => {
  it('provides parent selection instead of a separate article list', () => {
    setup()
    expect(screen.queryByRole('button', { name: 'Статьи', exact: true })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Выбрать родительскую статью' })).toBeVisible()
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
    expect(screen.getByRole('button', { name: 'Удалить статью' })).toBeVisible()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('link', { name: 'Открыть в лоре' })).not.toBeInTheDocument()
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
    expect(transition).toHaveBeenCalledWith(1, 'publish')
    expect(await screen.findByRole('button', { name: 'В архив' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Опубликовать' })).not.toBeInTheDocument()
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
