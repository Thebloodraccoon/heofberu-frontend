import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { articlesApi } from '@/features/articles/api.js'
import { useArticleDetail, useArticlesPage } from '@/features/articles/queries.js'
import { articleStatusLabels, articleTypeLabels } from '@/lib/i18n'
import { Badge, Button, ErrorBox, Input, RichText, Skeleton } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import Pagination from '@/components/ui/Pagination.jsx'
import GmOnlyBadge from './GmOnlyBadge.jsx'

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

function Picker({ articleId, value, parent, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')
  const [page, setPage] = useState(1)
  const [preview, setPreview] = useState(null)
  const list = useArticlesPage({ page, size: 12, ...(applied ? { search: applied } : {}) })
  const tree = useQuery({ queryKey: ['articles', 'parent-exclusions', articleId], queryFn: () => descendantIds(articleId), enabled: !!articleId, staleTime: 0 })
  const ready = !articleId || (tree.isSuccess && !tree.isFetching)
  const items = (list.data?.items ?? []).filter((item) => item.id !== articleId && !tree.data?.has(item.id))
  return <Drawer title="Родительская статья" subtitle="Выберите раздел, к которому относится статья." closeLabel="Закрыть выбор родителя" onClose={onClose}>
    {value && <section className="lore-preview-notice" aria-label="Текущий родитель">
      <p className="lore-eyebrow">Текущий родитель</p>
      <p className="font-medium">{parent?.title ?? `Статья #${value}`}</p>
      {parent && <span className="lore-article-type">{articleTypeLabels[parent.article_type]}</span>}
    </section>}
    <form className="flex gap-2 mb-4" onSubmit={(event) => { event.preventDefault(); setApplied(search.trim()); setPage(1) }}>
      <Input aria-label="Поиск родительской статьи" placeholder="Поиск по названию…" value={search} onChange={(event) => setSearch(event.target.value)} />
      <Button type="submit" variant="ghost">Найти</Button>
    </form>
    {!ready && !tree.error && <Skeleton className="h-20 w-full" />}
    {tree.error && <ErrorBox error={tree.error} onRetry={tree.refetch} />}
    {list.isLoading && <Skeleton className="h-24 w-full" />}
    {list.error && <ErrorBox error={list.error} onRetry={list.refetch} />}
    {ready && items.map((item) => <section key={item.id} className={`lore-article-row ${value === item.id ? 'article-library-row--selected' : ''}`} aria-current={value === item.id ? 'true' : undefined}>
      <div className="lore-article-meta">
        <span className="lore-article-type">{articleTypeLabels[item.article_type]}</span>
        <Badge tone={item.status === 'published' ? 'good' : 'default'}>{articleStatusLabels[item.status]}</Badge>
        {item.visibility === 'gm_only' && <GmOnlyBadge />}
      </div>
      <h3 className="heading-sub mt-2">{item.title}</h3>
      {item.excerpt && <p className="lore-article-excerpt">{item.excerpt}</p>}
      <div className="flex flex-wrap gap-2 mt-3">
        <Button size="sm" variant="ghost" aria-expanded={preview === item.id} onClick={() => setPreview(preview === item.id ? null : item.id)}>{preview === item.id ? 'Скрыть текст' : 'Подробнее'}</Button>
        <Button size="sm" disabled={list.isFetching || value === item.id} onClick={() => onSelect(item.id)}>{value === item.id ? 'Выбран родителем' : 'Выбрать родителем'}</Button>
      </div>
      {preview === item.id && <Preview id={item.id} />}
    </section>)}
    {ready && list.data && !items.length && <p className="lore-filter-hint">На этой странице нет доступных родителей. Измените поиск или страницу.</p>}
    <Pagination page={page} total={list.data?.total ?? 0} size={12} onPage={setPage} />
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
      {parent.data && <><p className="font-medium">{parent.data.title}</p><span className="lore-article-type">{articleTypeLabels[parent.data.article_type]}</span></>}
    </div>}
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="ghost" disabled={disabled} onClick={() => setOpen(true)}>{value ? 'Изменить родителя' : 'Выбрать родительскую статью'}</Button>
      {value && <Button size="sm" variant="ghost" disabled={disabled} onClick={() => onChange(null)}>Убрать</Button>}
    </div>
    {open && <Picker articleId={articleId} value={value} parent={parent.data} onClose={() => setOpen(false)} onSelect={(id) => { onChange(id); setOpen(false) }} />}
  </div>
}
