import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import SearchToolbar from '@/components/ui/SearchToolbar.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { useAuth } from '@/features/auth/useAuth.js'
import { useTableSchedule } from '../queries.js'
import ActiveFilters from '../components/ActiveFilters.jsx'
import CampaignFormDrawer from '../components/CampaignFormDrawer.jsx'
import CampaignList from '../components/CampaignList.jsx'
import FilterDrawer from '../components/FilterDrawer.jsx'

const EMPTY_FILTERS = { archive: 'current', scope: 'mine' }
const ARCHIVE_SECTION = { key: 'archive', legend: 'Архив', hint: 'Архивный стол можно вернуть, но персонажей придётся добавить заново.', options: [['current', 'Только текущие'], ['all', 'Вместе с архивом']] }
const SCOPE_SECTION = { key: 'scope', legend: 'Чьи столы', hint: 'Основатель может открыть любую кампанию платформы.', options: [['mine', 'Мои столы'], ['all', 'Все кампании платформы']] }

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
  const schedule = useTableSchedule({ enabled: !allCampaigns })
  // «Все кампании» основателя не сочетаются с ролью (бэк ответит 400) — роль тогда не отправляем.
  const params = { role: allCampaigns ? undefined : 'gm', all_campaigns: allCampaigns || undefined, q: appliedQuery || undefined, include_archived: filters.archive === 'all' || undefined }
  const chips = [
    filters.archive === 'all' && ['archive', 'Вместе с архивом', () => setFilters((current) => ({ ...current, archive: 'current' }))],
    allCampaigns && ['scope', 'Все кампании платформы', () => setFilters((current) => ({ ...current, scope: 'mine' }))],
  ].filter(Boolean)

  return (
    <div className="lore-page gm-campaigns-page">
      <header className="lore-header article-workspace-header"><div><p className="lore-eyebrow">Мастерская мира</p><h1 className="heading-section">Игровые столы</h1><p className="lore-intro">Ваши игровые группы: персонажи, ближайшие сессии, заметки и отзывы игроков.</p></div><div className="flex flex-wrap gap-2"><Link className="lore-chip" to="/gm/public-campaigns"><LoreIcon name="book" />Публичные кампании</Link><Button onClick={() => setCreating(true)}><LoreIcon name="plus" />Создать стол</Button></div></header>
      <div className="min-w-0">
          <div className="lore-search-panel">
            <SearchToolbar className="lore-search-toolbar" query={query} onQueryChange={setQuery} onSearch={() => setAppliedQuery(query.trim())} onFilters={() => setFiltersOpen(true)} filterCount={chips.length} filtersOpen={filtersOpen} label="Поиск игровых столов" placeholder="Название кампании…" />
            <ActiveFilters chips={chips} onReset={() => setFilters(EMPTY_FILTERS)} />
          </div>
          <CampaignList key={JSON.stringify(params)} label="Игровые столы" params={params} schedule={allCampaigns ? undefined : schedule} filtered={Boolean(appliedQuery || chips.length)} emptyText="Вы пока не ведёте ни одного стола. Создайте свой — или начните по публичной кампании." />
      </div>
      {filtersOpen && <FilterDrawer title="Фильтры игровых столов" subtitle="Какие кампании показывать." sections={isFounder ? [ARCHIVE_SECTION, SCOPE_SECTION] : [ARCHIVE_SECTION]} value={filters} empty={EMPTY_FILTERS} onApply={setFilters} onClose={() => setFiltersOpen(false)} />}
      {creating && <CampaignFormDrawer onClose={() => setCreating(false)} onSaved={(campaign) => { setCreating(false); navigate(`/campaigns/${campaign.id}`) }} />}
    </div>
  )
}
