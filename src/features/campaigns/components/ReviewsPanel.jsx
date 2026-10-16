import { useState } from 'react'
import { Badge, Button, ErrorBox, Skeleton } from '@/components/ui'
import Pagination from '@/components/ui/Pagination.jsx'
import { useToasts } from '@/components/ToastProvider.jsx'
import { useAuth } from '@/features/auth/useAuth.js'
import { formatDateTime } from '@/lib/utils/datetime.js'
import { isCampaignGm } from '@/features/campaigns/api.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useDeleteReview, useModerateReview, useReviewsPage, useWriteReview } from '@/features/campaigns/queries.js'
import ReviewForm from './ReviewForm.jsx'

const PAGE_SIZE = 10

export function ReviewItem({ review, children }) {
  return (
    <li className="campaign-review" data-hidden={Boolean(review.hidden_at)}>
      <p className="campaign-review-meta"><span className="font-medium text-stone-200">{review.author?.username ?? 'Игрок'}</span><span>{formatDateTime(review.created_at)}{review.edited_at && ' · изменён'}</span>{review.hidden_at && <Badge tone="bad">Скрыт модератором</Badge>}</p>
      <p className="text-body whitespace-pre-line">{review.body}</p>
      {children}
    </li>
  )
}

// Отзывы о кампании: публичные (видны и на странице её публичной кампании), один на игрока.
// ГМ кампании отзыв не пишет; скрыть чужой отзыв может только основатель.
export default function ReviewsPanel({ campaign }) {
  const { user, isFounder } = useAuth()
  const { push } = useToasts()
  const [page, setPage] = useState(1)
  const { data, isLoading, isPlaceholderData, error, refetch } = useReviewsPage(campaign.id, { page, size: PAGE_SIZE })
  const write = useWriteReview(campaign.id)
  const remove = useDeleteReview(campaign.id)
  const moderate = useModerateReview(campaign.id)
  const reviews = data?.items ?? []
  const mine = reviews.find((review) => review.author?.id === user?.id)
  const others = reviews.filter((review) => review !== mine)
  const canWrite = !isCampaignGm(campaign)
  const toggleHidden = (review) => moderate.mutate({ reviewId: review.id, hidden: !review.hidden_at }, {
    onSuccess: () => push(review.hidden_at ? 'Отзыв снова виден' : 'Отзыв скрыт', undefined, 'success'),
    onError: (e) => push('Не удалось изменить отзыв', toCampaignError(e).message, 'error'),
  })

  return (
    <section aria-label="Отзывы о кампании" className="campaign-panel">
      <p className="text-muted">{canWrite ? 'Отзыв увидят все — и в кампании, и на странице её публичной кампании.' : 'Отзывы ваших игроков. ГМ свою кампанию не оценивает.'}</p>
      {canWrite && !isLoading && !error && <ReviewForm key={mine?.id ?? 'new'} mine={mine} label="Отзыв о кампании" write={write} remove={remove} />}
      {error && <ErrorBox error={toCampaignError(error)} onRetry={refetch} />}
      {isLoading && <div className="space-y-2" aria-busy="true"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>}
      {!isLoading && !error && (others.length === 0 && !mine
        ? <p className="lore-empty">Отзывов пока нет.</p>
        : others.length > 0 && <ul className={`campaign-reviews ${isPlaceholderData ? 'opacity-60' : ''}`} aria-label="Отзывы игроков">{others.map((review) => <ReviewItem key={review.id} review={review}>{isFounder && <Button size="xs" variant="ghost" className="mt-2" disabled={moderate.isPending} onClick={() => toggleHidden(review)}>{review.hidden_at ? 'Показать снова' : 'Скрыть'}</Button>}</ReviewItem>)}</ul>)}
      <Pagination page={page} total={data?.total ?? 0} size={PAGE_SIZE} onPage={setPage} />
    </section>
  )
}
