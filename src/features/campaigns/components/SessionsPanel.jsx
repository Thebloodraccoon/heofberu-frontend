import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, ErrorBox, Skeleton } from '@/components/ui'
import Pagination from '@/components/ui/Pagination.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { formatDateTime } from '@/lib/utils/datetime.js'
import { isCampaignGm } from '@/features/campaigns/api.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useSessionsPage } from '@/features/campaigns/queries.js'
import SessionFormDrawer from './SessionFormDrawer.jsx'
import ActiveFilters, { FiltersButton } from './ActiveFilters.jsx'
import FilterDrawer from './FilterDrawer.jsx'
import StatusBadge from './StatusBadge.jsx'

const PAGE_SIZE = 20
const STATUS_OPTIONS = [['', 'Все'], ['planned', 'Запланированные'], ['played', 'Архив — сыгранные'], ['cancelled', 'Отменённые']]
const FILTER_SECTIONS = [{ key: 'status', legend: 'Статус сессии', hint: '«Архив» — сыгранные сессии с хрониками и тем, кто был.', options: STATUS_OPTIONS }]

// Сессии — это и расписание стола, и архив: игроки видят каждую (дата, кто был), хронику — после публикации.
// Каждая сессия открывается своей страницей (SessionPage): хроника, кто был, отзывы.
export default function SessionsPanel({ campaign }) {
  const isGm = isCampaignGm(campaign)
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const applyStatus = (next) => { setStatus(next); setPage(1) }
  const [page, setPage] = useState(1)
  const [form, setForm] = useState(null)
  const { data, isLoading, isPlaceholderData, error, refetch } = useSessionsPage(campaign.id, { status: status || undefined, page, size: PAGE_SIZE })
  const sessions = data?.items ?? []

  return (
    <section aria-label="Сессии кампании" className="campaign-panel">
      <div className="campaign-panel-header">
        <div className="campaign-filters"><FiltersButton count={status ? 1 : 0} open={filtersOpen} onClick={() => setFiltersOpen(true)} /><ActiveFilters chips={status ? [['status', STATUS_OPTIONS.find(([key]) => key === status)[1], () => applyStatus('')]] : []} onReset={() => applyStatus('')} /></div>
        {isGm && <Button onClick={() => setForm({ session: null })}><LoreIcon name="plus" />Новая сессия</Button>}
      </div>
      {error && <ErrorBox error={toCampaignError(error)} onRetry={refetch} />}
      {isLoading && <div className="campaign-sessions" aria-busy="true"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>}
      {!isLoading && !error && (sessions.length === 0
        ? <p className="lore-empty">{status ? 'Сессий с таким статусом нет.' : isGm ? 'Сессий пока нет. Запланируйте первую — игроки увидят её в расписании.' : 'ГМ ещё не запланировал ни одной сессии.'}</p>
        : <ul className={`campaign-sessions ${isPlaceholderData ? 'opacity-60' : ''}`} aria-label="Список сессий">{sessions.map((session) => <li key={session.id}>
          <Link to={`/campaigns/${campaign.id}/sessions/${session.id}`} className="catalog-record-card campaign-session-card">
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2"><span className="font-display font-bold text-stone-100">{session.title || `Сессия №${session.number}`}</span><StatusBadge kind="session" status={session.status} />{session.published_at ? <Badge tone="good">Хроника</Badge> : isGm && <Badge>Хроника — черновик</Badge>}</span>
              <span className="block text-xs text-stone-400">{session.scheduled_at ? formatDateTime(session.scheduled_at) : 'Дата не назначена'}</span>
            </span>
            <LoreIcon name="chevron" />
          </Link>
        </li>)}</ul>)}
      <Pagination page={page} total={data?.total ?? 0} size={PAGE_SIZE} onPage={setPage} />
      {filtersOpen && <FilterDrawer title="Фильтры сессий" subtitle={campaign.title} sections={FILTER_SECTIONS} value={{ status }} empty={{ status: '' }} onApply={(next) => applyStatus(next.status)} onClose={() => setFiltersOpen(false)} />}
      {form && <SessionFormDrawer campaign={campaign} session={form.session} onClose={() => setForm(null)} onSaved={(saved) => { setForm(null); navigate(`/campaigns/${campaign.id}/sessions/${saved.id}`) }} />}
    </section>
  )
}
