import { useState } from 'react'
import { Badge, ErrorBox, Skeleton } from '@/components/ui'
import Pagination from '@/components/ui/Pagination.jsx'
import { useAuth } from '@/features/auth/useAuth.js'
import { isCampaignGm } from '@/features/campaigns/api.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useDeleteSessionReview, useSessionReviewsPage, useWriteSessionReview } from '@/features/campaigns/queries.js'
import ReviewForm from './ReviewForm.jsx'
import { ReviewItem } from './ReviewsPanel.jsx'

const PAGE_SIZE = 10

// Отзывы о сессии: ГМ видит все, остальной стол — только открытые автором («видно всему столу»).
export default function SessionReviews({ campaign, session }) {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const { data, isLoading, error, refetch } = useSessionReviewsPage(campaign.id, session.id, { page, size: PAGE_SIZE })
  const writeSession = useWriteSessionReview(campaign.id)
  const removeSession = useDeleteSessionReview(campaign.id)
  // ReviewForm не знает о сессии: подставляем её id в вызовы мутаций.
  const write = { ...writeSession, mutate: (body, options) => writeSession.mutate({ sessionId: session.id, ...body }, options) }
  const remove = { ...removeSession, mutate: (_, options) => removeSession.mutate(session.id, options) }
  const reviews = data?.items ?? []
  const mine = reviews.find((review) => review.author?.id === user?.id)
  const others = reviews.filter((review) => review !== mine)
  const isGm = isCampaignGm(campaign)

  return (
    <section aria-label="Отзывы о сессии" className="campaign-session-reviews">
      <h3 className="heading-card">Отзывы о сессии</h3>
      {!isGm && !isLoading && !error && <ReviewForm key={mine?.id ?? 'new'} mine={mine} label="Отзыв о сессии" withTableToggle write={write} remove={remove} />}
      {error && <ErrorBox error={toCampaignError(error)} onRetry={refetch} />}
      {isLoading && <Skeleton className="h-16 w-full" />}
      {!isLoading && !error && (others.length === 0
        ? !mine && <p className="text-sm text-stone-400">{isGm ? 'Игроки ещё не оставили отзывов.' : 'Открытых отзывов пока нет.'}</p>
        : <ul className="campaign-reviews">{others.map((review) => <ReviewItem key={review.id} review={review}>{isGm && <Badge tone={review.visible_to_table ? 'good' : 'default'} className="mt-2">{review.visible_to_table ? 'Виден столу' : 'Только для вас'}</Badge>}</ReviewItem>)}</ul>)}
      <Pagination page={page} total={data?.total ?? 0} size={PAGE_SIZE} onPage={setPage} />
    </section>
  )
}
