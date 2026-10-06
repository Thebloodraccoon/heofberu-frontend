import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ArticleProposals from '@/features/articles/components/ArticleProposals.jsx'

const review = vi.hoisted(() => vi.fn())
const feeds = vi.hoisted(() => ({ calls: [] }))
const data = vi.hoisted(() => ({
  pending: { id: 3, base_version: 4, proposer_id: 9, title: 'Мория', change_note: 'даты', status: 'pending', created_at: '2026-10-02T10:00:00Z' },
  mine: { id: 4, base_version: 4, proposer_id: 5, title: 'Мория (моё)', status: 'pending', created_at: '2026-10-02T11:00:00Z' },
  accepted: { id: 5, base_version: 5, proposer_id: 9, title: 'Хазад-Дум', status: 'accepted', reviewer_id: 5, accepted_version: 6, created_at: '2026-10-03T10:00:00Z' },
  rejected: { id: 6, base_version: 5, proposer_id: 9, title: 'Двалин', status: 'rejected', reviewer_id: 5, review_note: 'нет источников', created_at: '2026-10-03T11:00:00Z' },
}))

const auth = vi.hoisted(() => ({ user: { id: 5 }, isFounder: false }))
vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => auth }))
vi.mock('@/features/users/queries.js', () => ({ useUserNames: () => new Map([[9, 'Гимли']]) }))
vi.mock('@/features/articles/queries.js', () => ({
  // Бэк фильтрует по нескольким status: ждущие и закрытые — отдельные ленты.
  useProposalFeed: (_id, statuses) => {
    feeds.calls.push(statuses)
    const items = statuses.includes('pending') ? [data.pending, data.mine] : [data.accepted, data.rejected]
    return { items, hasNextPage: false }
  },
  useProposal: () => ({ data: { id: 3, title: 'Мория', excerpt: null, body_markdown: ['Текст', ':::gm', 'Секрет', ':::'].join('\n\n'), article_type: 'location', subtype_id: null, visibility: 'public' } }),
  useArticleSubtypes: () => ({ data: [] }),
  useProposalDiff: () => ({ data: { version: 5, against: 4, fields: {}, body_diff: '+новое' } }),
  useReviewProposal: () => ({ mutate: review, isPending: false }),
}))
vi.mock('@/features/articles/components/ProposalConflictDialog.jsx', () => ({
  default: ({ proposal, details }) => <div role="dialog" aria-label="Конфликт">{proposal.id}:{details.conflicts[0].field}</div>,
}))
const conflict409 = () => Object.assign(new Error('Conflict'), {
  status: 409,
  data: { error: { details: { conflicts: [{ field: 'title', base: 'a', current: 'b', proposed: 'c' }], body_conflicts: [{}, {}], merged_body: '' } } },
})

afterEach(() => {
  auth.isFounder = false
  review.mockReset()
  feeds.calls = []
})

const setup = (props = {}) => {
  const onAccepted = vi.fn()
  render(<ArticleProposals articleId={1} canReview onAccepted={onAccepted} {...props} />)
  return { user: userEvent.setup(), onAccepted }
}
const row = (title) => screen.getByText(title, { selector: 'span' }).closest('li')

describe('ArticleProposals', () => {
  it('asks the backend for pending and closed proposals as separate feeds, pending on top', () => {
    setup()
    expect(feeds.calls).toContainEqual(['pending'])
    expect(feeds.calls).toContainEqual(['accepted', 'rejected', 'withdrawn'])
    const titles = screen.getAllByRole('listitem').map((li) => li.textContent)
    expect(titles[0]).toMatch(/^ждёт решения.*Мория/)
    expect(titles[2]).toMatch(/Хазад-Дум.*стала версией 6.*Предложил: Гимли.*Принял: вы/)
  })

  it('shows who proposed what and lets the author accept it', async () => {
    review.mockImplementation((_vars, { onSuccess }) => onSuccess({ id: 1, version: 5 }))
    const { user, onAccepted } = setup()
    const item = row('Мория')
    expect(item).not.toHaveTextContent('#3')
    expect(within(item).getByText('Предложил:', { exact: false })).toHaveTextContent('Предложил: Гимли')
    await user.click(within(item).getByRole('button', { name: 'Изменения' }))
    expect(screen.getByText('+новое')).toBeVisible()
    await user.click(within(item).getByRole('button', { name: 'Принять' }))
    expect(review).toHaveBeenCalledWith({ pid: 3, action: 'accept', body: undefined }, expect.any(Object))
    expect(onAccepted).toHaveBeenCalledWith({ id: 1, version: 5 })
  })

  it('accepts a stale proposal with a merge and explains conflicts to the reviewer', async () => {
    data.pending.is_stale = true
    review.mockImplementation((_vars, { onError }) => onError(conflict409()))
    const { user, onAccepted } = setup()
    expect(within(row('Мория')).getByText('устарело')).toBeVisible()
    await user.click(within(row('Мория')).getByRole('button', { name: 'Принять' }))
    expect(review).toHaveBeenCalledWith(expect.objectContaining({ pid: 3, action: 'accept', params: { rebase: true } }), expect.any(Object))
    expect(screen.getByText(/правки пересеклись: Название, текст \(2\)\. Разрешить конфликт может только тот, кто предложил/)).toBeVisible()
    expect(screen.queryByRole('dialog', { name: 'Конфликт' })).not.toBeInTheDocument()
    expect(onAccepted).not.toHaveBeenCalled()
    data.pending.is_stale = false
  })

  it('opens conflict resolution for the proposer when rebasing their stale proposal', async () => {
    data.mine.is_stale = true
    review.mockImplementation((_vars, { onError }) => onError(conflict409()))
    const { user } = setup({ canReview: false })
    await user.click(within(row('Мория (моё)')).getByRole('button', { name: 'Обновить до текущей версии' }))
    expect(review).toHaveBeenCalledWith(expect.objectContaining({ pid: 4, action: 'rebase' }), expect.any(Object))
    expect(screen.getByRole('dialog', { name: 'Конфликт' })).toHaveTextContent('4:title')
    data.mine.is_stale = false
  })

  it('reports a plain 409 as an already closed proposal', async () => {
    review.mockImplementation((_vars, { onError }) => onError(Object.assign(new Error('Conflict'), { status: 409, data: { error: {} } })))
    const { user } = setup()
    await user.click(within(row('Мория')).getByRole('button', { name: 'Принять' }))
    expect(screen.getByText(/уже закрыто или изменилось/)).toBeVisible()
  })

  it('rejects with an optional reason and shows the reason on rejected proposals', async () => {
    const { user } = setup()
    expect(within(row('Двалин')).getByText(/Причина отклонения:/).parentElement).toHaveTextContent('нет источников')
    await user.click(within(row('Мория')).getByRole('button', { name: 'Отклонить' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByRole('textbox'), '  дубль  ')
    await user.click(within(dialog).getByRole('button', { name: 'Отклонить' }))
    expect(review).toHaveBeenCalledWith({ pid: 3, action: 'reject', body: { reason: 'дубль' } }, expect.any(Object))
  })

  it('lets the founder accept their own proposal as well', () => {
    auth.isFounder = true
    setup()
    const own = row('Мория (моё)')
    expect(within(own).getByRole('button', { name: 'Принять' })).toBeVisible()
    expect(within(own).getByRole('button', { name: 'Отклонить' })).toBeVisible()
    expect(within(own).getByRole('button', { name: 'Отозвать' })).toBeVisible()
  })

  it('does not let a reviewer accept or reject their own proposal', () => {
    setup()
    expect(within(row('Мория (моё)')).queryByRole('button', { name: 'Принять' })).not.toBeInTheDocument()
    expect(within(row('Мория (моё)')).getByRole('button', { name: 'Отозвать' })).toBeVisible()
    expect(within(row('Мория')).getByRole('button', { name: 'Принять' })).toBeVisible()
  })

  it('lets the proposer withdraw only their own pending proposal', async () => {
    const { user } = setup({ canReview: false })
    expect(within(row('Мория')).queryByRole('button', { name: 'Отозвать' })).not.toBeInTheDocument()
    expect(within(row('Мория')).queryByRole('button', { name: 'Принять' })).not.toBeInTheDocument()
    await user.click(within(row('Мория (моё)')).getByRole('button', { name: 'Отозвать' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Отозвать' }))
    expect(review).toHaveBeenCalledWith({ pid: 4, action: 'withdraw', body: undefined }, expect.any(Object))
  })

  it('previews the whole proposed article and accepts from the preview', async () => {
    const { user } = setup()
    await user.click(within(row('Мория')).getByRole('button', { name: 'Предпросмотр' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Мория' })).toBeVisible()
    expect(within(dialog).getByText('Только для мастера')).toBeVisible()
    await user.click(within(dialog).getByRole('button', { name: 'Принять' }))
    expect(review).toHaveBeenCalledWith({ pid: 3, action: 'accept', body: undefined }, expect.any(Object))
  })

  it('can hide closed proposals', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: 'Скрыть закрытые' }))
    expect(screen.queryByText('Хазад-Дум')).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
