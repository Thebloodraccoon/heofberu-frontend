import { useState } from 'react'
import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ParentArticlePicker from '@/features/articles/components/ParentArticlePicker.jsx'

const data = [
  { id: 1, title: 'Текущая', article_type: 'lore', status: 'draft' },
  { id: 2, title: 'Дочерняя', article_type: 'lore', status: 'draft' },
  { id: 3, title: 'Внучатая', article_type: 'lore', status: 'draft' },
  { id: 4, title: 'Регион', article_type: 'region', status: 'published', excerpt: 'Описание региона' },
]
const api = vi.hoisted(() => ({ list: vi.fn(), search: vi.fn() }))
vi.mock('@/features/articles/api.js', () => ({ articlesApi: { list: api.list, search: api.search, children: vi.fn(async (id) => id === 1 ? [{ id: 2 }] : id === 2 ? [{ id: 3 }] : []) } }))
vi.mock('@/features/articles/components/LoreFilters.jsx', () => ({ default: ({ onApply, onClose }) => <div role="dialog" aria-label="Фильтры лора"><button onClick={() => { onApply(['region'], [], 'any', []); onClose() }}>Регионы</button></div> }))
vi.mock('@/features/articles/queries.js', () => ({
  useArticleDetail: (id) => ({ data: id ? { ...data.find((a) => a.id === id), body_markdown: 'Подробная история региона' } : undefined }),
}))
function Example() {
  const [value, setValue] = useState(null)
  return <ParentArticlePicker articleId={1} value={value} onChange={setValue} />
}
it('excludes descendants, previews and selects a parent, and allows removing it', async () => {
  api.list.mockResolvedValue({ items: data, total: 4 })
  const user = userEvent.setup()
  render(<QueryClientProvider client={new QueryClient()}><Example /></QueryClientProvider>)
  await user.click(screen.getByRole('button', { name: 'Выбрать родительскую статью' }))
  expect(await screen.findByText('Регион', { selector: 'h3' })).toBeVisible()
  expect(screen.queryByText('Текущая')).not.toBeInTheDocument()
  expect(screen.queryByText('Дочерняя')).not.toBeInTheDocument()
  expect(screen.queryByText('Внучатая')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Подробнее' }))
  expect(screen.getByText('Подробная история региона')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Выбрать родителем' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Изменить родителя' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Убрать' }))
  expect(screen.getByRole('button', { name: 'Выбрать родительскую статью' })).toBeVisible()
})


it('searches on the server and filters by article type in the lore filter drawer', async () => {
  api.list.mockResolvedValue({ items: data, total: 4 })
  api.search.mockResolvedValue({ items: [data[3]], total: 1 })
  const user = userEvent.setup()
  render(<QueryClientProvider client={new QueryClient()}><Example /></QueryClientProvider>)
  await user.click(screen.getByRole('button', { name: 'Выбрать родительскую статью' }))
  await user.type(screen.getByRole('searchbox', { name: 'Поиск родительской статьи' }), 'Рег')
  await user.click(screen.getByRole('button', { name: 'Найти' }))
  expect(await screen.findByText('Регион', { selector: 'h3' })).toBeVisible()
  expect(api.search).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'Рег', page: 1, size: 12 }))
  await user.click(screen.getByRole('button', { name: /Фильтры/ }))
  await user.click(screen.getByRole('button', { name: 'Регионы' }))
  await vi.waitFor(() => expect(api.search).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'Рег', article_type: ['region'] })))
})
