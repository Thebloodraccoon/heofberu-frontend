import { useRef, useState } from 'react'
import { Badge, Button, ErrorBox, Skeleton } from '@/components/ui'
import SearchToolbar from '@/components/ui/SearchToolbar.jsx'
import Pagination from '@/components/ui/Pagination.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { stripGmBlocks } from '@/features/articles/secrets.js'
import { publicCampaignStatusLabels } from '@/lib/i18n/index.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { usePublicCampaignsPage } from '@/features/campaigns/queries.js'
import ActiveFilters from './ActiveFilters.jsx'
import { TagSection } from './FilterDrawer.jsx'

const SIZE = 10

// Экран выбора внутри панели стола: поиск и фильтры не открывают вложенные окна.
export default function PresetPicker({ value, onPick, onBack, backLabel }) {
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [tags, setTags] = useState([])
  const [draftTags, setDraftTags] = useState([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)
  const resultsRef = useRef(null)
  const { data, isLoading, isPlaceholderData, error, refetch } = usePublicCampaignsPage({ q: applied || undefined, tag_id: tags.length ? tags.map((tag) => tag.id) : undefined, status: ['published', 'draft'], page, size: SIZE })
  const presets = data?.items ?? []
  const applyTags = (next) => { setTags(next); setPage(1); setFiltersOpen(false) }
  const chips = tags.map((tag) => [`tag-${tag.id}`, `#${tag.name}`, () => applyTags(tags.filter((item) => item.id !== tag.id))])

  return (
    <div className="campaign-drawer-screen">
      <button type="button" className="article-back" onClick={onBack}><LoreIcon name="back" />{backLabel}</button>
      <div className="lore-search-panel">
        <SearchToolbar query={query} onQueryChange={setQuery} onSearch={() => { setApplied(query.trim()); setPage(1) }} onFilters={() => { setDraftTags(tags); setFiltersOpen((open) => !open) }} filterCount={chips.length} filtersOpen={filtersOpen} filtersInline label="Поиск публичных кампаний" placeholder="Название или зазывалка…" submitLabel="Найти публичные кампании" />
        <ActiveFilters chips={chips} onReset={() => applyTags([])} />
      </div>
      {filtersOpen && <div className="campaign-picker-filters">
        <TagSection legend="Теги" hint="Кампании с любым из выбранных тегов." selected={draftTags} onToggle={(tag) => setDraftTags((current) => current.some((item) => item.id === tag.id) ? current.filter((item) => item.id !== tag.id) : [...current, tag])} />
        <div className="article-filter-actions"><Button variant="ghost" onClick={() => applyTags([])}>Сбросить</Button><Button onClick={() => applyTags(draftTags)}>Применить</Button></div>
      </div>}
      <div ref={resultsRef} aria-busy={isLoading || isPlaceholderData}>
        {error && <ErrorBox error={toCampaignError(error)} onRetry={refetch} />}
        {isLoading && <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>}
        {!isLoading && !error && <>
          <p className="text-hint mb-3">Найдено: {data?.total ?? 0}</p>
          <ul className="campaign-picker-results" aria-label="Найденные публичные кампании">
            {presets.map((preset) => <li key={preset.id}>
              <button type="button" className="campaign-picker-card" data-active={value?.id === preset.id} aria-pressed={value?.id === preset.id} disabled={isPlaceholderData} onClick={() => onPick(preset)}>
                <span className="flex flex-wrap items-center gap-2"><span className="campaign-picker-title">{preset.title}</span>{preset.status !== 'published' && <Badge>{publicCampaignStatusLabels[preset.status]}</Badge>}</span>
                {preset.author?.username && <span className="text-hint">@{preset.author.username}</span>}
                {stripGmBlocks(preset.pitch ?? '').trim() && <span className="campaign-note-excerpt">{stripGmBlocks(preset.pitch).trim()}</span>}
                {preset.tags?.length > 0 && <span className="text-hint">{preset.tags.map((tag) => `#${tag.name}`).join(' ')}</span>}
              </button>
            </li>)}
          </ul>
          {presets.length === 0 && <p className="lore-empty">{applied || chips.length ? 'Кампаний с такими условиями нет.' : 'Публичных кампаний пока нет.'}</p>}
          <Pagination page={page} total={data?.total ?? 0} size={SIZE} onPage={(next) => { setPage(next); resultsRef.current?.scrollIntoView({ block: 'start' }) }} />
        </>}
      </div>
    </div>
  )
}
