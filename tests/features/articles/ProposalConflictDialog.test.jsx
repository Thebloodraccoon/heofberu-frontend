import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProposalConflictDialog from '@/features/articles/components/ProposalConflictDialog.jsx'

const replace = vi.hoisted(() => vi.fn())
vi.mock('@/features/articles/queries.js', () => ({ useReplaceProposal: () => ({ mutate: replace, isPending: false }) }))
vi.mock('@/features/articles/api.js', () => ({
  articlesApi: {
    // текущая v8: другой ГМ поменял название и видимость; base — v7; предложение поменяло название и описание
    get: async () => ({ version: 8, title: 'Мория (v8)', excerpt: 'старое', body_markdown: 'x', article_type: 'location', subtype: null, visibility: 'gm_only' }),
    revisions: { get: async () => ({ version: 7, title: 'Мория', excerpt: 'старое', body_markdown: 'x', article_type: 'location', subtype_id: null, visibility: 'public' }) },
    proposals: { get: async () => ({ id: 3, title: 'Мория (моё)', excerpt: 'новое', body_markdown: 'y', article_type: 'location', subtype_id: null, visibility: 'public', change_note: 'уточнил' }) },
  },
}))

const details = {
  conflicts: [{ field: 'title', base: 'Мория', current: 'Мория (v8)', proposed: 'Мория (моё)' }],
  body_conflicts: [{ base: 'x', current: 'x1', proposed: 'y' }],
  merged_body: 'начало\n<<<<<<< current\nx1\n||||||| base\nx\n=======\ny\n>>>>>>> proposal\nконец',
}

function setup() {
  const onResolved = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ProposalConflictDialog articleId={1} proposal={{ id: 3, base_version: 7 }} details={details} onClose={vi.fn()} onResolved={onResolved} />
    </QueryClientProvider>,
  )
  return { user: userEvent.setup(), onResolved }
}

describe('ProposalConflictDialog', () => {
  it('refuses to save while conflict markers remain in the text', async () => {
    const { user } = setup()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Сохранить предложение' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Сохранить предложение' }))
    expect(screen.getByText(/остались маркеры конфликта/)).toBeVisible()
    expect(replace).not.toHaveBeenCalled()
  })

  it('saves the full merged content on the current version', async () => {
    const { user } = setup()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Сохранить предложение' })).toBeEnabled())
    await user.click(screen.getByRole('radio', { name: /Ваше: Мория \(моё\)/ }))
    const text = screen.getByRole('textbox', { name: 'Текст с конфликтами' })
    await user.clear(text)
    await user.type(text, 'начало\ny\nконец')
    await user.click(screen.getByRole('button', { name: 'Сохранить предложение' }))
    expect(replace).toHaveBeenCalledWith(
      {
        pid: 3,
        body: {
          title: 'Мория (моё)', // конфликт — выбрано «ваше»
          excerpt: 'новое', // менялось только в предложении
          visibility: 'gm_only', // менялось только в статье
          article_type: 'location',
          subtype_id: null,
          body_markdown: 'начало\ny\nконец',
          change_note: 'уточнил',
          base_version: 8,
        },
      },
      expect.any(Object),
    )
  })
})
