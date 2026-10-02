import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ArticleHistory from '@/features/articles/components/ArticleHistory.jsx'

const restore = vi.hoisted(() => vi.fn())
const fetchNextPage = vi.hoisted(() => vi.fn())

vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => ({ user: { id: 5 } }) }))
vi.mock('@/features/users/queries.js', () => ({ useUserNames: () => new Map([[9, 'Гимли']]) }))
vi.mock('@/features/articles/api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, articlesApi: { ...actual.articlesApi, revisions: { restore } } }
})
vi.mock('@/features/articles/queries.js', () => ({
  useRevisionFeed: () => ({
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
      items: [
        { version: 2, title: 'Хазад-Дум', editor_id: 9, reviewer_id: 5, content_hash: 'abcdef1234567890', change_note: 'Новое название', created_at: '2026-10-02T10:00:00Z' },
        { version: 1, title: 'Мория', editor_id: 5, reviewer_id: 5, content_hash: '0123456789abcdef', change_note: null, created_at: '2026-10-01T10:00:00Z' },
      ],
  }),
  useRevisionDiff: (_id, version) => ({
    data: {
      version,
      against: 1,
      fields: { title: { old: 'Мория', new: 'Хазад-Дум' }, visibility: { old: 'public', new: 'gm_only' } },
      body_diff: '--- v1\n+++ v2\n@@ -1 +1 @@\n-старая строка\n+новая строка',
    },
  }),
}))

afterEach(() => restore.mockReset())

const setup = (props = {}) => {
  const onRestored = vi.fn()
  render(<ArticleHistory articleId={1} currentVersion={2} canRestore onRestored={onRestored} {...props} />)
  return { user: userEvent.setup(), onRestored }
}

describe('ArticleHistory', () => {
  it('loads only the latest versions and fetches older ones on demand', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Более ранние версии' }))
    expect(fetchNextPage).toHaveBeenCalled()
  })

  it('lists versions newest first with short hash, editor, reviewer and note', () => {
    setup()
    expect(screen.getByText('Версия 2')).toBeVisible()
    expect(screen.getByText('текущая')).toBeVisible()
    expect(screen.getByText('abcdef1')).toBeVisible()
    const [newest, oldest] = screen.getAllByRole('listitem')
    expect(within(newest).getByText('Правил:', { exact: false })).toHaveTextContent('Правил: Гимли')
    expect(within(newest).getByText('Принял:', { exact: false })).toHaveTextContent('Принял: вы')
    expect(screen.getByText('Новое название')).toBeVisible()
    // своя правка: ревьюер = автор правки, «принял» не показываем
    expect(within(oldest).getByText('Правил:', { exact: false })).toHaveTextContent('Правил: вы')
    expect(within(oldest).queryByText('Принял:', { exact: false })).not.toBeInTheDocument()
  })

  it('shows what a version changed: fields and a highlighted body diff', async () => {
    const { user } = setup()
    const [newest] = screen.getAllByRole('button', { name: 'Изменения' })
    await user.click(newest)
    const diff = screen.getByLabelText('Изменения версии 2')
    expect(within(diff).getByText('Сравнение с версией 1')).toBeVisible()
    expect(within(diff).getByText('Мория')).toBeVisible()
    expect(within(diff).getByText('Только для ГМ')).toBeVisible()
    expect(within(diff).getByText('+новая строка')).toHaveClass('text-emerald-300')
    expect(within(diff).getByText('-старая строка')).toHaveClass('text-red-300')
  })

  it('restores an old version after confirmation and reports the new version', async () => {
    restore.mockResolvedValue({ id: 1, title: 'Мория', version: 3 })
    const { user, onRestored } = setup()
    expect(screen.getAllByRole('button', { name: 'Восстановить' })).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Восстановить' }))
    await user.click(screen.getByRole('button', { name: 'Да, восстановить' }))
    expect(restore).toHaveBeenCalledWith(1, 1)
    expect(onRestored).toHaveBeenCalledWith({ id: 1, title: 'Мория', version: 3 })
  })

  it('keeps the dialog open and shows the server error when restoring fails', async () => {
    restore.mockRejectedValue(new Error('You can only edit your own articles'))
    const { user, onRestored } = setup()
    await user.click(screen.getByRole('button', { name: 'Восстановить' }))
    await user.click(screen.getByRole('button', { name: 'Да, восстановить' }))
    expect(await screen.findByText('You can only edit your own articles')).toBeVisible()
    expect(onRestored).not.toHaveBeenCalled()
  })

  it('has no restore buttons for someone who cannot edit the article', () => {
    setup({ canRestore: false })
    expect(screen.queryByRole('button', { name: 'Восстановить' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Изменения' })).toHaveLength(2)
  })
})
