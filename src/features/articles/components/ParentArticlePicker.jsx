import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { articlesApi } from '@/features/articles/api.js'
import { useArticleDetail } from '@/features/articles/queries.js'
import { articleStatusLabels, articleTypeLabels } from '@/lib/i18n'
import { Badge, Button, ErrorBox, RichText, Skeleton } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import SearchPickerList from '@/components/ui/SearchPickerList.jsx'
import GmOnlyBadge from './GmOnlyBadge.jsx'
import LoreFilters from './LoreFilters.jsx'
import { queryKeys } from '@/lib/api/queryKeys.js'

async function descendantIds(articleId) {
  const excluded = new Set([articleId])
  const pending = [articleId]
  while (pending.length) {
    const children = await articlesApi.children(pending.shift())
    for (const child of children) {
      if (!excluded.has(child.id)) { excluded.add(child.id); pending.push(child.id) }
    }
  }
  return excluded
}

function Preview({ id }) {
  const query = useArticleDetail(id)
  if (query.isLoading) return <Skeleton className="h-24 w-full" />
  if (query.error) return <ErrorBox error={query.error} onRetry={query.refetch} />
  return <div className="mt-3 max-h-80 overflow-y-auto border-l-2 border-stone-700 pl-3"><RichText value={query.data?.body_markdown} empty="Текст статьи пока не написан." /></div>
}

const EMPTY_FILTERS = { types: [], tags: [], match: 'any', subtypes: [] }

// Поиск от двух символов идёт в /articles/search, короче — обычный список (как useArticleFinder).
const fetchArticles = ({ search = '', ...params }) => (search.length >= 2 ? articlesApi.search({ ...params, q: search }) : articlesApi.list(params))

// Общий SearchPickerList: поиск + «Найти», «Фильтры» лора (тип, подтип, теги) в узкой панели, подгрузка при прокрутке.
function Picker({ articleId, value, parent, onSelect, onClose }) {
  const [preview, setPreview] = useState(null)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const tree = useQuery({ queryKey: queryKeys.pickers.articleDescendants(articleId), queryFn: () => descendantIds(articleId), enabled: !!articleId, staleTime: 0 })
  const ready = !articleId || (tree.isSuccess && !tree.isFetching)
  const filterParams = {
    ...(filters.types.length ? { article_type: filters.types } : {}),
    ...(filters.subtypes.length ? { subtype_id: filters.subtypes.map((s) => s.id) } : {}),
    ...(filters.tags.length ? { tag_id: filters.tags.map((t) => t.id), tag_match: filters.match } : {}),
  }
  return <Drawer title="Родительская статья" subtitle="Выберите раздел, к которому относится статья." closeLabel="Закрыть выбор родителя" bodyClassName="grant-picker-body" onClose={onClose}>
    {value && <section className="lore-preview-notice" aria-label="Текущий родитель">
      <p className="lore-eyebrow">Текущий родитель</p>
      {parent && <span className="lore-article-type">{articleTypeLabels[parent.article_type]}</span>}
      <p className="font-medium">{parent?.title ?? `Статья #${value}`}</p>
    </section>}
    {tree.error && <ErrorBox error={tree.error} onRetry={tree.refetch} />}
    <SearchPickerList
      queryKey={[...queryKeys.pickers.parentArticles, filterParams]}
      fetchPage={(page) => fetchArticles({ ...page, ...filterParams })}
      pageSize={12}
      enabled={ready}
      label="Поиск родительской статьи"
      placeholder="Поиск по названию…"
      onFilters={() => setFiltersOpen(true)}
      filterCount={filters.types.length + filters.subtypes.length + filters.tags.length}
      filtersOpen={filtersOpen}
      exclude={(item) => item.id === articleId || tree.data?.has(item.id)}
      emptyText="Доступных родителей нет. Измените поиск или фильтры."
      header={filtersOpen && <LoreFilters types={filters.types} tags={filters.tags} match={filters.match} subtypes={filters.subtypes} onClose={() => setFiltersOpen(false)} onApply={(types, tags, match, subtypes) => setFilters({ types, tags, match, subtypes })} />}
    >
      {(items) => items.map((item) => <section key={item.id} className={`lore-article-row ${value === item.id ? 'article-library-row--selected' : ''}`} aria-current={value === item.id ? 'true' : undefined}>
        <div className="lore-article-meta">
          <span className="lore-article-type">{articleTypeLabels[item.article_type]}</span>
          {item.status && <Badge tone={item.status === 'published' ? 'good' : 'default'}>{articleStatusLabels[item.status]}</Badge>}
          {item.visibility === 'gm_only' && <GmOnlyBadge />}
        </div>
        <h3 className="heading-sub mt-2">{item.title}</h3>
        {item.excerpt && <p className="lore-article-excerpt">{item.excerpt}</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          <Button size="sm" variant="ghost" aria-expanded={preview === item.id} onClick={() => setPreview(preview === item.id ? null : item.id)}>{preview === item.id ? 'Скрыть текст' : 'Подробнее'}</Button>
          <Button size="sm" disabled={value === item.id} onClick={() => onSelect(item.id)}>{value === item.id ? 'Выбран родителем' : 'Выбрать родителем'}</Button>
        </div>
        {preview === item.id && <Preview id={item.id} />}
      </section>)}
    </SearchPickerList>
  </Drawer>
}

export default function ParentArticlePicker({ articleId, value, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const parent = useArticleDetail(value)
  return <div className="space-y-2">
    <p className="text-label">Родительская статья</p>
    {value && <div>
      {parent.isLoading && <Skeleton className="h-8 w-full" />}
      {parent.error && <ErrorBox error={parent.error} onRetry={parent.refetch} />}
      {parent.data && <><span className="lore-article-type">{articleTypeLabels[parent.data.article_type]}</span><p className="font-medium">{parent.data.title}</p></>}
    </div>}
    <div className="flex gap-2">
      <Button size="sm" variant="ghost" className="min-w-0 flex-1" aria-label={value ? 'Изменить родителя' : 'Выбрать родительскую статью'} disabled={disabled} onClick={() => setOpen(true)}>{value ? 'Изменить' : 'Выбрать родительскую статью'}</Button>
      {value && <Button size="sm" variant="ghost" className="min-w-0 flex-1" disabled={disabled} onClick={() => onChange(null)}>Убрать</Button>}
    </div>
    {open && <Picker articleId={articleId} value={value} parent={parent.data} onClose={() => setOpen(false)} onSelect={(id) => { onChange(id); setOpen(false) }} />}
  </div>
}
