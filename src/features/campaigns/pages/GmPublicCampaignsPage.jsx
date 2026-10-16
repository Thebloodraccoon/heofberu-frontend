import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge, Button, ErrorBox, Skeleton } from '@/components/ui'
import Pagination from '@/components/ui/Pagination.jsx'
import SearchToolbar from '@/components/ui/SearchToolbar.jsx'
import { useToasts } from '@/components/ToastProvider.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { stripGmBlocks } from '@/features/articles/secrets.js'
import { publicCampaignStatusLabels } from '@/lib/i18n/index.js'
import { PUBLIC_CAMPAIGN_STATUSES } from '@/features/campaigns/api.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { usePublicCampaignsPage } from '@/features/campaigns/queries.js'
import ActiveFilters from '../components/ActiveFilters.jsx'
import FilterDrawer from '../components/FilterDrawer.jsx'
import PresetCreateForm from '../components/PresetCreateForm.jsx'
import PresetWorkspace from '../components/PresetWorkspace.jsx'

const PAGE_SIZE = 20
const EMPTY_FILTERS = { statuses: [], tags: [] }
const STATUS_TONES = { draft: 'default', published: 'good', archived: 'violet' }
const FILTER_SECTIONS = [
  { key: 'statuses', legend: 'Статус', hint: 'Без выбора — черновики и опубликованные. Черновики видны только их автору и основателю.', multiple: true, options: PUBLIC_CAMPAIGN_STATUSES.map((status) => [status, publicCampaignStatusLabels[status]]) },
  { key: 'tags', legend: 'Теги', type: 'tags', hint: 'Будут показаны кампании с любым из выбранных тегов.' },
]

// Редактор публичных кампаний — по образцу редактора статей лора: библиотека строками, открытая кампания —
// на всю ширину, с вкладками «Текст» / «База знаний» и параметрами справа. Выбор живёт в URL (?slug=… / ?slug=new),
// поэтому «Редактор» со страницы кампании открывает её сразу.
export default function GmPublicCampaignsPage() {
  const { push } = useToasts()
  const [params, setParams] = useSearchParams()
  const selected = params.get('slug')
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)
  const statuses = filters.statuses.length ? filters.statuses : ['draft', 'published']
  const { data, isLoading, isPlaceholderData, error, refetch } = usePublicCampaignsPage({ q: appliedQuery || undefined, status: statuses, tag_id: filters.tags.length ? filters.tags.map((tag) => tag.id) : undefined, page, size: PAGE_SIZE })
  const presets = data?.items ?? []
  const select = (slug) => setParams(slug ? { slug } : {}, { replace: !slug })
  const applyFilters = (next) => { setFilters(next); setPage(1) }
  const chips = [
    ...filters.statuses.map((status) => [`status-${status}`, publicCampaignStatusLabels[status], () => applyFilters({ ...filters, statuses: filters.statuses.filter((item) => item !== status) })]),
    ...filters.tags.map((tag) => [`tag-${tag.id}`, `#${tag.name}`, () => applyFilters({ ...filters, tags: filters.tags.filter((item) => item.id !== tag.id) })]),
  ]

  return (
    <div className="article-workspace lore-page">
      {selected === null && <header className="lore-header article-workspace-header">
        <div><p className="lore-eyebrow">Мастерская мира</p><h1 className="heading-section">Публичные кампании</h1><p className="lore-intro">Зазывалки, описания и база знаний, по которым любой ГМ может собрать свой стол.</p></div>
        <div className="flex flex-wrap gap-2"><Button onClick={() => select('new')}><LoreIcon name="plus" />Новая публичная кампания</Button></div>
      </header>}
      {selected !== null && <div className="article-workspace-nav lore-reading-toolbar">
        <button type="button" className="article-back" onClick={() => select(null)} aria-label="Вернуться к публичным кампаниям"><LoreIcon name="back" />Ко всем публичным кампаниям</button>
        {selected !== 'new' && <div className="lore-reading-actions"><Link to={`/public-campaigns/${selected}/knowledge`}><LoreIcon name="book" />База знаний</Link><Link to={`/public-campaigns/${selected}`}><LoreIcon name="eye" />Страница</Link></div>}
      </div>}

      {selected === null && <section className="article-library">
        <div className="lore-search-panel">
          <SearchToolbar query={query} onQueryChange={setQuery} onSearch={() => { setAppliedQuery(query.trim()); setPage(1) }} onFilters={() => setFiltersOpen(true)} filterCount={chips.length} filtersOpen={filtersOpen} label="Поиск публичных кампаний" placeholder="Название или зазывалка…" submitLabel="Найти публичные кампании" />
          <ActiveFilters chips={chips} onReset={() => applyFilters(EMPTY_FILTERS)} />
        </div>
        {filtersOpen && <FilterDrawer title="Фильтры публичных кампаний" subtitle="Статус и темы." sections={FILTER_SECTIONS} value={filters} empty={EMPTY_FILTERS} onApply={applyFilters} onClose={() => setFiltersOpen(false)} />}
        {isLoading && <Skeleton className="h-24 w-full" />}
        {error && <ErrorBox error={toCampaignError(error)} onRetry={refetch} />}
        <ul className={isPlaceholderData ? 'opacity-60' : ''} aria-label="Публичные кампании">
          {presets.map((preset) => <li key={preset.id}>
            <button type="button" onClick={() => select(preset.slug)} className="lore-article-row article-library-row">
              <span className="lore-article-meta">
                <span className="lore-article-type">{preset.campaign_count > 0 ? `Столов: ${preset.campaign_count}` : 'Ещё не играли'}</span>
                <Badge tone={STATUS_TONES[preset.status]}>{publicCampaignStatusLabels[preset.status]}</Badge>
                {preset.tags.map((tag) => <span key={tag.id} className="text-xs text-stone-500">#{tag.name}</span>)}
              </span>
              <span className="lore-article-heading"><span className="article-library-title">{preset.title}</span></span>
              <span className="text-xs text-stone-500">{preset.author ? `Автор: ${preset.author.username}` : 'Автор удалён'}</span>
              {preset.pitch && <span className="lore-article-excerpt">{stripGmBlocks(preset.pitch).trim()}</span>}
              <LoreIcon name="arrow" className="lore-article-arrow" />
            </button>
          </li>)}
          {data && presets.length === 0 && <li className="lore-empty">{appliedQuery || chips.length ? 'По выбранным условиям ничего нет.' : 'Публичных кампаний пока нет.'}</li>}
        </ul>
        <Pagination page={page} total={data?.total ?? 0} size={PAGE_SIZE} onPage={setPage} />
      </section>}

      {selected === 'new' && <PresetCreateForm onSaved={(preset) => { push('Черновик создан', 'Опубликуйте, когда будет готово. Статьи подвяжете на странице «База знаний».', 'success'); select(preset.slug) }} onCancel={() => select(null)} />}
      {selected !== null && selected !== 'new' && <PresetWorkspace key={selected} slug={selected} />}
    </div>
  )
}
