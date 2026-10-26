import { useState } from 'react'
import { Badge } from '@/components/ui'
import SearchPickerList from '@/components/ui/SearchPickerList.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { stripGmBlocks } from '@/features/articles/secrets.js'
import { publicCampaignStatusLabels } from '@/lib/i18n/index.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { publicCampaignsApi } from '@/features/campaigns/api.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import ActiveFilters from './ActiveFilters.jsx'
import FilterDrawer from './FilterDrawer.jsx'

const SIZE = 10
const STATUSES = ['published', 'draft']
const EMPTY_FILTERS = { tags: [] }
const FILTER_SECTIONS = [{ key: 'tags', legend: 'Теги', type: 'tags', hint: 'Кампании с любым из выбранных тегов.' }]

// Экран выбора внутри панели стола: общий SearchPickerList (поиск, подгрузка при
// прокрутке), теги — в узкой панели фильтров поверх.
export default function PresetPicker({ value, onPick, onBack, backLabel }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const tagIds = filters.tags.length ? filters.tags.map((tag) => tag.id) : undefined
  const chips = filters.tags.map((tag) => [`tag-${tag.id}`, `#${tag.name}`, () => setFilters({ tags: filters.tags.filter((item) => item.id !== tag.id) })])

  return (
    <>
      <button type="button" className="article-back mb-4 self-start" onClick={onBack}><LoreIcon name="back" />{backLabel}</button>
      <SearchPickerList
        queryKey={queryKeys.pickers.presets({ status: STATUSES, tag_id: tagIds })}
        fetchPage={({ search, ...page }) => publicCampaignsApi.list({ ...page, q: search, tag_id: tagIds, status: STATUSES }).catch((cause) => { throw toCampaignError(cause) })}
        pageSize={SIZE}
        label="Поиск публичных кампаний"
        placeholder="Название или зазывалка…"
        submitLabel="Найти публичные кампании"
        onFilters={() => setFiltersOpen(true)}
        filterCount={chips.length}
        filtersOpen={filtersOpen}
        emptyText={chips.length ? 'Кампаний с такими условиями нет.' : 'Публичных кампаний не найдено.'}
        header={<>
          {chips.length > 0 && <div className="mb-4"><ActiveFilters chips={chips} onReset={() => setFilters(EMPTY_FILTERS)} /></div>}
          {filtersOpen && <FilterDrawer title="Фильтры кампаний" subtitle="По каким темам искать." sections={FILTER_SECTIONS} value={filters} empty={EMPTY_FILTERS} onApply={setFilters} onClose={() => setFiltersOpen(false)} />}
        </>}
      >
        {(presets) => presets.length > 0 && <ul className="campaign-picker-results" aria-label="Найденные публичные кампании">
          {presets.map((preset) => <li key={preset.id}>
            <button type="button" className="campaign-picker-card" data-active={value?.id === preset.id} aria-pressed={value?.id === preset.id} onClick={() => onPick(preset)}>
              <span className="flex flex-wrap items-center gap-2"><span className="campaign-picker-title">{preset.title}</span>{preset.status !== 'published' && <Badge>{publicCampaignStatusLabels[preset.status]}</Badge>}</span>
              {preset.author?.username && <span className="text-hint">@{preset.author.username}</span>}
              {stripGmBlocks(preset.pitch ?? '').trim() && <span className="campaign-note-excerpt">{stripGmBlocks(preset.pitch).trim()}</span>}
              {preset.tags?.length > 0 && <span className="text-hint">{preset.tags.map((tag) => `#${tag.name}`).join(' ')}</span>}
            </button>
          </li>)}
        </ul>}
      </SearchPickerList>
    </>
  )
}
