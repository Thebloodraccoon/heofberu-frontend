import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReviewsPanel from '@/features/campaigns/components/ReviewsPanel.jsx'

const state = vi.hoisted(() => ({ items: [], write: vi.fn(), moderate: vi.fn(), founder: false }))
vi.mock('@/components/ToastProvider.jsx', () => ({ useToasts: () => ({ push: vi.fn() }) }))
vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => ({ user: { id: 7 }, isFounder: state.founder }) }))
vi.mock('@/features/campaigns/queries.js', () => ({
  useReviewsPage: () => ({ data: { items: state.items, total: state.items.length }, isLoading: false, refetch: vi.fn() }),
  useWriteReview: () => ({ mutate: state.write, isPending: false, reset: vi.fn() }),
  useDeleteReview: () => ({ mutate: vi.fn(), isPending: false, reset: vi.fn() }),
  useModerateReview: () => ({ mutate: state.moderate, isPending: false }),
}))

const review = (patch) => ({ id: 1, author: { id: 8, username: 'Иван' }, body: 'Сильный финал', created_at: '2099-01-01T00:00:00Z', edited_at: null, hidden_at: null, ...patch })

describe('campaign reviews', () => {
  beforeEach(() => { state.items = []; state.founder = false; state.write.mockClear(); state.moderate.mockClear() })

  it('lets a player write a review and blocks an empty one', async () => {
    const user = userEvent.setup()
    render(<ReviewsPanel campaign={{ id: 1, viewer_role: 'player' }} />)
    const submit = screen.getByRole('button', { name: 'Оставить отзыв' })
    expect(submit).toBeDisabled()
    await user.type(screen.getByRole('textbox', { name: 'Отзыв о кампании' }), '  Лучший стол  ')
    await user.click(submit)
    expect(state.write).toHaveBeenCalledWith({ body: 'Лучший стол' }, expect.any(Object))
  })

  it('shows the own review separately and gives the GM no form', () => {
    state.items = [review({ id: 2, author: { id: 7, username: 'Я' }, body: 'Мой отзыв' }), review()]
    const { unmount } = render(<ReviewsPanel campaign={{ id: 1, viewer_role: 'player' }} />)
    expect(screen.getByText('Ваш отзыв')).toBeVisible()
    expect(screen.getByRole('button', { name: /Изменить/ })).toBeVisible()
    unmount()
    render(<ReviewsPanel campaign={{ id: 1, viewer_role: 'gm' }} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('Сильный финал')).toBeVisible()
  })

  it('lets only the founder hide and unhide reviews', async () => {
    state.items = [review(), review({ id: 3, hidden_at: '2099-01-02T00:00:00Z', body: 'Спам' })]
    state.founder = true
    const user = userEvent.setup()
    render(<ReviewsPanel campaign={{ id: 1, viewer_role: 'gm' }} />)
    expect(screen.getByText('Скрыт модератором')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Показать снова' }))
    expect(state.moderate).toHaveBeenCalledWith({ reviewId: 3, hidden: false }, expect.any(Object))
    await user.click(screen.getByRole('button', { name: 'Скрыть' }))
    expect(state.moderate).toHaveBeenLastCalledWith({ reviewId: 1, hidden: true }, expect.any(Object))
  })
})
