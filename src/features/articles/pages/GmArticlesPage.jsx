import { useMemo, useRef, useState } from 'react'
import { articlesApi, ARTICLE_STATUSES, ARTICLE_TYPES, ARTICLE_VISIBILITY } from '@/features/articles/api.js'
import { useArticleDetail, useArticlesPage, useInvalidateArticles } from '@/features/articles/queries.js'
import ArticleImages from '@/features/articles/components/ArticleImages.jsx'
import ArticleRelations from '@/features/articles/components/ArticleRelations.jsx'
import TagsManager from '@/features/articles/components/TagsManager.jsx'
import TagPicker from '@/features/articles/components/TagPicker.jsx'
import { Badge, Button, Card, ConfirmDialog, ErrorBox, Field, Input, PageHeader, RichTextEditor, Select, Skeleton } from '@/components/ui'
import { useToasts } from '@/components/ToastProvider.jsx'
import { articleStatusLabels, articleTypeLabels, articleVisibilityLabels } from '@/lib/i18n'

const PAGE_SIZE = 20
const EMPTY = {
  title: '',
  article_type: 'lore',
  status: 'draft',
  visibility: 'public',
  parent_id: null,
  excerpt: '',
  body_markdown: '',
  tag_ids: [],
}

const fromArticle = (a) => ({
  title: a.title,
  article_type: a.article_type,
  status: a.status,
  visibility: a.visibility,
  parent_id: a.parent_id ?? null,
  excerpt: a.excerpt ?? '',
  body_markdown: a.body_markdown ?? '',
  tag_ids: (a.tags ?? []).map((t) => t.id),
})

export default function GmArticlesPage() {
  const toasts = useToasts()
  const invalidate = useInvalidateArticles()

  const [tab, setTab] = useState('articles')
  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')
  const [page, setPage] = useState(1)
  const listQ = useArticlesPage({ page, size: PAGE_SIZE, ...(applied ? { search: applied } : {}) })
  const parentsQ = useArticlesPage({ page: 1, size: 100 })

  // null — форма закрыта, 'new' — создание, число — правка существующей.
  const [selected, setSelected] = useState(null)
  const detailQ = useArticleDetail(typeof selected === 'number' ? selected : null)

  const totalPages = Math.max(1, Math.ceil((listQ.data?.total ?? 0) / PAGE_SIZE))

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Статьи и теги"
        subtitle="Лор мира, локации, фракции и НПС. Текст статей — Markdown."
        actions={
          tab === 'articles' && (
            <Button
              onClick={() => setSelected('new')}
            >
              Новая статья
            </Button>
          )
        }
      />
      <div className="mb-6 flex gap-2" role="tablist">
        {[
          ['articles', 'Статьи'],
          ['tags', 'Теги'],
        ].map(([key, label]) => (
          <Button
            key={key}
            role="tab"
            aria-selected={tab === key}
            variant={tab === key ? 'primary' : 'ghost'}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>
      {tab === 'tags' ? (
        <TagsManager />
      ) : (
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <Card className="space-y-3 self-start">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setPage(1)
              setApplied(search.trim())
            }}
          >
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию" />
            <Button variant="ghost" type="submit">
              Найти
            </Button>
          </form>
          {listQ.isLoading && <Skeleton className="h-24 w-full" />}
          {listQ.error && <ErrorBox error={listQ.error} onRetry={listQ.refetch} />}
          <ul className="space-y-1">
            {(listQ.data?.items ?? []).map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setSelected(a.id)}
                  className={`w-full rounded px-2 py-1.5 text-left text-sm transition hover:bg-stone-800 ${
                    selected === a.id ? 'bg-stone-800 text-stone-100' : 'text-stone-300'
                  }`}
                >
                  <span className="block truncate">{a.title}</span>
                  <span className="flex items-center gap-2 text-xs text-stone-500">
                    {articleTypeLabels[a.article_type] ?? a.article_type}
                    <Badge>{articleStatusLabels[a.status] ?? a.status}</Badge>
                  </span>
                </button>
              </li>
            ))}
            {listQ.data && listQ.data.items.length === 0 && <li className="text-sm text-stone-500">Статей нет.</li>}
          </ul>
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-stone-400">
              <Button size="xs" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Назад
              </Button>
              {page} / {totalPages}
              <Button size="xs" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Вперёд
              </Button>
            </div>
          )}
        </Card>

        <div>
          {selected === null && <p className="text-stone-500">Выберите статью или создайте новую.</p>}
          {selected === 'new' && (
            <ArticleForm
              key="new"
              parents={parentsQ.data?.items ?? []}
              onSaved={(a) => {
                invalidate(a.id)
                setSelected(a.id)
              }}
              toasts={toasts}
            />
          )}
          {typeof selected === 'number' && detailQ.isLoading && <Skeleton className="h-64 w-full" />}
          {typeof selected === 'number' && detailQ.error && <ErrorBox error={detailQ.error} onRetry={detailQ.refetch} />}
          {typeof selected === 'number' && detailQ.data && (
            <ArticleForm
              key={detailQ.data.id}
              article={detailQ.data}
              parents={(parentsQ.data?.items ?? []).filter((p) => p.id !== selected)}
              onSaved={(a) => invalidate(a.id)}
              onImagesChanged={() => invalidate(selected)}
              onDeleted={() => {
                invalidate()
                setSelected(null)
              }}
              toasts={toasts}
            />
          )}
        </div>
      </div>
      )}
    </div>
  )
}

function ArticleForm({ article, parents, onSaved, onImagesChanged, onDeleted, toasts }) {
  const [form, setForm] = useState(article ? fromArticle(article) : EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const editorRef = useRef(null)

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const initialTags = useMemo(() => (article?.tags ?? []).map((t) => t.id).sort().join(','), [article])
  const valid = form.title.trim()

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      const { tag_ids: tagIds, ...fields } = form
      const body = {
        ...fields,
        title: fields.title.trim(),
        excerpt: fields.excerpt.trim() || null,
      }
      let saved = article ? await articlesApi.update(article.id, body) : await articlesApi.create(body)
      if (!article || [...tagIds].sort().join(',') !== initialTags) {
        saved = await articlesApi.setTags(saved.id, tagIds)
      }
      toasts.push('Статья сохранена', saved.title, 'success')
      onSaved?.(saved)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await articlesApi.remove(article.id)
      toasts.push('Статья удалена', article.title, 'success')
      onDeleted?.()
    } catch (e) {
      setError(e)
      setConfirmDelete(false)
    } finally {
      setBusy(false)
    }
  }

  const insertImage = (img) => {
    const alt = (img.caption ?? '').replace(/[[\]]/g, '')
    editorRef.current?.chain().focus().setImage({ src: img.image_url, alt }).run()
  }

  return (
    <Card className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Название">
          <Input value={form.title} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <Field label="Тип">
          <Select value={form.article_type} onChange={(e) => set({ article_type: e.target.value })}>
            {ARTICLE_TYPES.map((t) => (
              <option key={t} value={t}>
                {articleTypeLabels[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Статус">
          <Select value={form.status} onChange={(e) => set({ status: e.target.value })}>
            {ARTICLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {articleStatusLabels[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Видимость">
          <Select value={form.visibility} onChange={(e) => set({ visibility: e.target.value })}>
            {ARTICLE_VISIBILITY.map((v) => (
              <option key={v} value={v}>
                {articleVisibilityLabels[v]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Родительская статья" className="sm:col-span-2">
          <Select
            value={form.parent_id === null ? '' : String(form.parent_id)}
            onChange={(e) => set({ parent_id: e.target.value === '' ? null : Number(e.target.value) })}
          >
            <option value="">— нет (корень) —</option>
            {parents.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.title}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Краткое описание">
        <Input value={form.excerpt} maxLength={500} onChange={(e) => set({ excerpt: e.target.value })} />
      </Field>

      <div className="space-y-1.5">
        <span className="text-label">Текст (Markdown)</span>
        <RichTextEditor
          value={form.body_markdown}
          onChange={(e) => set({ body_markdown: e.target.value })}
          onEditor={(ed) => {
            editorRef.current = ed
          }}
          rows={16}
          ariaLabel="Текст статьи"
          placeholder="Пишите статью…"
        />
      </div>

      <div className="space-y-1.5">
        <span className="text-label">Теги</span>
        <TagPicker value={form.tag_ids} onChange={(tag_ids) => set({ tag_ids })} />
      </div>

      {article ? (
        <ArticleImages articleId={article.id} images={article.images ?? []} onChanged={onImagesChanged} onInsert={insertImage} />
      ) : (
        <p className="text-sm text-stone-500">Картинки можно загрузить после первого сохранения.</p>
      )}

      {article && <ArticleRelations articleId={article.id} candidates={parents} />}

      {error && <ErrorBox error={error} onRetry={() => setError(null)} />}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || !valid} onClick={save}>
          {busy ? 'Сохраняем…' : article ? 'Сохранить' : 'Создать'}
        </Button>
        {article && (
          <Button variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
            Удалить
          </Button>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Удалить статью?"
          message={`«${article.title}» будет удалена. Дочерние статьи останутся без родителя.`}
          busy={busy}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={remove}
        />
      )}
    </Card>
  )
}
