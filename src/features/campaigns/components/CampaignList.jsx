import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, ErrorBox, Skeleton, SkeletonCard } from '@/components/ui'
import Pagination from '@/components/ui/Pagination.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { formatDateTime } from '@/lib/utils/datetime.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useCampaignsPage } from '@/features/campaigns/queries.js'
import { nextCampaignSession } from '../overview.js'
import StatusBadge from './StatusBadge.jsx'

const PAGE_SIZE = 12

// Карточка игрового стола: кто ведёт, по какой публичной кампании, статус.
function CampaignCard({ campaign, schedule }) {
  const next = nextCampaignSession((schedule?.data ?? []).filter((session) => session.campaign.id === campaign.id))
  return (
    <article className="catalog-record-card campaign-card">
      <Link to={`/campaigns/${campaign.id}`} className="campaign-card-link">
        <span className="campaign-card-heading"><span className="campaign-card-title font-display">{campaign.title}</span><span className="campaign-card-badges"><StatusBadge kind="campaign" status={campaign.status} />{campaign.archived_at && <Badge tone="violet">В архиве</Badge>}</span><LoreIcon name="chevron" /></span>
        <span className="campaign-card-meta">{campaign.owner ? `Ведёт @${campaign.owner.username}` : 'ГМ удалил аккаунт'}{campaign.public_campaign && ` · по мотивам «${campaign.public_campaign.title}»`}</span>
        {campaign.my_characters?.length > 0 && <span className="campaign-card-meta">Ваши персонажи: {campaign.my_characters.map((character) => character.name).join(', ')}</span>}
        <span className="campaign-card-footer">
          {schedule && !campaign.archived_at && <span className="campaign-card-next"><LoreIcon name="calendar" />{schedule.isLoading ? 'Проверяем расписание…' : schedule.error ? 'Расписание недоступно' : next ? `Следующая сессия · ${formatDateTime(next.scheduled_at)}` : 'Дата следующей сессии не назначена'}</span>}
          <span className="text-hint campaign-card-updated">Обновлено {formatDateTime(campaign.updated_at)}</span>
        </span>
      </Link>
    </article>
  )
}

// Страничный список игровых столов ГМ; params — фильтры страницы, номер страницы здесь свой.
export default function CampaignList({ params, label, emptyText, filtered, schedule }) {
  // Страница своя; при смене фильтров родитель пересоздаёт список (key), и она снова первая.
  const [page, setPage] = useState(1)
  const { data, isLoading, isPlaceholderData, error, refetch } = useCampaignsPage({ ...params, page, size: PAGE_SIZE })
  const campaigns = data?.items ?? []

  if (error) return <ErrorBox error={toCampaignError(error)} onRetry={refetch} />
  if (isLoading) return <div className="campaign-list" aria-busy="true">{Array.from({ length: 6 }, (_, index) => <SkeletonCard key={index} className="min-h-[8rem]"><Skeleton className="h-5 w-2/3" /></SkeletonCard>)}</div>

  return (
    <>
      {schedule?.error && <div className="campaign-schedule-error" role="status"><p>Не удалось загрузить расписание. Столы по-прежнему доступны.</p><button type="button" className="article-back" onClick={() => schedule.refetch()}>Повторить<LoreIcon name="undo" /></button></div>}
      {campaigns.length === 0
        ? <p className="lore-empty">{filtered ? 'По выбранным условиям кампаний нет.' : emptyText}</p>
        : <section className={`campaign-list ${isPlaceholderData ? 'opacity-60' : ''}`} aria-label={label}>{campaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} schedule={schedule} />)}</section>}
      <Pagination page={page} total={data?.total ?? 0} size={PAGE_SIZE} onPage={setPage} />
    </>
  )
}
