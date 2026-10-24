import { useState } from 'react'
import { Link } from 'react-router-dom'
import SearchToolbar from '@/components/ui/SearchToolbar.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import ActiveFilters from '../components/ActiveFilters.jsx'
import CampaignList from '../components/CampaignList.jsx'
import FilterDrawer from '../components/FilterDrawer.jsx'

const EMPTY_FILTERS = { archive: 'current' }
const FILTER_SECTIONS = [{ key: 'archive', legend: 'Архив', hint: 'Архивные столы можно читать, но играть в них больше нельзя.', options: [['current', 'Только текущие'], ['all', 'Вместе с архивом']] }]

// Мои игры — столы, где играют персонажи пользователя. Сами персонажи — в «Моих персонажах»,
// столы, которые пользователь ведёт как ГМ, — в «Игровых столах».
export default function MyGamesPage() {
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const params = { role: 'player', q: appliedQuery || undefined, include_archived: filters.archive === 'all' || undefined }
  const chips = [filters.archive === 'all' && ['archive', 'Вместе с архивом', () => setFilters(EMPTY_FILTERS)]].filter(Boolean)

  return (
    <div className="lore-page player-games-page">
      <header className="lore-header article-workspace-header"><div><p className="lore-eyebrow">Личный кабинет</p><h1 className="heading-section">Мои игры</h1><p className="lore-intro">Столы, где играют ваши персонажи. В игру персонажа добавляет ГМ стола.</p></div><div className="flex flex-wrap gap-2"><Link className="lore-chip" to="/characters"><LoreIcon name="book" />Мои персонажи</Link><Link className="lore-chip" to="/schedule"><LoreIcon name="history" />Расписание</Link></div></header>
      <div className="lore-search-panel">
        <SearchToolbar className="lore-search-toolbar" query={query} onQueryChange={setQuery} onSearch={() => setAppliedQuery(query.trim())} onFilters={() => setFiltersOpen(true)} filterCount={chips.length} filtersOpen={filtersOpen} label="Поиск моих игр" placeholder="Название кампании…" />
        <ActiveFilters chips={chips} onReset={() => setFilters(EMPTY_FILTERS)} />
      </div>
      <CampaignList key={JSON.stringify(params)} label="Мои игры" params={params} filtered={Boolean(appliedQuery || chips.length)} emptyText="Ваши персонажи пока не играют ни в одной кампании. Добавить персонажа в игру может ГМ стола." />
      {filtersOpen && <FilterDrawer title="Фильтры игр" subtitle="Какие столы показывать." sections={FILTER_SECTIONS} value={filters} empty={EMPTY_FILTERS} onApply={setFilters} onClose={() => setFiltersOpen(false)} />}
    </div>
  )
}
