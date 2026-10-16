import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, ErrorBox, Field, Input, RichTextEditor, Select, Skeleton } from '@/components/ui'
import { useToasts } from '@/components/ToastProvider.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { CAMPAIGN_ARTICLE_TYPES, articlesApi } from '@/features/articles/api.js'
import { useArticleFinder } from '@/features/articles/queries.js'
import { articleTypeLabels } from '@/lib/i18n/index.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useCampaignMaterials, useReplacePublicCampaignArticles } from '@/features/campaigns/queries.js'
import { SECRET_TOOL } from './secretTool.jsx'

const MAX_LINKS = 100
const SOURCES = [['materials', 'Материалы кампаний'], ['lore', 'Лор']]
const fromPreset = (preset) => (preset.articles ?? []).map(({ article_id, slug, title, article_type, note }) => ({ article_id, slug, title, article_type, note: note ?? '' }))
const toEntries = (links) => links.map((link, position) => ({ article_id: link.article_id, position, note: link.note.trim() || null }))

// Новый квест или сессия — пишется прямо здесь и сразу подвязывается к этой публичной кампании.
function NewMaterialForm({ onCreated, onCancel }) {
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
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="preset-new-material space-y-3" onSubmit={submit} aria-label="Новый материал">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <Field label="Название"><Input value={form.title} maxLength={200} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Например, «Пропавший смотритель»" /></Field>
        <Field label="Тип"><Select value={form.article_type} onChange={(event) => setForm((current) => ({ ...current, article_type: event.target.value }))}>{CAMPAIGN_ARTICLE_TYPES.map((type) => <option key={type} value={type}>{articleTypeLabels[type]}</option>)}</Select></Field>
      </div>
      <RichTextEditor value={form.body_markdown} onChange={(event) => setForm((current) => ({ ...current, body_markdown: event.target.value }))} extraTools={[SECRET_TOOL]} rows={8} ariaLabel="Текст материала" placeholder="Завязка, сцены, развилки…" />
      {failure && <ErrorBox error={failure} onRetry={() => setFailure(null)} />}
      <div className="flex flex-wrap gap-2"><Button type="submit" size="sm" disabled={!form.title.trim() || busy}>{busy ? 'Создаём…' : 'Создать и привязать'}</Button><Button type="button" size="sm" variant="ghost" onClick={onCancel}>Отмена</Button></div>
    </form>
  )
}

// База знаний публичной кампании: статьи, на которые она опирается, — по порядку и с пометками.
// Видна только ГМ; автор и основатель её меняют, остальные ГМ читают.
export default function PresetKnowledgeBase({ preset, canEdit }) {
  const { push } = useToasts()
  const [links, setLinks] = useState(() => fromPreset(preset))
  const [source, setSource] = useState('materials')
  const [text, setText] = useState('')
  const [creating, setCreating] = useState(false)
  const replace = useReplacePublicCampaignArticles()
  const searching = text.trim().length >= 2
  const lore = useArticleFinder({ text, size: 10 }, { enabled: canEdit && source === 'lore' })
  const materials = useCampaignMaterials({ q: searching ? text.trim() : undefined, size: 10 }, { enabled: canEdit && source === 'materials' })
  const finder = source === 'lore' ? lore : materials
  const linked = new Set(links.map((link) => link.article_id))
  const found = (finder.data?.items ?? []).filter((article) => !linked.has(article.id))
  const changed = JSON.stringify(toEntries(links)) !== JSON.stringify(toEntries(fromPreset(preset)))
  const move = (index, step) => setLinks((current) => { const next = [...current]; const [item] = next.splice(index, 1); next.splice(index + step, 0, item); return next })
  const save = (next = links) => replace.mutateAsync({ id: preset.id, articles: toEntries(next) })
  const addCreated = async (article) => {
    const next = [...links, { article_id: article.id, slug: article.slug, title: article.title, article_type: article.article_type, note: '' }]
    await save(next)
    setLinks(next)
    setCreating(false)
    push(`«${article.title}» привязан к кампании`, undefined, 'success')
  }

  if (!canEdit) return (
    <section className="preset-section" aria-label="База знаний">
      {links.length === 0 ? <p className="text-sm text-stone-400">Автор пока не подвязал статей.</p> : <ol className="preset-article-links">{links.map((link) => <li key={link.article_id} className="preset-article-link"><span className="min-w-0"><Link className="link-ember font-medium" to={`/lore/${link.slug}`}>{link.title}</Link><span className="block text-hint">{articleTypeLabels[link.article_type] ?? link.article_type}{link.note && ` · ${link.note}`}</span></span></li>)}</ol>}
    </section>
  )

  return (
    <section className="preset-section" aria-label="База знаний">
      <p className="text-muted">Квесты, сессии и статьи лора, на которые опирается эта кампания. Видны только ГМ.</p>
      {links.length === 0 ? <p className="text-sm text-stone-400">Статей пока нет.</p> : <ol className="preset-article-links" aria-label="Подвязанные статьи">{links.map((link, index) => <li key={link.article_id} className="preset-article-link">
        <span className="min-w-0 flex-1"><Link className="link-ember font-medium" to={`/lore/${link.slug}`}>{link.title}</Link><span className="block text-hint">{articleTypeLabels[link.article_type] ?? link.article_type}</span>
          <Input className="mt-2 w-full" value={link.note} maxLength={300} aria-label={`Пометка к статье ${link.title}`} placeholder="Пометка: зачем читать" onChange={(event) => setLinks((current) => current.map((item) => item.article_id === link.article_id ? { ...item, note: event.target.value } : item))} /></span>
        <span className="flex flex-col gap-1"><button type="button" className="lore-chip" aria-label={`Выше: ${link.title}`} disabled={index === 0} onClick={() => move(index, -1)}><LoreIcon name="chevron" className="-rotate-90" /></button><button type="button" className="lore-chip" aria-label={`Ниже: ${link.title}`} disabled={index === links.length - 1} onClick={() => move(index, 1)}><LoreIcon name="chevron" className="rotate-90" /></button><button type="button" className="lore-chip" aria-label={`Отвязать: ${link.title}`} onClick={() => setLinks((current) => current.filter((item) => item.article_id !== link.article_id))}><LoreIcon name="close" /></button></span>
      </li>)}</ol>}
      {changed && <div className="flex flex-wrap gap-2"><Button size="sm" disabled={replace.isPending} onClick={() => save().then(() => push('База знаний сохранена', undefined, 'success'))}>{replace.isPending ? 'Сохраняем…' : 'Сохранить базу знаний'}</Button><Button size="sm" variant="ghost" onClick={() => setLinks(fromPreset(preset))}>Отменить изменения</Button></div>}
      {replace.error && <ErrorBox error={toCampaignError(replace.error)} onRetry={() => replace.reset()} />}

      {creating ? <NewMaterialForm onCreated={addCreated} onCancel={() => setCreating(false)} /> : <div><Button size="sm" variant="ghost" disabled={links.length >= MAX_LINKS} onClick={() => setCreating(true)}><LoreIcon name="plus" />Новый квест или сессия</Button></div>}

      <fieldset className="lore-filter-section">
        <legend>Подвязать готовую статью</legend>
        <div className="lore-filter-options mt-3" role="group" aria-label="Откуда">{SOURCES.map(([key, label]) => <button key={key} type="button" className="lore-chip" aria-pressed={source === key} onClick={() => setSource(key)}>{label}</button>)}</div>
        <Input className="mt-3 w-full" type="search" aria-label="Поиск статей" placeholder="Название статьи…" value={text} onChange={(event) => setText(event.target.value)} />
        {finder.isLoading ? <Skeleton className="mt-3 h-10 w-full" /> : <ul className="mt-3 space-y-1.5" aria-label="Найденные статьи">{found.map((article) => <li key={article.id}><button type="button" className="lore-chip w-full justify-between" disabled={links.length >= MAX_LINKS} onClick={() => setLinks((current) => [...current, { article_id: article.id, slug: article.slug, title: article.title, article_type: article.article_type, note: '' }])}><span>{article.title}<span className="text-hint"> · {articleTypeLabels[article.article_type] ?? article.article_type}</span></span><LoreIcon name="plus" /></button></li>)}{found.length === 0 && <li className="text-sm text-stone-400">Ничего не найдено.</li>}</ul>}
      </fieldset>
    </section>
  )
}
