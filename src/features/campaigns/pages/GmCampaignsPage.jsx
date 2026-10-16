import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, Skeleton } from '@/components/ui'
import SearchToolbar from '@/components/ui/SearchToolbar.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { useAuth } from '@/features/auth/useAuth.js'
import { formatDateTime } from '@/lib/utils/datetime.js'
import { useSchedule } from '@/features/campaigns/queries.js'
import ActiveFilters from '../components/ActiveFilters.jsx'
import CampaignFormDrawer from '../components/CampaignFormDrawer.jsx'
import CampaignList from '../components/CampaignList.jsx'
import FilterDrawer from '../components/FilterDrawer.jsx'

const EMPTY_FILTERS = { archive: 'current', scope: 'mine' }
const ARCHIVE_SECTION = { key: 'archive', legend: 'Архив', hint: 'Архивный стол можно вернуть, но персонажей придётся добавить заново.', options: [['current', 'Только текущие'], ['all', 'Вместе с архивом']] }
const SCOPE_SECTION = { key: 'scope', legend: 'Чьи столы', hint: 'Основатель может открыть любую кампанию платформы.', options: [['mine', 'Мои столы'], ['all', 'Все кампании платформы']] }

// Ближайшие сессии столов, которые ведёт ГМ (своё расписание игрока — в личном кабинете).
function UpcomingSessions() {
  const { data, isLoading } = useSchedule({ role: 'gm', size: 5 })
  const sessions = data?.items ?? []
  return (
    <section className="preset-section gm-campaigns-upcoming" aria-label="Ближайшие сессии">
      <h2 className="heading-card">Ближайшие сессии</h2>
      {isLoading ? <Skeleton className="h-12 w-full" /> : sessions.length === 0 ? <p className="text-sm text-stone-400">Нет запланированных сессий с датой.</p> : <ul className="schedule-entries">{sessions.map((session) => <li key={session.id}><Link to={`/campaigns/${session.campaign.id}?tab=sessions`} className="catalog-record-card schedule-entry" data-status={session.status}><span className="min-w-0 flex-1"><span className="block font-display font-bold text-stone-100">{session.campaign.title}</span><span className="block truncate text-xs text-stone-400">Сессия №{session.number}{session.title && ` · ${session.title}`}</span></span><Badge tone="accent">{formatDateTime(session.scheduled_at)}</Badge></Link></li>)}</ul>}
    </section>
  )
}

// Игровые столы — мастерская ГМ: кампании, которые он ведёт (основатель может открыть все кампании платформы).
export default function GmCampaignsPage() {
  const { isFounder } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const allCampaigns = isFounder && filters.scope === 'all'
  // «Все кампании» основателя не сочетаются с ролью (бэк ответит 400) — роль тогда не отправляем.
  const params = { role: allCampaigns ? undefined : 'gm', all_campaigns: allCampaigns || undefined, q: appliedQuery || undefined, include_archived: filters.archive === 'all' || undefined }
  const chips = [
    filters.archive === 'all' && ['archive', 'Вместе с архивом', () => setFilters((current) => ({ ...current, archive: 'current' }))],
    allCampaigns && ['scope', 'Все кампании платформы', () => setFilters((current) => ({ ...current, scope: 'mine' }))],
  ].filter(Boolean)

  return (
    <div className="lore-page gm-campaigns-page">
      <header className="lore-header article-workspace-header"><div><p className="lore-eyebrow">Мастерская мира</p><h1 className="heading-section">Игровые столы</h1><p className="lore-intro">Кампании, которые вы ведёте: состав и листы персонажей, сессии, заметки и отзывы игроков.</p></div><div className="flex flex-wrap gap-2"><Link className="lore-chip" to="/gm/public-campaigns"><LoreIcon name="book" />Редактор публичных кампаний</Link><Button onClick={() => setCreating(true)}><LoreIcon name="plus" />Создать кампанию</Button></div></header>
      <div className="gm-campaigns-layout">
        <div className="min-w-0">
          <div className="lore-search-panel">
            <SearchToolbar className="lore-search-toolbar" query={query} onQueryChange={setQuery} onSearch={() => setAppliedQuery(query.trim())} onFilters={() => setFiltersOpen(true)} filterCount={chips.length} filtersOpen={filtersOpen} label="Поиск игровых столов" placeholder="Название кампании…" />
            <ActiveFilters chips={chips} onReset={() => setFilters(EMPTY_FILTERS)} />
          </div>
          <CampaignList key={JSON.stringify(params)} label="Игровые столы" params={params} filtered={Boolean(appliedQuery || chips.length)} emptyText="Вы пока не ведёте ни одной кампании. Создайте свою — или начните по публичной кампании." />
        </div>
        <UpcomingSessions />
      </div>
      {filtersOpen && <FilterDrawer title="Фильтры игровых столов" subtitle="Какие кампании показывать." sections={isFounder ? [ARCHIVE_SECTION, SCOPE_SECTION] : [ARCHIVE_SECTION]} value={filters} empty={EMPTY_FILTERS} onApply={setFilters} onClose={() => setFiltersOpen(false)} />}
      {creating && <CampaignFormDrawer onClose={() => setCreating(false)} onSaved={(campaign) => { setCreating(false); navigate(`/campaigns/${campaign.id}`) }} />}
    </div>
  )
}
