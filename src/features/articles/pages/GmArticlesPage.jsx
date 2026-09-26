import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  articlePath,
  articlesApi,
  ARTICLE_STATUSES,
  ARTICLE_TYPES,
  ARTICLE_VISIBILITY,
  validateImageFile,
} from '@/features/articles/api.js'
import { useArticleDetail, useArticlesPage, useInvalidateArticles } from '@/features/articles/queries.js'
import { GM_BLOCK_CLOSE, GM_BLOCK_OPEN } from '@/features/articles/secrets.js'
import ArticleImages from '@/features/articles/components/ArticleImages.jsx'
import ImagePickerModal from '@/features/articles/components/ImagePickerModal.jsx'
import ArticleRelations from '@/features/articles/components/ArticleRelations.jsx'
import TagsManager from '@/features/articles/components/TagsManager.jsx'
import TagInput from '@/features/articles/components/TagInput.jsx'
import TagSelectModal from '@/features/articles/components/TagSelectModal.jsx'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ErrorBox,
  Field,
  Input,
  PageHeader,
  RichText,
  RichTextEditor,
  Select,
  Skeleton,
  TextField,
} from '@/components/ui'
import { useToasts } from '@/components/ToastProvider.jsx'
import { articleStatusLabels, articleTypeLabels, articleVisibilityLabels } from '@/lib/i18n'

const PAGE_SIZE = 20
const EMPTY = {
  title: '',
  article_type: 'lore',
  subtype: '',
  status: 'draft',
  visibility: 'public',
  parent_id: null,
  excerpt: '',
  body_markdown: '',
  tags: [],
}

const fromArticle = (a) => ({
  title: a.title,
  article_type: a.article_type,
  subtype: a.subtype ?? '',
  status: a.status,
  visibility: a.visibility,
  parent_id: a.parent_id ?? null,
  excerpt: a.excerpt ?? '',
  body_markdown: a.body_markdown ?? '',
  tags: (a.tags ?? []).map((t) => ({ id: t.id, name: t.name })),
})

export default function GmArticlesPage() {
  const toasts = useToasts()
  const invalidate = useInvalidateArticles()

  const [tab, setTab] = useState('articles')
  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [tagFilter, setTagFilter] = useState([])
  const [tagModal, setTagModal] = useState(false)
  const [page, setPage] = useState(1)
  const listQ = useArticlesPage({
    page,
    size: PAGE_SIZE,
    ...(applied ? { search: applied } : {}),
    ...(typeFilter ? { article_type: typeFilter } : {}),
    ...(tagFilter.length ? { tag_id: tagFilter.map((t) => t.id) } : {}),
  })
  const parentsQ = useArticlesPage({ page: 1, size: 100 })

  // Выбранная статья живёт в URL (?id=12 / ?id=new): ссылка «Редактировать» из лора
  // открывает её сразу, а «назад» в браузере возвращает к предыдущей.
  // null — форма закрыта, 'new' — создание, число — правка существующей.
  const [params, setParams] = useSearchParams()
  const idParam = params.get('id')
  const selected = idParam === 'new' ? 'new' : Number(idParam) > 0 ? Number(idParam) : null
  const setSelected = (value) =>
    setParams((p) => {
      const next = new URLSearchParams(p)
      if (value === null) next.delete('id')
      else next.set('id', String(value))
      return next
    })
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
          <Select
            value={typeFilter}
            onChange={(e) => {
              setPage(1)
              setTypeFilter(e.target.value)
            }}
          >
            <option value="">Все типы</option>
            {ARTICLE_TYPES.map((t) => (
              <option key={t} value={t}>
                {articleTypeLabels[t]}
              </option>
            ))}
          </Select>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="xs" variant="ghost" onClick={() => setTagModal(true)}>
              🏷 Теги{tagFilter.length ? ` (${tagFilter.length})` : ''}…
            </Button>
            {tagFilter.map((t) => (
              <button
                key={t.id}
                type="button"
                title="Убрать из фильтра"
                onClick={() => {
                  setPage(1)
                  setTagFilter((f) => f.filter((x) => x.id !== t.id))
                }}
                className="rounded-full border border-ember/60 bg-ember/15 px-2 py-0.5 text-xs text-stone-100"
              >
                #{t.name} ✕
              </button>
            ))}
          </div>
          {tagModal && (
            <TagSelectModal
              title="Фильтр по тегам"
              subtitle="Статьи хотя бы с одним из выбранных тегов."
              selected={tagFilter}
              onClose={() => setTagModal(false)}
              onApply={(tags) => {
                setPage(1)
                setTagFilter(tags)
                setTagModal(false)
              }}
            />
          )}
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
                  <span className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                    {articleTypeLabels[a.article_type] ?? a.article_type}
                    {a.subtype && <span>· {a.subtype}</span>}
                    <Badge tone={a.status === 'published' ? 'good' : 'default'}>
                      {articleStatusLabels[a.status] ?? a.status}
                    </Badge>
                    {a.visibility === 'gm_only' && <Badge tone="violet">🔒 ГМ</Badge>}
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

// Поля статьи в том виде, в каком они уходят на бэк (пустые подтип/описание — null).
const toBody = (f) => ({
  title: f.title.trim(),
  article_type: f.article_type,
  subtype: f.subtype.trim() || null,
  status: f.status,
  visibility: f.visibility,
  parent_id: f.parent_id,
  excerpt: f.excerpt.trim() || null,
  body_markdown: f.body_markdown,
})

const SECRET_TOOL = {
  title: 'Секрет мастера: блок, скрытый от игроков',
  label: '🔒',
  onClick: (editor) =>
    editor
      .chain()
      .focus()
      .insertContent([
        { type: 'paragraph', content: [{ type: 'text', text: GM_BLOCK_OPEN }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Тайна для мастера…' }] },
        { type: 'paragraph', content: [{ type: 'text', text: GM_BLOCK_CLOSE }] },
      ])
      .run(),
}

const SecretHint = () => (
  <p className="text-xs text-stone-500">
    🔒 — блок <code>:::gm … :::</code>: игроки его не видят и не находят поиском.
  </p>
)

function ArticleForm({ article, ...props }) {
  return article ? <ArticleEditForm article={article} {...props} /> : <ArticleCreateForm {...props} />
}

// Выпадающие списки общие для создания и правки; onChange(patch) решает, что с ними делать.
function ArticleSelects({ values, parents, onChange, disabled = false }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Тип">
        <Select value={values.article_type} disabled={disabled} onChange={(e) => onChange({ article_type: e.target.value }, 'Тип')}>
          {ARTICLE_TYPES.map((t) => (
            <option key={t} value={t}>
              {articleTypeLabels[t]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Статус">
        <Select value={values.status} disabled={disabled} onChange={(e) => onChange({ status: e.target.value }, 'Статус')}>
          {ARTICLE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {articleStatusLabels[s]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Видимость">
        <Select
          value={values.visibility}
          disabled={disabled}
          onChange={(e) => onChange({ visibility: e.target.value }, 'Видимость')}
        >
          {ARTICLE_VISIBILITY.map((v) => (
            <option key={v} value={v}>
              {articleVisibilityLabels[v]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Родительская статья">
        <Select
          value={values.parent_id === null ? '' : String(values.parent_id)}
          disabled={disabled}
          onChange={(e) =>
            onChange({ parent_id: e.target.value === '' ? null : Number(e.target.value) }, 'Родительская статья')
          }
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
  )
}

// Новая статья — обычная форма и одна кнопка «Создать статью»; дальше она открывается
// в режиме правки (ArticleEditForm), где каждое поле сохраняется само.
function ArticleCreateForm({ parents, onSaved, toasts }) {
  const [form, setForm] = useState(EMPTY)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const titleOk = Boolean(form.title.trim())

  const create = async () => {
    setCreating(true)
    setError(null)
    try {
      let saved = await articlesApi.create(toBody(form))
      if (form.tags.length) {
        saved = await articlesApi.setTags(
          saved.id,
          form.tags.map((t) => t.id),
        )
      }
      toasts.push('Статья создана', saved.title, 'success')
      onSaved?.(saved)
    } catch (e) {
      setError(e)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Card className="space-y-5">
      <h2 className="font-display text-xl font-bold text-stone-100">Новая статья</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Название">
          <Input value={form.title} maxLength={200} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <Field label="Подтип">
          <Input
            value={form.subtype}
            maxLength={50}
            onChange={(e) => set({ subtype: e.target.value })}
            placeholder="таверна, город, данж…"
          />
        </Field>
      </div>
      <ArticleSelects values={form} parents={parents} onChange={(patch) => set(patch)} />
      <Field label="Краткое описание">
        <Input value={form.excerpt} maxLength={500} onChange={(e) => set({ excerpt: e.target.value })} />
      </Field>
      <div className="space-y-1.5">
        <span className="text-label">Текст (Markdown)</span>
        <RichTextEditor
          value={form.body_markdown}
          onChange={(e) => set({ body_markdown: e.target.value })}
          extraTools={[SECRET_TOOL]}
          rows={12}
          ariaLabel="Текст статьи"
          placeholder="Пишите статью…"
        />
        <SecretHint />
        <p className="text-xs text-stone-500">Загружать картинки можно после создания статьи.</p>
      </div>
      <TagInput value={form.tags} onChange={(tags) => set({ tags })} />
      {error && <ErrorBox error={error} onRetry={() => setError(null)} />}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={creating || !titleOk} onClick={create}>
          {creating ? 'Создаём…' : 'Создать статью'}
        </Button>
        {!titleOk && <span className="text-xs text-stone-500">Сначала введите название.</span>}
      </div>
    </Card>
  )
}

// Правка статьи как в конструкторе справочников: общей кнопки «Сохранить» нет.
// Текстовые поля — «Изменить» → «Сохранить» (PATCH только этого поля); списки и теги
// сохраняются сразу при изменении. Все запросы идут по очереди (queueRef), чтобы
// ответы не приходили вперемешку, а на экране — последнее выбранное значение.
function ArticleEditForm({ article, parents, onSaved, onImagesChanged, onDeleted, toasts }) {
  const [values, setValues] = useState(() => fromArticle(article))
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [bodyEdit, setBodyEdit] = useState(false)
  const [bodyDraft, setBodyDraft] = useState('')
  const [bodySaving, setBodySaving] = useState(false)
  const [bodyError, setBodyError] = useState(null)
  const [imagePicker, setImagePicker] = useState(false)
  const editorRef = useRef(null)
  const pendingInsertRef = useRef(null)
  const queueRef = useRef(Promise.resolve())

  const enqueue = (task) => {
    const run = queueRef.current.then(task, task)
    queueRef.current = run.catch(() => {})
    return run
  }

  // PATCH только переданных полей; на экран — значения этих же полей из ответа сервера.
  const patchFields = (patch) =>
    enqueue(async () => {
      const saved = await articlesApi.update(article.id, patch)
      const fresh = fromArticle(saved)
      setValues((v) => ({ ...v, ...Object.fromEntries(Object.keys(patch).map((k) => [k, fresh[k]])) }))
      onSaved?.(saved)
      return saved
    })

  // Для TextField: он сам показывает «Сохраняем…/Сохранено» и ошибку.
  const saveText = (key, draft) => {
    const value = key === 'title' ? draft.trim() : draft.trim() || null
    if (key === 'title' && !value) return Promise.reject(new Error('Название не может быть пустым.'))
    return patchFields({ [key]: value })
  }

  // Списки: сразу показываем выбор, при ошибке — откатываем.
  const saveNow = async (patch, label) => {
    const prev = values
    setValues((v) => ({ ...v, ...patch }))
    setError(null)
    toasts.push('Сохраняем…', label, 'saving')
    try {
      await patchFields(patch)
      toasts.push('Сохранено', label)
    } catch (e) {
      setValues((v) => ({ ...v, ...Object.fromEntries(Object.keys(patch).map((k) => [k, prev[k]])) }))
      setError(e)
    }
  }

  const saveTags = async (tags) => {
    const prev = values.tags
    setValues((v) => ({ ...v, tags }))
    setError(null)
    toasts.push('Сохраняем…', 'Теги', 'saving')
    try {
      await enqueue(async () => {
        const saved = await articlesApi.setTags(
          article.id,
          tags.map((t) => t.id),
        )
        onSaved?.(saved)
      })
      toasts.push('Сохранено', 'Теги')
    } catch (e) {
      setValues((v) => ({ ...v, tags: prev }))
      setError(e)
    }
  }

  const startBodyEdit = () => {
    setBodyDraft(values.body_markdown)
    setBodyError(null)
    setBodyEdit(true)
  }

  const saveBody = async () => {
    setBodySaving(true)
    setBodyError(null)
    toasts.push('Сохраняем…', 'Текст статьи', 'saving')
    try {
      await patchFields({ body_markdown: bodyDraft })
      setBodyEdit(false)
      toasts.push('Сохранено', 'Текст статьи')
    } catch (e) {
      setBodyError(e)
    } finally {
      setBodySaving(false)
    }
  }

  // Вставка на место курсора. Если текст не в режиме правки — открываем его и
  // вставляем, как только редактор появится (см. onEditor).
  const insertImages = (urls) => {
    const editor = editorRef.current
    if (!bodyEdit || !editor || editor.isDestroyed) {
      pendingInsertRef.current = urls
      if (!bodyEdit) startBodyEdit()
      return
    }
    editor
      .chain()
      .focus()
      .insertContent(urls.map((src) => ({ type: 'image', attrs: { src, alt: '' } })))
      .run()
  }

  const onEditor = (ed) => {
    editorRef.current = ed
    const pending = pendingInsertRef.current
    if (pending) {
      pendingInsertRef.current = null
      ed.chain()
        .focus('end')
        .insertContent(pending.map((src) => ({ type: 'image', attrs: { src, alt: '' } })))
        .run()
    }
  }

  // Картинка, брошенная/вставленная прямо в текст, уходит в картинки статьи и
  // вставляется в редактор по публичному URL.
  const uploadImage = async (file) => {
    validateImageFile(file)
    const img = await articlesApi.images.upload(article.id, file)
    onImagesChanged?.()
    return { src: img.image_url, alt: '' }
  }

  const shownBody = bodyEdit ? bodyDraft : values.body_markdown
  const usedUrls = useMemo(
    () => new Set((article.images ?? []).map((i) => i.image_url).filter((url) => shownBody.includes(url))),
    [article.images, shownBody],
  )

  const remove = async () => {
    setDeleting(true)
    try {
      await articlesApi.remove(article.id)
      toasts.push('Статья удалена', article.title, 'success')
      onDeleted?.()
    } catch (e) {
      setError(e)
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="min-w-0 truncate font-display text-xl font-bold text-stone-100">
          Редактирование: {values.title}
        </h2>
        <div className="flex items-center gap-3">
          <Link to={articlePath(article)} className="text-sm text-stone-400 hover:text-ember">
            Открыть в лоре →
          </Link>
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            Удалить...
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Название" value={values.title} onSave={(draft) => saveText('title', draft)} />
        <TextField label="Подтип" value={values.subtype} onSave={(draft) => saveText('subtype', draft)} placeholder="таверна, город, данж…" />
      </div>

      <ArticleSelects values={values} parents={parents} onChange={saveNow} />
      {error && <ErrorBox error={error} onRetry={() => setError(null)} />}

      <TextField label="Краткое описание" value={values.excerpt} onSave={(draft) => saveText('excerpt', draft)} />

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-label">Текст (Markdown)</span>
          {!bodyEdit && (
            <button type="button" onClick={startBodyEdit} className="btn-edit-inline">
              Изменить
            </button>
          )}
        </div>
        {bodyEdit ? (
          <>
            <RichTextEditor
              value={bodyDraft}
              onChange={(e) => setBodyDraft(e.target.value)}
              onEditor={onEditor}
              allowImages
              onUploadImage={uploadImage}
              onPickImage={() => setImagePicker(true)}
              extraTools={[SECRET_TOOL]}
              rows={16}
              autoFocus
              ariaLabel="Текст статьи"
              placeholder="Пишите статью…"
            />
            <SecretHint />
            {bodyError && <ErrorBox error={bodyError} className="mt-2" />}
            <div className="mt-2 flex items-center gap-2">
              <Button type="button" size="sm" onClick={saveBody} disabled={bodySaving}>
                {bodySaving ? 'Сохраняем…' : 'Сохранить'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setBodyEdit(false)} disabled={bodySaving}>
                Отмена
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2">
            <RichText value={values.body_markdown} empty="Текст статьи пока не написан." />
          </div>
        )}
      </div>

      <TagInput value={values.tags} onChange={saveTags} />

      <ArticleImages
        articleId={article.id}
        images={article.images ?? []}
        usedUrls={usedUrls}
        onChanged={onImagesChanged}
        onInsert={(img) => insertImages([img.image_url])}
      />

      <ArticleRelations articleId={article.id} articleTitle={values.title} />

      {imagePicker && (
        <ImagePickerModal
          images={article.images ?? []}
          usedUrls={usedUrls}
          onUpload={uploadImage}
          onClose={() => setImagePicker(false)}
          onInsert={(urls) => {
            setImagePicker(false)
            insertImages(urls)
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Удалить статью?"
          message={`«${values.title}» будет удалена. Дочерние статьи останутся без родителя.`}
          busy={deleting}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={remove}
        />
      )}
    </Card>
  )
}
