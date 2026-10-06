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
vi.mock('@/features/articles/api.js', () => ({ articlesApi: { children: vi.fn(async (id) => id === 1 ? [{ id: 2 }] : id === 2 ? [{ id: 3 }] : []) } }))
vi.mock('@/features/articles/queries.js', () => ({
  useArticleFinder: () => ({ data: { items: data, total: 4 } }),
  useArticleDetail: (id) => ({ data: id ? { ...data.find((a) => a.id === id), body_markdown: 'Подробная история региона' } : undefined }),
}))
function Example() {
  const [value, setValue] = useState(null)
  return <ParentArticlePicker articleId={1} value={value} onChange={setValue} />
}
it('excludes descendants, previews and selects a parent, and allows removing it', async () => {
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

