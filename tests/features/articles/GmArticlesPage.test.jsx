import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import GmArticlesPage from '@/features/articles/pages/GmArticlesPage.jsx'

vi.mock('@/components/ToastProvider.jsx', () => ({ useToasts: () => ({ push: vi.fn() }) }))
vi.mock('@/features/articles/queries.js', () => ({
  useTagSearch: () => ({ data: { items: [{ id: 1, name: 'История' }], total: 1 } }),
  useInvalidateArticles: () => vi.fn(),
  useArticlesPage: () => ({ data: { items: [{ id: 1, title: 'Летопись', article_type: 'lore', status: 'draft' }], total: 1 } }),
  useArticleDetail: () => ({ data: { id: 1, title: 'Летопись', article_type: 'lore', status: 'draft', visibility: 'public', body_markdown: 'Исходный текст' } }),
}))
vi.mock('@/features/articles/components/TagInput.jsx', () => ({ default: () => <div>Теги статьи</div> }))
vi.mock('@/features/articles/components/ArticleRelations.jsx', () => ({ default: () => <div>Список связей</div> }))
vi.mock('@/features/articles/components/ArticleImages.jsx', () => ({ default: () => <div>Галерея статьи</div> }))
vi.mock('@/components/ui/RichTextEditor.jsx', () => ({ default: ({ value, onChange }) => <textarea aria-label="Текст статьи" value={value} onChange={onChange} /> }))

function setup(url = '/gm/articles?id=1') {
  render(<MemoryRouter initialEntries={[url]}><GmArticlesPage /></MemoryRouter>)
  return userEvent.setup()
}

afterEach(() => vi.unstubAllGlobals())

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
})
