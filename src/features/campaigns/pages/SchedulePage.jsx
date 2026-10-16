import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBox, Skeleton } from '@/components/ui'
import Pagination from '@/components/ui/Pagination.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { formatDay, formatTime, localDayKey } from '@/lib/utils/datetime.js'
import { FULL_PAGE } from '@/features/campaigns/api.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useCampaignsPage, useSchedule } from '@/features/campaigns/queries.js'
import ActiveFilters, { FiltersButton } from '../components/ActiveFilters.jsx'
import FilterDrawer from '../components/FilterDrawer.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

const PAGE_SIZE = 20
const EMPTY_FILTERS = { cancelled: 'hide' }
const FILTER_SECTIONS = [{ key: 'cancelled', legend: 'Отменённые сессии', hint: 'Отменённая сессия остаётся в расписании зачёркнутой.', options: [['hide', 'Скрывать'], ['show', 'Показывать']] }]

// Расписание игрока: ближайшие сессии столов, где играют его персонажи, по дням и с тем, кто из них идёт.
// Свои столы ГМ видит в «Игровых столах»; сессии без даты сюда не попадают.
export default function SchedulePage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)
  const includeCancelled = filters.cancelled === 'show'
  const { data, isLoading, isPlaceholderData, error, refetch } = useSchedule({ role: 'player', include_cancelled: includeCancelled || undefined, page, size: PAGE_SIZE })
  const { data: campaignPage } = useCampaignsPage({ role: 'player', size: FULL_PAGE })
  const entries = useMemo(() => data?.items ?? [], [data])
  const charactersAt = useMemo(() => new Map((campaignPage?.items ?? []).map((campaign) => [campaign.id, (campaign.my_characters ?? []).filter((mine) => mine.status === 'active').map((mine) => mine.name)])), [campaignPage])
  // Группируем по дню в часовом поясе браузера: сессия в 01:00 по Киеву — это «завтра», хотя в UTC ещё «сегодня».
  const days = useMemo(() => {
    const groups = new Map()
    for (const entry of entries) {
      const key = localDayKey(entry.scheduled_at)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(entry)
    }
    return [...groups.entries()]
  }, [entries])
  const apply = (next) => { setFilters(next); setPage(1) }

  return (
    <div className="lore-page schedule-page">
      <header className="lore-header article-workspace-header"><div><p className="lore-eyebrow">Личный кабинет</p><h1 className="heading-section">Расписание</h1><p className="lore-intro">Ближайшие сессии столов, где играют ваши персонажи.</p></div><Link className="lore-chip" to="/characters"><LoreIcon name="book" />Мои персонажи и игры</Link></header>
      <div className="lore-search-panel campaign-filters"><FiltersButton count={includeCancelled ? 1 : 0} open={filtersOpen} onClick={() => setFiltersOpen(true)} /><ActiveFilters chips={includeCancelled ? [['cancelled', 'С отменёнными', () => apply(EMPTY_FILTERS)]] : []} onReset={() => apply(EMPTY_FILTERS)} /></div>
      {filtersOpen && <FilterDrawer title="Фильтры расписания" subtitle="Какие сессии показывать." sections={FILTER_SECTIONS} value={filters} empty={EMPTY_FILTERS} onApply={apply} onClose={() => setFiltersOpen(false)} />}
      {error && <ErrorBox error={toCampaignError(error)} onRetry={refetch} />}
      {isLoading && <div className="schedule-days" aria-busy="true"><Skeleton className="h-6 w-48" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>}
      {!isLoading && !error && (days.length === 0
        ? <p className="lore-empty">Ближайших сессий нет. Когда ГМ назначит дату, сессия появится здесь.</p>
        : <div className={`schedule-days ${isPlaceholderData ? 'opacity-60' : ''}`}>{days.map(([key, items]) => <section key={key} className="schedule-day" aria-label={formatDay(items[0].scheduled_at)}>
          <h2 className="heading-card">{formatDay(items[0].scheduled_at)}</h2>
          <ul className="schedule-entries">{items.map((entry) => <li key={entry.id}>
            <Link to={`/campaigns/${entry.campaign.id}/sessions/${entry.id}`} className="catalog-record-card schedule-entry" data-status={entry.status}>
              <time className="schedule-time font-display" dateTime={entry.scheduled_at}>{formatTime(entry.scheduled_at)}</time>
              <span className="min-w-0 flex-1"><span className="block font-display font-bold text-stone-100">{entry.campaign.title}</span><span className="block truncate text-xs text-stone-400">{entry.title || `Сессия №${entry.number}`}{charactersAt.get(entry.campaign.id)?.length > 0 && ` · играет ${charactersAt.get(entry.campaign.id).join(', ')}`}</span></span>
              {entry.status !== 'planned' && <StatusBadge kind="session" status={entry.status} />}
            </Link>
          </li>)}</ul>
        </section>)}</div>)}
      <Pagination page={page} total={data?.total ?? 0} size={PAGE_SIZE} onPage={setPage} />
    </div>
  )
}
