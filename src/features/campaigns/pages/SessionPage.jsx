import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, ErrorBox, Skeleton, SkeletonCard } from '@/components/ui'
import { useToasts } from '@/components/ToastProvider.jsx'
import ArticleText from '@/features/articles/components/ArticleText.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { formatDateTime } from '@/lib/utils/datetime.js'
import { isCampaignGm } from '@/features/campaigns/api.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useCampaign, useDeleteSession, usePublishSession, useSession } from '@/features/campaigns/queries.js'
import SessionFormDrawer from '../components/SessionFormDrawer.jsx'
import SessionReviews from '../components/SessionReviews.jsx'
import { SessionAttendance, SessionCharacters } from '../components/SessionTable.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

// Страница сессии — для игроков и ГМ: номер, статус и дата над названием, хроника и явка рядом, отзывы стола;
// ГМ ниже видит отмеченных персонажей с HP и быстрой правкой.
// ГМ отсюда публикует хронику, а в «Настройках» (форма в Drawer) правит и удаляет сессию.
export default function SessionPage() {
  const { id, sessionId } = useParams()
  const navigate = useNavigate()
  const { push } = useToasts()
  const { data: campaign, isLoading: campaignLoading, error: campaignError, refetch: refetchCampaign } = useCampaign(id)
  const { data: session, isLoading, error, refetch } = useSession(id, sessionId)
  const publish = usePublishSession(id)
  const remove = useDeleteSession(id)
  const [editing, setEditing] = useState(false)
  const back = `/campaigns/${id}?tab=sessions`

  const failure = campaignError || error
  if (failure) return <div className="lore-page"><ErrorBox error={toCampaignError(failure)} onRetry={campaignError ? refetchCampaign : refetch} /><p className="mt-4"><Link className="link-ember" to={back}>К сессиям кампании</Link></p></div>
  if (campaignLoading || isLoading || !campaign || !session) return <div className="lore-page" aria-busy="true"><Skeleton className="mb-3 h-4 w-32" /><Skeleton className="mb-6 h-10 w-80" /><SkeletonCard className="min-h-[20rem]" /></div>

  const isGm = isCampaignGm(campaign)
  const togglePublished = () => publish.mutate({ sessionId: session.id, published: !session.published_at }, {
    onSuccess: () => push(session.published_at ? 'Хроника скрыта от игроков' : 'Хроника опубликована', undefined, 'success'),
    onError: (e) => push('Не удалось изменить публикацию', toCampaignError(e).message, 'error'),
  })

  return (
    <div className="lore-page session-page">
      {/* Как в лоре: слева — назад, справа — настройки (там и удаление); публикация хроники — у самой хроники. */}
      <div className="lore-reading-toolbar">
        <Link to={back}><LoreIcon name="back" />{campaign.title}</Link>
        {isGm && <div className="lore-reading-actions"><button type="button" onClick={() => setEditing(true)}><LoreIcon name="settings" />Настройки</button></div>}
      </div>
      <header className="lore-header article-workspace-header">
        <div>
          <div className="campaign-header-meta campaign-header-status"><span className="lore-eyebrow">Сессия №{session.number}</span><StatusBadge kind="session" status={session.status} /><span>{session.scheduled_at ? formatDateTime(session.scheduled_at) : 'Дата не назначена'}</span></div>
          <h1 className="heading-section">{session.title || `Сессия №${session.number}`}</h1>
        </div>
      </header>

      <div className="session-layout">
        <section className="preset-section" aria-label="Хроника">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2"><h2 className="heading-card">Хроника</h2>{session.published_at ? <Badge tone="good">Опубликована {formatDateTime(session.published_at)}</Badge> : <Badge>{isGm ? 'Черновик — игроки не видят' : 'Не опубликована'}</Badge>}</div>
            {isGm && <Button size="sm" variant="ghost" disabled={publish.isPending} onClick={togglePublished}><LoreIcon name="eye" />{session.published_at ? 'Скрыть' : 'Опубликовать'}</Button>}
          </div>
          {session.chronicle_markdown === null ? <p className="text-sm text-stone-400">ГМ ещё не опубликовал хронику этой сессии.</p> : <ArticleText value={session.chronicle_markdown} empty="Хроника пока не написана." />}
        </section>
        <SessionAttendance campaign={campaign} session={session} isGm={isGm} />
      </div>

      {/* Отзывы — после сессии (статус «Сыграна»), а не после публикации хроники. */}
      {session.status === 'played' || session.published_at
        ? <div className="preset-section mt-6"><SessionReviews campaign={campaign} session={session} /></div>
        : <p className="lore-empty mt-6">Отзывы откроются после сессии.</p>}
      {isGm && <SessionCharacters campaign={campaign} session={session} />}

      {editing && <SessionFormDrawer campaign={campaign} session={session} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} deleteAction={{ ...remove, run: () => remove.mutate(session.id, { onSuccess: () => { push(`Сессия №${session.number} удалена`, undefined, 'success'); navigate(back, { replace: true }) } }) }} />}
    </div>
  )
}
