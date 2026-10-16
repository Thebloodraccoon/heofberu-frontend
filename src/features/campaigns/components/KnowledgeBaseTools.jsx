import { useState } from 'react'
import { Button, ErrorBox, Field, Input, RichTextEditor, Select, Skeleton } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import SearchToolbar from '@/components/ui/SearchToolbar.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { CAMPAIGN_ARTICLE_TYPES, articlesApi } from '@/features/articles/api.js'
import { useArticleFinder } from '@/features/articles/queries.js'
import { articleTypeLabels } from '@/lib/i18n/index.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useCampaignMaterials } from '@/features/campaigns/queries.js'
import ActiveFilters from './ActiveFilters.jsx'
import FilterDrawer from './FilterDrawer.jsx'
import { SECRET_TOOL } from './secretTool.jsx'

const MAX_LINKS = 100
const SOURCES = [['materials', 'Материалы кампаний'], ['lore', 'Лор']]

// Новый квест или сессия — пишется в правой части базы знаний и сразу подвязывается к кампании.
export function NewMaterialForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({ title: '', article_type: 'quest', body_markdown: '' })
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(null)
  const submit = async (event) => {
    event.preventDefault()
    if (!form.title.trim() || busy) return
    setBusy(true)
    setFailure(null)
    try {
      // Материал кампании не для общего лора: по умолчанию его видят только ГМ.
      const article = await articlesApi.create({ ...form, title: form.title.trim(), visibility: 'gm_only' })
      await onCreated(article)
    } catch (error) {
      setFailure(toCampaignError(error, { onlyKnown: true }))
      setBusy(false)
    }
  }
  return (
    <form className="space-y-4" onSubmit={submit} aria-label="Новый материал">
      <h2 className="heading-section text-left">Новый квест или сессия</h2>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <Field label="Название"><Input value={form.title} maxLength={200} autoFocus onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Например, «Пропавший смотритель»" /></Field>
        <Field label="Тип"><Select value={form.article_type} onChange={(event) => setForm((current) => ({ ...current, article_type: event.target.value }))}>{CAMPAIGN_ARTICLE_TYPES.map((type) => <option key={type} value={type}>{articleTypeLabels[type]}</option>)}</Select></Field>
      </div>
      <RichTextEditor value={form.body_markdown} onChange={(event) => setForm((current) => ({ ...current, body_markdown: event.target.value }))} extraTools={[SECRET_TOOL]} rows={14} ariaLabel="Текст материала" placeholder="Завязка, сцены, развилки…" />
      {failure && <ErrorBox error={failure} onRetry={() => setFailure(null)} />}
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!form.title.trim() || busy}>{busy ? 'Создаём…' : 'Создать и подвязать'}</Button><Button type="button" variant="ghost" onClick={onCancel}>Отмена</Button></div>
    </form>
  )
}

const EMPTY_FILTERS = { source: 'materials', tags: [] }
const FILTER_SECTIONS = [
  { key: 'source', legend: 'Откуда', hint: 'Материалы кампаний — квесты и сессии; лор — общая база мира.', options: SOURCES },
  { key: 'tags', legend: 'Теги', type: 'tags', hint: 'Статьи с любым из выбранных тегов.' },
]

// «Подвязать статью» — боковая панель справа, как поиск в лоре: строка поиска, «Фильтры» (откуда и теги)
// во второй панели поверх, найденное с типом, автором и кратким описанием. Клик подвязывает сразу (kb.attach),
// панель остаётся открытой — можно подвязать несколько подряд.
export default function AttachArticleDrawer({ kb, onClose }) {
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const tagIds = filters.tags.length ? filters.tags.map((tag) => tag.id) : undefined
  const lore = useArticleFinder({ text: applied, tag_id: tagIds, size: 20 }, { enabled: filters.source === 'lore' })
  const materials = useCampaignMaterials({ q: applied.length >= 2 ? applied : undefined, tag_id: tagIds, size: 20 }, { enabled: filters.source === 'materials' })
  const finder = filters.source === 'lore' ? lore : materials
  const linked = new Set(kb.links.map((link) => link.article_id))
  const found = (finder.data?.items ?? []).filter((article) => !linked.has(article.id))
  const full = kb.links.length >= MAX_LINKS
  const chips = [
    filters.source === 'lore' && ['source', 'Лор', () => setFilters({ ...filters, source: 'materials' })],
    ...filters.tags.map((tag) => [`tag-${tag.id}`, `#${tag.name}`, () => setFilters({ ...filters, tags: filters.tags.filter((item) => item.id !== tag.id) })]),
  ].filter(Boolean)

  return (
    // Пока открыты фильтры, Escape закрывает только их.
    <Drawer title="Подвязать статью" subtitle={filters.source === 'lore' ? 'Статьи лора.' : 'Материалы кампаний: квесты и сессии.'} onClose={filtersOpen ? () => {} : onClose} closeLabel="Закрыть подвязку статей" footer={<Button variant="ghost" className="w-full" onClick={onClose}>Готово</Button>}>
      <div className="space-y-3">
        <div className="lore-search-panel">
          <SearchToolbar query={query} onQueryChange={setQuery} onSearch={() => setApplied(query.trim())} onFilters={() => setFiltersOpen(true)} filterCount={chips.length} filtersOpen={filtersOpen} label="Поиск статей" placeholder="Название или текст…" submitLabel="Найти статьи" />
          <ActiveFilters chips={chips} onReset={() => setFilters(EMPTY_FILTERS)} />
        </div>
        {full && <p className="text-hint">В базе знаний уже {MAX_LINKS} статей — больше подвязать нельзя.</p>}
        {finder.error && <ErrorBox error={toCampaignError(finder.error)} onRetry={finder.refetch} />}
        {finder.isLoading ? <Skeleton className="h-24 w-full" /> : <ul className={`space-y-1.5 ${finder.isPlaceholderData ? 'opacity-60' : ''}`} aria-label="Найденные статьи">
          {found.map((article) => <li key={article.id}>
            <button type="button" className="catalog-record-card w-full text-left" disabled={full} onClick={() => kb.attach(article)}>
              <span className="flex flex-wrap items-center gap-2 text-xs"><span className="lore-article-type">{articleTypeLabels[article.article_type] ?? article.article_type}</span>{article.author && <span className="text-stone-500">@{article.author.username}</span>}<LoreIcon name="plus" className="ml-auto" /></span>
              <span className="mt-1 block font-display font-bold text-stone-100">{article.title}</span>
              {article.excerpt && <span className="campaign-note-excerpt mt-1 block">{article.excerpt}</span>}
            </button>
          </li>)}
          {found.length === 0 && <li className="text-sm text-stone-400">Ничего не найдено.</li>}
        </ul>}
      </div>
      {filtersOpen && <FilterDrawer title="Фильтры статей" subtitle="Откуда подвязывать и по каким темам." sections={FILTER_SECTIONS} value={filters} empty={EMPTY_FILTERS} onApply={setFilters} onClose={() => setFiltersOpen(false)} />}
    </Drawer>
  )
}
