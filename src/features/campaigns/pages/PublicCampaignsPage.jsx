import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, ErrorBox, Skeleton } from '@/components/ui'
import Pagination from '@/components/ui/Pagination.jsx'
import SearchToolbar from '@/components/ui/SearchToolbar.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { useTagSearch } from '@/features/articles/queries.js'
import { useAuth } from '@/features/auth/useAuth.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { usePublicCampaignsPage } from '@/features/campaigns/queries.js'
import ActiveFilters from '../components/ActiveFilters.jsx'
import FilterDrawer from '../components/FilterDrawer.jsx'
import PresetNotice from '../components/PresetNotice.jsx'

const PAGE_SIZE = 12
const EMPTY_FILTERS = { tags: [] }
const FILTER_SECTIONS = [{ key: 'tags', legend: 'Теги', type: 'tags', hint: 'Будут показаны кампании с любым из выбранных тегов.' }]

// Каталог кампаний — для всех одинаковый, глазами игрока: только опубликованное и без секретов мастера.
// Черновики, правка и база знаний — в «Редакторе публичных кампаний» ГМ.
export default function PublicCampaignsPage() {
  const { isGM } = useAuth()
  const navigate = useNavigate()
  // ?q= приходит с поиска на главной.
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q')?.trim() ?? ''
  const [query, setQuery] = useState(initialQuery)
  const [appliedQuery, setAppliedQuery] = useState(initialQuery)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)
  const { data, isLoading, isPlaceholderData, error, refetch } = usePublicCampaignsPage({ q: appliedQuery || undefined, tag_id: filters.tags.length ? filters.tags.map((tag) => tag.id) : undefined, page, size: PAGE_SIZE })
  const presets = data?.items ?? []
  // У тегов кампании нет счётчика использования — популярность берём из общего списка тегов (тот же запрос, что в фильтрах).
  const popularTags = useTagSearch()
  const tagRank = new Map((popularTags.data?.items ?? []).map((tag, index) => [tag.id, index]))
  const applyFilters = (next) => { setFilters(next); setPage(1) }
  const chips = filters.tags.map((tag) => [`tag-${tag.id}`, `#${tag.name}`, () => applyFilters({ tags: filters.tags.filter((item) => item.id !== tag.id) })])
  const filtered = Boolean(appliedQuery || chips.length)

  return (
    <div className="lore-page public-campaigns-page">
      <header className="lore-header article-workspace-header"><div><p className="lore-eyebrow">Доска приключений</p><h1 className="heading-section">Кампании</h1><p className="lore-intro">Готовые завязки: выберите историю — ГМ соберёт по ней свой стол.</p></div>{isGM && <Button variant="ghost" onClick={() => navigate('/gm/public-campaigns')}><LoreIcon name="settings" />Редактор</Button>}</header>
      <div className="lore-search-panel">
        <SearchToolbar className="lore-search-toolbar" query={query} onQueryChange={setQuery} onSearch={() => { setAppliedQuery(query.trim()); setPage(1) }} onFilters={() => setFiltersOpen(true)} filterCount={chips.length} filtersOpen={filtersOpen} label="Поиск кампаний" placeholder="Название или зазывалка…" />
        <ActiveFilters chips={chips} onReset={() => applyFilters(EMPTY_FILTERS)} />
      </div>
      {filtersOpen && <FilterDrawer title="Фильтры кампаний" subtitle="Выберите интересующие темы." sections={FILTER_SECTIONS} value={filters} empty={EMPTY_FILTERS} onApply={applyFilters} onClose={() => setFiltersOpen(false)} />}
      {error && <ErrorBox error={toCampaignError(error)} onRetry={refetch} />}
      {!error && <section className="lore-results" aria-label="Каталог кампаний">
        <div aria-busy={isLoading} className={`lore-article-list transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}>
          {!isLoading && filtered && presets.length > 0 && <p className="lore-results-toolbar">Найдено: {data.total}</p>}
          {isLoading && <div className="adventure-board">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-24 w-full" />)}</div>}
          {presets.length > 0 && <ul className="adventure-board">{presets.map((preset) => <PresetNotice key={preset.id} preset={preset} tagRank={tagRank} />)}</ul>}
          {!isLoading && presets.length === 0 && <p className="lore-empty">{filtered ? 'По этим условиям кампаний нет.' : 'Кампаний пока нет.'}</p>}
        </div>
        <Pagination page={page} total={data?.total ?? 0} size={PAGE_SIZE} onPage={setPage} />
      </section>}
    </div>
  )
}
