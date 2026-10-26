import { useRef, useState } from 'react'
import { Button, Field, Input } from '@/components/ui'
import { useToasts } from '@/components/ToastProvider.jsx'
import Drawer from '@/components/ui/Drawer.jsx'
import SearchPickerList from '@/components/ui/SearchPickerList.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { articlesApi } from '@/features/articles/api.js'
import { articleTypeLabels } from '@/lib/i18n/index.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { campaignMaterialsApi } from '@/features/campaigns/api.js'
import ActiveFilters from './ActiveFilters.jsx'
import FilterDrawer from './FilterDrawer.jsx'
import { ArticleCreateForm } from '@/features/articles/pages/GmArticlesPage.jsx'
import { sameCampaignMaterial } from '../editorNavigation.js'
import { queryKeys } from '@/lib/api/queryKeys.js'

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

// «Добавить существующую» — боковая панель справа: общий SearchPickerList (поиск, «Фильтры» — откуда и теги — в
// узкой панели поверх, подгрузка при прокрутке). Страница списка — страница материалов кампаний и страница лора
// вместе: сначала материалы, потом лор. Клик подвязывает сразу (kb.attach), панель остаётся открытой.
export default function AttachArticleDrawer({ kb, onClose }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const tagIds = filters.tags.length ? filters.tags.map((tag) => tag.id) : undefined
  const sources = filters.source.length ? filters.source : ALL_SOURCES
  const linked = new Set(kb.links.map((link) => link.article_id))
  const full = kb.links.length >= MAX_LINKS
  const chips = [
    ...(sources.length < ALL_SOURCES.length ? SOURCES.filter(([source]) => sources.includes(source)).map(([source, label]) => [`source-${source}`, label, () => setFilters({ ...filters, source: ALL_SOURCES })]) : []),
    ...filters.tags.map((tag) => [`tag-${tag.id}`, `#${tag.name}`, () => setFilters({ ...filters, tags: filters.tags.filter((item) => item.id !== tag.id) })]),
  ]
  // Поиск у обоих источников — от двух символов, короче — просто список. Итог источника запоминаем по выборке
  // (источники, теги, поиск): кончившийся источник на следующих страницах больше не запрашиваем.
  const totals = useRef(new Map())
  const fetchPage = async ({ search = '', page, size }) => {
    const params = { page, size, tag_id: tagIds, ...(search.length >= 2 ? { q: search } : {}) }
    const selection = JSON.stringify([sources, tagIds, params.q])
    const known = page === 1 ? {} : totals.current.get(selection) ?? {}
    const apis = { materials: campaignMaterialsApi, lore: articlesApi }
    const asked = ALL_SOURCES.filter((source) => sources.includes(source) && !(known[source] != null && (page - 1) * size >= known[source]))
    const pages = await Promise.all(asked.map((source) => (params.q ? apis[source].search(params) : apis[source].list(params))))
      .catch((cause) => { throw toCampaignError(cause) })
    const next = { ...known }
    asked.forEach((source, index) => { next[source] = pages[index]?.total ?? 0 })
    totals.current.set(selection, next)
    return { items: pages.flatMap((result) => result?.items ?? []), total: sources.reduce((sum, source) => sum + (next[source] ?? 0), 0) }
  }

  return (
    // Пока открыты фильтры, Escape закрывает только их.
    <Drawer title="Добавить существующую" subtitle={sources.length === ALL_SOURCES.length ? 'Материалы кампаний и статьи лора.' : sources.includes('lore') ? 'Статьи лора.' : 'Материалы кампаний: квесты и планы сессий.'} onClose={filtersOpen ? () => {} : onClose} closeLabel="Закрыть добавление статей" bodyClassName="grant-picker-body" footer={<Button variant="ghost" className="w-full" onClick={onClose}>Готово</Button>}>
      <SearchPickerList
        queryKey={[...queryKeys.pickers.knowledgeBaseArticles, sources, tagIds]}
        fetchPage={fetchPage}
        pageSize={20}
        label="Поиск статей"
        placeholder="Название или текст…"
        submitLabel="Найти статьи"
        onFilters={() => setFiltersOpen(true)}
        filterCount={chips.length}
        filtersOpen={filtersOpen}
        exclude={(article) => linked.has(article.id)}
        emptyText="Ничего не найдено."
        header={<>
          {chips.length > 0 && <div className="mb-3"><ActiveFilters chips={chips} onReset={() => setFilters(EMPTY_FILTERS)} /></div>}
          {full && <p className="text-hint mb-3">В базе знаний уже {MAX_LINKS} статей — больше добавить нельзя.</p>}
          {filtersOpen && <FilterDrawer title="Фильтры статей" subtitle="Откуда добавлять и по каким темам." sections={FILTER_SECTIONS} value={filters} empty={EMPTY_FILTERS} onApply={setFilters} onClose={() => setFiltersOpen(false)} />}
        </>}
      >
        {(found) => found.length > 0 && <ul className="space-y-1.5" aria-label="Найденные статьи">
          {found.map((article) => <li key={article.id}>
            <button type="button" className="catalog-record-card w-full text-left" disabled={full} onClick={() => kb.attach(article)}>
              <span className="flex flex-wrap items-center gap-2 text-xs"><span className="lore-article-type">{article.article_type === 'session' ? 'План сессии' : articleTypeLabels[article.article_type] ?? article.article_type}</span>{article.author && <span className="text-stone-500">@{article.author.username}</span>}<LoreIcon name="plus" className="ml-auto" /></span>
              <span className="mt-1 block font-display font-bold text-stone-100">{article.title}</span>
              {article.excerpt && <span className="campaign-note-excerpt mt-1 block">{article.excerpt}</span>}
            </button>
          </li>)}
        </ul>}
      </SearchPickerList>
    </Drawer>
  )
}
