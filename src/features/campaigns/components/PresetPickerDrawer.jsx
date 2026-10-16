import { useState } from 'react'
import { Badge, Button, ErrorBox, Skeleton } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import SearchToolbar from '@/components/ui/SearchToolbar.jsx'
import { stripGmBlocks } from '@/features/articles/secrets.js'
import { publicCampaignStatusLabels } from '@/lib/i18n/index.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { usePublicCampaignsPage } from '@/features/campaigns/queries.js'
import ActiveFilters from './ActiveFilters.jsx'
import FilterDrawer from './FilterDrawer.jsx'

const SIZE = 10
const EMPTY_FILTERS = { tags: [] }
const FILTER_SECTIONS = [{ key: 'tags', legend: 'Теги', type: 'tags', hint: 'Будут показаны кампании с любым из выбранных тегов.' }]

// Выбор публичной кампании для стола — боковая панель справа, как каталог: поиск, «Фильтры» (теги), список.
// onPick(null) — «Без публичной кампании».
export default function PresetPickerDrawer({ value, onPick, onClose }) {
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { data, isLoading, isPlaceholderData, error, refetch } = usePublicCampaignsPage({ q: applied || undefined, tag_id: filters.tags.length ? filters.tags.map((tag) => tag.id) : undefined, status: ['published', 'draft'], page: 1, size: SIZE })
  const presets = data?.items ?? []
  const chips = filters.tags.map((tag) => [`tag-${tag.id}`, `#${tag.name}`, () => setFilters({ tags: filters.tags.filter((item) => item.id !== tag.id) })])

  return (
    // Пока открыты фильтры, Escape закрывает только их.
    <Drawer title="Публичная кампания" subtitle="По какой истории играет стол." onClose={filtersOpen ? () => {} : onClose} closeLabel="Закрыть выбор публичной кампании" footer={<div className="article-filter-actions"><Button variant="ghost" onClick={() => onPick(null)}>Без публичной кампании</Button><Button variant="ghost" onClick={onClose}>Отмена</Button></div>}>
      <div className="space-y-4">
        <div className="lore-search-panel">
          <SearchToolbar query={query} onQueryChange={setQuery} onSearch={() => setApplied(query.trim())} onFilters={() => setFiltersOpen(true)} filterCount={chips.length} filtersOpen={filtersOpen} label="Поиск публичных кампаний" placeholder="Название или зазывалка…" submitLabel="Найти публичные кампании" />
          <ActiveFilters chips={chips} onReset={() => setFilters(EMPTY_FILTERS)} />
        </div>
        {error && <ErrorBox error={toCampaignError(error)} onRetry={refetch} />}
        {isLoading ? <Skeleton className="h-24 w-full" /> : <ul className={`space-y-1.5 ${isPlaceholderData ? 'opacity-60' : ''}`} aria-label="Найденные публичные кампании">
          {presets.map((preset) => <li key={preset.id}>
            <button type="button" className="catalog-record-card w-full text-left" data-active={value?.id === preset.id} aria-pressed={value?.id === preset.id} onClick={() => onPick(preset)}>
              <span className="flex flex-wrap items-center gap-2"><span className="font-display font-bold text-stone-100">{preset.title}</span>{preset.status !== 'published' && <Badge>{publicCampaignStatusLabels[preset.status]}</Badge>}</span>
              {stripGmBlocks(preset.pitch ?? '').trim() && <span className="campaign-note-excerpt mt-1 block">{stripGmBlocks(preset.pitch).trim()}</span>}
              {preset.tags.length > 0 && <span className="mt-1 block text-xs text-stone-500">{preset.tags.map((tag) => `#${tag.name}`).join(' ')}</span>}
            </button>
          </li>)}
          {presets.length === 0 && <li className="text-sm text-stone-400">{applied || chips.length ? 'Ничего не найдено.' : 'Публичных кампаний пока нет.'}</li>}
        </ul>}
        {data?.total > SIZE && <p className="text-hint">Показаны первые {SIZE} из {data.total} — уточните поиск.</p>}
      </div>
      {filtersOpen && <FilterDrawer title="Фильтры публичных кампаний" subtitle="Выберите интересующие темы." sections={FILTER_SECTIONS} value={filters} empty={EMPTY_FILTERS} onApply={setFilters} onClose={() => setFiltersOpen(false)} />}
    </Drawer>
  )
}
