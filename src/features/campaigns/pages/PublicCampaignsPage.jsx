import { useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { ErrorBox, Skeleton } from '@/components/ui'
import Pagination from '@/components/ui/Pagination.jsx'
import SearchToolbar from '@/components/ui/SearchToolbar.jsx'
import { parseTagIds } from '@/features/articles/filters.js'
import { useRememberTags, useTagsByIds, useTagSearch } from '@/features/articles/queries.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { usePublicCampaignsPage } from '@/features/campaigns/queries.js'
import useCampaignListScroll from '@/features/campaigns/useCampaignListScroll.js'
import ActiveFilters from '../components/ActiveFilters.jsx'
import FilterDrawer from '../components/FilterDrawer.jsx'
import PresetNotice from '../components/PresetNotice.jsx'

const PAGE_SIZE = 12
const EMPTY_FILTERS = { tags: [] }
const FILTER_SECTIONS = [{ key: 'tags', legend: 'Теги', type: 'tags', hint: 'Будут показаны кампании с любым из выбранных тегов.' }]

// Каталог кампаний — для всех одинаковый, глазами игрока: только опубликованное и без секретов мастера.
// Черновики, правка и база знаний — в «Редакторе публичных кампаний» ГМ.
export default function PublicCampaignsPage() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const appliedQuery = searchParams.get('q')?.trim() ?? ''
  const tagIds = [...new Set(parseTagIds(searchParams))].slice(0, 100)
  const tags = useTagsByIds(tagIds)
  const rememberTags = useRememberTags()
  const filters = { tags }
  const pageValue = Number(searchParams.get('page') ?? 1)
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1
  const [query, setQuery] = useState(appliedQuery)
  const [syncedQuery, setSyncedQuery] = useState(appliedQuery)
  if (appliedQuery !== syncedQuery) {
    setSyncedQuery(appliedQuery)
    setQuery(appliedQuery)
  }
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { data, isLoading, isPlaceholderData, error, refetch } = usePublicCampaignsPage({ q: appliedQuery || undefined, tag_id: tagIds.length ? tagIds : undefined, page, size: PAGE_SIZE })
  useCampaignListScroll(Boolean(data || error) && !isPlaceholderData)
  const presets = data?.items ?? []
  // У тегов кампании нет счётчика использования — популярность берём из общего списка тегов (тот же запрос, что в фильтрах).
  const popularTags = useTagSearch()
  const tagRank = new Map((popularTags.data?.items ?? []).map((tag, index) => [tag.id, index]))
  const updateParams = (patch) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (!('page' in patch)) next.delete('page')
    setSearchParams(next)
  }
  const applyFilters = (next) => {
    rememberTags(next.tags)
    updateParams({ tags: next.tags.map((tag) => tag.id).join(',') })
  }
  const chips = filters.tags.map((tag) => [`tag-${tag.id}`, `#${tag.name}`, () => applyFilters({ tags: filters.tags.filter((item) => item.id !== tag.id) })])
  const filtered = Boolean(appliedQuery || chips.length)

  return (
    <div className="lore-page public-campaigns-page">
      <header className="lore-header article-workspace-header"><div><p className="lore-eyebrow">Доска приключений</p><h1 className="heading-section">Кампании</h1><p className="lore-intro">Готовые завязки: выберите историю — ГМ соберёт по ней свой стол.</p></div></header>
      <div className="lore-search-panel">
        <SearchToolbar className="lore-search-toolbar" query={query} onQueryChange={setQuery} onSearch={() => updateParams({ q: query.trim() })} onFilters={() => setFiltersOpen(true)} filterCount={chips.length} filtersOpen={filtersOpen} label="Поиск кампаний" placeholder="Название или зазывалка…" />
        <ActiveFilters chips={chips} onReset={() => applyFilters(EMPTY_FILTERS)} />
      </div>
      {filtersOpen && <FilterDrawer title="Фильтры кампаний" subtitle="Выберите интересующие темы." sections={FILTER_SECTIONS} value={filters} empty={EMPTY_FILTERS} onApply={applyFilters} onClose={() => setFiltersOpen(false)} />}
      {error && <ErrorBox error={toCampaignError(error)} onRetry={refetch} />}
      {!error && <section className="lore-results" aria-label="Каталог кампаний">
        <div aria-busy={isLoading} className={`lore-article-list transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}>
          {!isLoading && filtered && presets.length > 0 && <p className="lore-results-toolbar">Найдено: {data.total}</p>}
          {isLoading && <div className="adventure-board">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-24 w-full" />)}</div>}
          {presets.length > 0 && <ul className="adventure-board">{presets.map((preset) => <PresetNotice key={preset.id} preset={preset} tagRank={tagRank} listSearch={location.search} />)}</ul>}
          {!isLoading && presets.length === 0 && <p className="lore-empty">{filtered ? 'По этим условиям кампаний нет.' : 'Кампаний пока нет.'}</p>}
        </div>
        <Pagination page={page} total={data?.total ?? 0} size={PAGE_SIZE} onPage={(next) => updateParams({ page: next > 1 ? String(next) : '' })} />
      </section>}
    </div>
  )
}
