import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, ErrorBox, Skeleton, SkeletonCard } from '@/components/ui'
import Pagination from '@/components/ui/Pagination.jsx'
import { formatDateTime } from '@/lib/utils/datetime.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useCampaignsPage } from '@/features/campaigns/queries.js'
import StatusBadge from './StatusBadge.jsx'

const PAGE_SIZE = 12

// Карточка игрового стола: кто ведёт, по какой публичной кампании, статус.
function CampaignCard({ campaign }) {
  return (
    <article className="catalog-record-card campaign-card">
      <Link to={`/campaigns/${campaign.id}`} className="campaign-card-link">
        <span className="campaign-card-title font-display">{campaign.title}</span>
        <span className="campaign-card-meta">{campaign.owner ? `Ведёт ${campaign.owner.username}` : 'ГМ удалил аккаунт'}{campaign.public_campaign && ` · по мотивам «${campaign.public_campaign.title}»`}</span>
        <span className="campaign-card-badges"><StatusBadge kind="campaign" status={campaign.status} />{campaign.archived_at && <Badge tone="violet">В архиве</Badge>}</span>
        <span className="text-hint">Обновлено {formatDateTime(campaign.updated_at)}</span>
      </Link>
    </article>
  )
}

// Страничный список игровых столов ГМ; params — фильтры страницы, номер страницы здесь свой.
export default function CampaignList({ params, label, emptyText, filtered }) {
  // Страница своя; при смене фильтров родитель пересоздаёт список (key), и она снова первая.
  const [page, setPage] = useState(1)
  const { data, isLoading, isPlaceholderData, error, refetch } = useCampaignsPage({ ...params, page, size: PAGE_SIZE })
  const campaigns = data?.items ?? []

  if (error) return <ErrorBox error={toCampaignError(error)} onRetry={refetch} />
  if (isLoading) return <div className="campaign-list" aria-busy="true">{Array.from({ length: 6 }, (_, index) => <SkeletonCard key={index} className="min-h-[8rem]"><Skeleton className="h-5 w-2/3" /></SkeletonCard>)}</div>

  return (
    <>
      {campaigns.length === 0
        ? <p className="lore-empty">{filtered ? 'По выбранным условиям кампаний нет.' : emptyText}</p>
        : <section className={`campaign-list ${isPlaceholderData ? 'opacity-60' : ''}`} aria-label={label}>{campaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} />)}</section>}
      <Pagination page={page} total={data?.total ?? 0} size={PAGE_SIZE} onPage={setPage} />
    </>
  )
}
