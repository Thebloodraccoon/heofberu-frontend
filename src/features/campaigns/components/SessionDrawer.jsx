import { useState } from 'react'
import { Button, ConfirmDialog, ErrorBox, Skeleton } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import { useToasts } from '@/components/ToastProvider.jsx'
import ArticleText from '@/features/articles/components/ArticleText.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { formatDateTime } from '@/lib/utils/datetime.js'
import { isCampaignGm } from '@/features/campaigns/api.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useDeleteSession, usePublishSession, useSession } from '@/features/campaigns/queries.js'
import SessionReviews from './SessionReviews.jsx'
import StatusBadge from './StatusBadge.jsx'

// Карточка сессии: когда, кто был, хроника и отзывы. ГМ отсюда публикует хронику и правит сессию.
export default function SessionDrawer({ campaign, sessionId, onClose, onEdit }) {
  const { push } = useToasts()
  const isGm = isCampaignGm(campaign)
  const { data: session, isLoading, error, refetch } = useSession(campaign.id, sessionId)
  const publish = usePublishSession(campaign.id)
  const remove = useDeleteSession(campaign.id)
  const [confirming, setConfirming] = useState(false)
  const togglePublished = () => publish.mutate({ sessionId, published: !session.published_at }, {
    onSuccess: () => push(session.published_at ? 'Хроника скрыта от игроков' : 'Хроника опубликована', undefined, 'success'),
    onError: (e) => push('Не удалось изменить публикацию', toCampaignError(e).message, 'error'),
  })
  const title = session ? `Сессия №${session.number}${session.title ? ` · ${session.title}` : ''}` : 'Сессия'

  return (
    // Пока открыт диалог подтверждения, Escape закрывает только его, а не всю карточку.
    <Drawer title={title} subtitle={session ? formatDateTime(session.scheduled_at) : undefined} onClose={confirming ? () => {} : onClose} closeLabel={`Закрыть: ${title}`} footer={<Button variant="ghost" className="w-full" onClick={onClose}>Закрыть</Button>}>
      {error && <ErrorBox error={toCampaignError(error)} onRetry={refetch} />}
      {isLoading && <div className="space-y-2" aria-busy="true"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-32 w-full" /></div>}
      {session && <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2"><StatusBadge kind="session" status={session.status} />{session.published_at ? <span className="text-hint">Хроника опубликована {formatDateTime(session.published_at)}</span> : <span className="text-hint">Хроника не опубликована</span>}</div>
        {isGm && <div className="flex flex-wrap gap-2"><Button size="sm" variant="ghost" onClick={() => onEdit(session)}><LoreIcon name="edit" />Изменить</Button><Button size="sm" variant="ghost" disabled={publish.isPending} onClick={togglePublished}><LoreIcon name="eye" />{session.published_at ? 'Скрыть хронику' : 'Опубликовать хронику'}</Button><Button size="sm" variant="danger" onClick={() => setConfirming(true)}><LoreIcon name="trash" />Удалить</Button></div>}
        <section aria-label="Кто был">
          <h3 className="heading-card">Кто был</h3>
          {session.attendees.length === 0 ? <p className="text-sm text-stone-400">{isGm ? 'Посещаемость не отмечена.' : 'ГМ ещё не отметил, кто был.'}</p> : <ul className="campaign-attendance">{session.attendees.map((attendee) => <li key={attendee.participation_id} className="lore-chip">{attendee.character_name}<span className="text-hint">· {attendee.owner?.username}</span></li>)}</ul>}
        </section>
        <section aria-label="Хроника">
          <h3 className="heading-card">Хроника</h3>
          {session.chronicle_markdown === null ? <p className="text-sm text-stone-400">ГМ ещё не опубликовал хронику этой сессии.</p> : <ArticleText value={session.chronicle_markdown} empty="Хроника пока не написана." />}
        </section>
        {session.published_at && <SessionReviews campaign={campaign} session={session} />}
      </div>}
      {confirming && <ConfirmDialog title="Удалить сессию?" message="Вместе с сессией удалятся отметки посещаемости и отзывы игроков о ней." busy={remove.isPending} error={remove.error && toCampaignError(remove.error)} onCancel={() => { setConfirming(false); remove.reset() }} onConfirm={() => remove.mutate(sessionId, { onSuccess: () => { push(`Сессия №${session.number} удалена`, undefined, 'success'); onClose() } })} />}
    </Drawer>
  )
}
