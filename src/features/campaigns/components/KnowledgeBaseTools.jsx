import { useState } from 'react'
import { Button, ErrorBox, Field, Input, Skeleton } from '@/components/ui'
import { useToasts } from '@/components/ToastProvider.jsx'
import Drawer from '@/components/ui/Drawer.jsx'
import SearchToolbar from '@/components/ui/SearchToolbar.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { useArticleFinder } from '@/features/articles/queries.js'
import { articleTypeLabels } from '@/lib/i18n/index.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useCampaignMaterials } from '@/features/campaigns/queries.js'
import ActiveFilters from './ActiveFilters.jsx'
import FilterDrawer from './FilterDrawer.jsx'
import { ArticleCreateForm } from '@/features/articles/pages/GmArticlesPage.jsx'
import { sameCampaignMaterial } from '../editorNavigation.js'

const MAX_LINKS = 100
const SOURCES = [['materials', 'Материалы кампаний'], ['lore', 'Лор']]
const ALL_SOURCES = SOURCES.map(([source]) => source)

// Новый квест или сессия — той же формой, что редактор материала (ArticleCreateForm), с пометкой под названием;
// после создания сразу подвязывается к кампании (onCreated(article, note)).
export function NewMaterialForm({ onCreated, onCancel, type = 'quest' }) {
  const toasts = useToasts()
  const [note, setNote] = useState('')
  const noteField = <Field label="Пометка в базе знаний (необязательно)"><Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Зачем читать: «до первой сессии», «если пойдут в порт»…" /></Field>
  return <ArticleCreateForm campaignMaterial initialArticleType={type} ignoreNavigation={sameCampaignMaterial} extraDirty={Boolean(note.trim())} toasts={toasts} afterTitle={noteField} onCancel={onCancel} onSaved={(article) => onCreated(article, note.trim())} />
}

const EMPTY_FILTERS = { source: ALL_SOURCES, tags: [] }
const FILTER_SECTIONS = [
  { key: 'source', legend: 'Откуда', hint: 'Материалы кампаний — квесты и планы сессий; лор — общая база мира. Без выбора — всё сразу.', multiple: true, options: SOURCES },
  { key: 'tags', legend: 'Теги', type: 'tags', hint: 'Статьи с любым из выбранных тегов.' },
]

// «Добавить существующую» — боковая панель справа, как поиск в лоре: строка поиска, «Фильтры» (откуда и теги)
// во второй панели поверх, найденное с типом, автором и кратким описанием: сначала материалы кампаний, потом лор.
// Клик подвязывает сразу (kb.attach), панель остаётся открытой — можно подвязать несколько подряд.
export default function AttachArticleDrawer({ kb, onClose }) {
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const tagIds = filters.tags.length ? filters.tags.map((tag) => tag.id) : undefined
  const sources = filters.source.length ? filters.source : ALL_SOURCES
  const lore = useArticleFinder({ text: applied, tag_id: tagIds, size: 20 }, { enabled: sources.includes('lore') })
  const materials = useCampaignMaterials({ q: applied.length >= 2 ? applied : undefined, tag_id: tagIds, size: 20 }, { enabled: sources.includes('materials') })
  const finders = [sources.includes('materials') && materials, sources.includes('lore') && lore].filter(Boolean)
  const failed = finders.find((finder) => finder.error)
  const linked = new Set(kb.links.map((link) => link.article_id))
  const found = [...new Map(finders.flatMap((finder) => finder.data?.items ?? []).map((article) => [article.id, article])).values()].filter((article) => !linked.has(article.id))
  const full = kb.links.length >= MAX_LINKS
  const chips = [
    ...(sources.length < ALL_SOURCES.length ? SOURCES.filter(([source]) => sources.includes(source)).map(([source, label]) => [`source-${source}`, label, () => setFilters({ ...filters, source: ALL_SOURCES })]) : []),
    ...filters.tags.map((tag) => [`tag-${tag.id}`, `#${tag.name}`, () => setFilters({ ...filters, tags: filters.tags.filter((item) => item.id !== tag.id) })]),
  ].filter(Boolean)

  return (
    // Пока открыты фильтры, Escape закрывает только их.
    <Drawer title="Добавить существующую" subtitle={sources.length === ALL_SOURCES.length ? 'Материалы кампаний и статьи лора.' : sources.includes('lore') ? 'Статьи лора.' : 'Материалы кампаний: квесты и планы сессий.'} onClose={filtersOpen ? () => {} : onClose} closeLabel="Закрыть добавление статей" footer={<Button variant="ghost" className="w-full" onClick={onClose}>Готово</Button>}>
      <div className="space-y-3">
        <div className="lore-search-panel">
          <SearchToolbar query={query} onQueryChange={setQuery} onSearch={() => setApplied(query.trim())} onFilters={() => setFiltersOpen(true)} filterCount={chips.length} filtersOpen={filtersOpen} label="Поиск статей" placeholder="Название или текст…" submitLabel="Найти статьи" />
          <ActiveFilters chips={chips} onReset={() => setFilters(EMPTY_FILTERS)} />
        </div>
        {full && <p className="text-hint">В базе знаний уже {MAX_LINKS} статей — больше добавить нельзя.</p>}
        {failed && <ErrorBox error={toCampaignError(failed.error)} onRetry={failed.refetch} />}
        {finders.some((finder) => finder.isLoading) ? <Skeleton className="h-24 w-full" /> : <ul className={`space-y-1.5 ${finders.some((finder) => finder.isPlaceholderData) ? 'opacity-60' : ''}`} aria-label="Найденные статьи">
          {found.map((article) => <li key={article.id}>
            <button type="button" className="catalog-record-card w-full text-left" disabled={full} onClick={() => kb.attach(article)}>
              <span className="flex flex-wrap items-center gap-2 text-xs"><span className="lore-article-type">{article.article_type === 'session' ? 'План сессии' : articleTypeLabels[article.article_type] ?? article.article_type}</span>{article.author && <span className="text-stone-500">@{article.author.username}</span>}<LoreIcon name="plus" className="ml-auto" /></span>
              <span className="mt-1 block font-display font-bold text-stone-100">{article.title}</span>
              {article.excerpt && <span className="campaign-note-excerpt mt-1 block">{article.excerpt}</span>}
            </button>
          </li>)}
          {found.length === 0 && <li className="text-sm text-stone-400">Ничего не найдено.</li>}
        </ul>}
      </div>
      {filtersOpen && <FilterDrawer title="Фильтры статей" subtitle="Откуда добавлять и по каким темам." sections={FILTER_SECTIONS} value={filters} empty={EMPTY_FILTERS} onApply={setFilters} onClose={() => setFiltersOpen(false)} />}
    </Drawer>
  )
}
