import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, ErrorBox, Skeleton } from '@/components/ui'
import Pagination from '@/components/ui/Pagination.jsx'
import SearchToolbar from '@/components/ui/SearchToolbar.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { stripGmBlocks } from '@/features/articles/secrets.js'
import { useAuth } from '@/features/auth/useAuth.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { usePublicCampaignsPage } from '@/features/campaigns/queries.js'
import ActiveFilters from '../components/ActiveFilters.jsx'
import FilterDrawer from '../components/FilterDrawer.jsx'

const PAGE_SIZE = 12
const EMPTY_FILTERS = { tags: [] }
const FILTER_SECTIONS = [{ key: 'tags', legend: 'Теги', type: 'tags', hint: 'Будут показаны кампании с любым из выбранных тегов.' }]

// Строка каталога — как строка статьи в лоре: метаданные, заголовок со стрелкой, зазывалка.
function PresetRow({ preset }) {
  const pitch = stripGmBlocks(preset.pitch ?? '').trim()
  return (
    <Link to={`/public-campaigns/${preset.slug}`} className="lore-article-row">
      <div className="lore-article-meta">
        <span className="lore-article-type">{preset.campaign_count > 0 ? `Сыграно столов: ${preset.campaign_count}` : 'Ещё не играли'}</span>
        {preset.tags.map((tag) => <span key={tag.id} className="text-xs text-stone-500">#{tag.name}</span>)}
        {preset.author && <span className="text-xs text-stone-500">автор {preset.author.username}</span>}
      </div>
      <div className="lore-article-heading"><h2>{preset.title}</h2><LoreIcon name="arrow" /></div>
      {pitch && <p className="lore-article-excerpt">{pitch}</p>}
    </Link>
  )
}

// Каталог кампаний — для всех одинаковый, глазами игрока: только опубликованное и без секретов мастера.
// Черновики, правка и база знаний — в «Редакторе публичных кампаний» ГМ.
export default function PublicCampaignsPage() {
  const { isGM } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)
  const { data, isLoading, isPlaceholderData, error, refetch } = usePublicCampaignsPage({ q: appliedQuery || undefined, tag_id: filters.tags.length ? filters.tags.map((tag) => tag.id) : undefined, page, size: PAGE_SIZE })
  const presets = data?.items ?? []
  const applyFilters = (next) => { setFilters(next); setPage(1) }
  const chips = filters.tags.map((tag) => [`tag-${tag.id}`, `#${tag.name}`, () => applyFilters({ tags: filters.tags.filter((item) => item.id !== tag.id) })])
  const filtered = Boolean(appliedQuery || chips.length)

  return (
    <div className="lore-page public-campaigns-page">
      <header className="lore-header article-workspace-header"><div><p className="lore-eyebrow">Библиотека мира</p><h1 className="heading-section">Кампании</h1><p className="lore-intro">Готовые завязки: выберите историю — ГМ соберёт по ней свой стол.</p></div>{isGM && <Button variant="ghost" onClick={() => navigate('/gm/public-campaigns')}><LoreIcon name="settings" />Редактор</Button>}</header>
      <div className="lore-search-panel">
        <SearchToolbar className="lore-search-toolbar" query={query} onQueryChange={setQuery} onSearch={() => { setAppliedQuery(query.trim()); setPage(1) }} onFilters={() => setFiltersOpen(true)} filterCount={chips.length} filtersOpen={filtersOpen} label="Поиск кампаний" placeholder="Название или зазывалка…" />
        <ActiveFilters chips={chips} onReset={() => applyFilters(EMPTY_FILTERS)} />
      </div>
      {filtersOpen && <FilterDrawer title="Фильтры кампаний" subtitle="Выберите интересующие темы." sections={FILTER_SECTIONS} value={filters} empty={EMPTY_FILTERS} onApply={applyFilters} onClose={() => setFiltersOpen(false)} />}
      {error && <ErrorBox error={toCampaignError(error)} onRetry={refetch} />}
      {!error && <section className="lore-results" aria-label="Каталог кампаний">
        <div aria-busy={isLoading} className={`lore-article-list transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}>
          {isLoading && Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="my-3 h-14 w-full" />)}
          {!isLoading && filtered && presets.length > 0 && <p className="lore-results-toolbar">Найдено: {data.total}</p>}
          {presets.map((preset) => <PresetRow key={preset.id} preset={preset} />)}
          {!isLoading && presets.length === 0 && <p className="lore-empty">{filtered ? 'По этим условиям кампаний нет.' : 'Кампаний пока нет.'}</p>}
        </div>
        <Pagination page={page} total={data?.total ?? 0} size={PAGE_SIZE} onPage={setPage} />
      </section>}
    </div>
  )
}
