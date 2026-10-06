import ArticleAuthor from '@/features/articles/components/ArticleAuthor.jsx'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  articlePath,
  articlesApi,
  ARTICLE_TYPES,
  ARTICLE_VISIBILITY,
  canEditArticle,
  validateImageFile,
} from '@/features/articles/api.js'
import { useArticleDetail, useArticleFinder, useArticleProposals, useInvalidateArticles } from '@/features/articles/queries.js'
import { useAuth } from '@/features/auth/useAuth.js'
import { insertGmBlock } from '@/features/articles/insertGmBlock.js'
import { useUserNames } from '@/features/users/queries.js'
import ArticleHistory from '@/features/articles/components/ArticleHistory.jsx'
import ArticleText from '@/features/articles/components/ArticleText.jsx'
import ArticleProposals, { ProposalForm } from '@/features/articles/components/ArticleProposals.jsx'
import UnsavedGuard from '@/features/articles/components/UnsavedGuard.jsx'
import ArticleImages from '@/features/articles/components/ArticleImages.jsx'
import GmOnlyBadge from '@/features/articles/components/GmOnlyBadge.jsx'
import ImagePickerModal from '@/features/articles/components/ImagePickerModal.jsx'
import ArticleRelations from '@/features/articles/components/ArticleRelations.jsx'
import TagsManager from '@/features/articles/components/TagsManager.jsx'
import TagInput from '@/features/articles/components/TagInput.jsx'
import ParentArticlePicker from '@/features/articles/components/ParentArticlePicker.jsx'
import SubtypeSelect from '@/features/articles/components/SubtypeSelect.jsx'
import LoreFilters from '@/features/articles/components/LoreFilters.jsx'
import SortControl from '@/features/articles/components/SortControl.jsx'
import {
  Badge,
  Button,
  ConfirmDialog,
  ErrorBox,
  FactList,
  FactRow,
  Field,
  Input,
  RichTextEditor,
  Select,
  Skeleton,
  TextField,
} from '@/components/ui'
import SearchToolbar from '@/components/ui/SearchToolbar.jsx'
import Drawer from '@/components/ui/Drawer.jsx'
import Pagination from '@/components/ui/Pagination.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import SaveStatus from '@/components/ui/SaveStatus.jsx'
import useSaveStatus from '@/components/ui/useSaveStatus.js'
import { useToasts } from '@/components/ToastProvider.jsx'
import { articleActionLabels, articleStatusLabels, articleTypeLabels, articleVisibilityLabels } from '@/lib/i18n'

const PAGE_SIZE = 20
const EMPTY = {
  title: '',
  article_type: 'lore',
  subtype_id: null,
  visibility: 'public',
  parent_id: null,
  excerpt: '',
  body_markdown: '',
  tags: [],
}

const fromArticle = (a) => ({
  title: a.title,
  article_type: a.article_type,
  subtype_id: a.subtype?.id ?? null,
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

  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')
  const [typeFilter, setTypeFilter] = useState([])
  const [tagFilter, setTagFilter] = useState([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [tagMatch, setTagMatch] = useState('any')
  const [statusFilter, setStatusFilter] = useState([])
  const [subtypeFilter, setSubtypeFilter] = useState([])
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('newest')
  const authorNames = useUserNames()
  const { user: me } = useAuth()
  const [authorFilter, setAuthorFilter] = useState('')
  const [pendingOnly, setPendingOnly] = useState(false)
  // Поиск (от 2 символов) идёт через /articles/search — фильтры (статус, автор, «ждут решения») работают и там.
  const listQ = useArticleFinder({
    page,
    size: PAGE_SIZE,
    sort,
    text: applied,
    ...(statusFilter.length ? { status: statusFilter } : {}),
    ...(typeFilter.length ? { article_type: typeFilter } : {}),
    ...(subtypeFilter.length ? { subtype_id: subtypeFilter.map((s) => s.id) } : {}),
    ...(tagFilter.length ? { tag_id: tagFilter.map((t) => t.id), tag_match: tagMatch } : {}),
    ...(authorFilter ? { author_id: authorFilter } : {}),
    ...(pendingOnly ? { has_pending_proposals: true } : {}),
  })

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

  const chooseArticle = (id) => {
    setSelected(id)
  }

  return (
    <div className="article-workspace lore-page">
      {selected === null && <header className="lore-header article-workspace-header">
        <div>
          <p className="lore-eyebrow">Мастерская мира</p>
          <h1 className="heading-section">Статьи и теги</h1>
          <p className="lore-intro">Истории, места и герои вашего мира.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setTagManagerOpen(true)}>Теги</Button>
          <Button onClick={() => chooseArticle('new')}><LoreIcon name="plus" />Новая статья</Button>
        </div>
      </header>}
      {selected !== null && <div className="article-workspace-nav lore-reading-toolbar">
        <button type="button" className="article-back" onClick={() => setSelected(null)} aria-label="Вернуться к статьям"><LoreIcon name="back" />Ко всем статьям</button>
      </div>}
      {tagManagerOpen && <Drawer title="Теги" closeLabel="Закрыть теги" onClose={() => setTagManagerOpen(false)}><TagsManager /></Drawer>}
      <div>
        {selected === null && <section className="article-library">
        <div>
          <div className="lore-search-panel">
            <SearchToolbar query={search} onQueryChange={setSearch} onSearch={() => { setPage(1); setApplied(search.trim()) }} onFilters={() => setFiltersOpen(true)} filterCount={typeFilter.length + tagFilter.length + subtypeFilter.length + statusFilter.length + (authorFilter ? 1 : 0) + (pendingOnly ? 1 : 0)} filtersOpen={filtersOpen} label="Поиск по статьям" placeholder="Поиск по статьям…" submitLabel="Найти статьи"
              extraAction={<SortControl value={sort} onChange={(value) => { setSort(value); setPage(1) }} searching={applied.length >= 2} />} />
            {(typeFilter.length > 0 || tagFilter.length > 0 || subtypeFilter.length > 0 || statusFilter.length > 0 || authorFilter || pendingOnly) && <div className="lore-active-filters" aria-label="Активные фильтры">
              {pendingOnly && <button type="button" className="lore-chip lore-chip--active" aria-label="Убрать фильтр Ждут решения" onClick={() => { setPendingOnly(false); setPage(1) }}><span>Ждут решения</span><LoreIcon name="close" /></button>}
              {authorFilter && <button type="button" className="lore-chip lore-chip--active" aria-label="Убрать фильтр автора" onClick={() => { setAuthorFilter(''); setPage(1) }}><span>{String(me?.id) === authorFilter ? 'Мои статьи' : `Автор: ${authorNames.get(Number(authorFilter)) ?? `#${authorFilter}`}`}</span><LoreIcon name="close" /></button>}
              {statusFilter.map((s) => <button key={s} type="button" className="lore-chip lore-chip--active" aria-label={`Убрать статус ${articleStatusLabels[s]}`} onClick={() => { setStatusFilter(statusFilter.filter((x) => x !== s)); setPage(1) }}><span>{articleStatusLabels[s]}</span><LoreIcon name="close" /></button>)}
              {typeFilter.map((type) => <button key={type} type="button" className="lore-chip lore-chip--active" aria-label={`Убрать тип ${articleTypeLabels[type]}`} onClick={() => { setTypeFilter(typeFilter.filter((item) => item !== type)); setSubtypeFilter(subtypeFilter.filter((s) => s.article_type !== type)); setPage(1) }}><span>{articleTypeLabels[type]}</span><LoreIcon name="close" /></button>)}
              {subtypeFilter.map((s) => <button key={s.id} type="button" className="lore-chip lore-chip--active" aria-label={`Убрать подтип ${s.name}`} onClick={() => { setSubtypeFilter(subtypeFilter.filter((x) => x.id !== s.id)); setPage(1) }}><span>{s.name}</span><LoreIcon name="close" /></button>)}
              {tagFilter.map((tag) => <button key={tag.id} type="button" className="lore-chip lore-chip--active" aria-label={`Убрать тег ${tag.name}`} onClick={() => { const next = tagFilter.filter((item) => item.id !== tag.id); setTagFilter(next); if (next.length < 2) setTagMatch('any'); setPage(1) }}><span>#{tag.name}</span><LoreIcon name="close" /></button>)}
              {tagMatch === 'all' && tagFilter.length > 1 && <span className="text-xs text-stone-500">Все выбранные теги</span>}
              <button type="button" className="lore-reset" onClick={() => { setStatusFilter([]); setTypeFilter([]); setSubtypeFilter([]); setTagFilter([]); setTagMatch('any'); setAuthorFilter(''); setPendingOnly(false); setPage(1) }}>Сбросить фильтры</button>
            </div>}
          </div>
          {filtersOpen && <LoreFilters types={typeFilter} tags={tagFilter} match={tagMatch} subtypes={subtypeFilter} statuses={statusFilter} gm={{ author: authorFilter, pendingOnly }} onClose={() => setFiltersOpen(false)} onApply={(types, tags, match, subtypes, statuses, gm) => { setAuthorFilter(gm.author); setPendingOnly(gm.pendingOnly); setStatusFilter(statuses); setTypeFilter(types); setTagFilter(tags); setTagMatch(match); setSubtypeFilter(subtypes); setPage(1) }} />}
          {listQ.isLoading && <Skeleton className="h-24 w-full" />}
          {listQ.error && <ErrorBox error={listQ.error} onRetry={listQ.refetch} />}
          <ul>
            {(listQ.data?.items ?? []).map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => chooseArticle(a.id)}
                  className={`lore-article-row article-library-row ${selected === a.id ? 'article-library-row--selected' : ''} ${a.pending_proposals > 0 ? 'article-library-row--pending' : ''}`}
                >
                  <span className="lore-article-meta">
                    {a.pending_proposals > 0 && <Badge tone="accent">Ждёт решения{a.pending_proposals > 1 ? `: ${a.pending_proposals}` : ''}</Badge>}
                    <span className="lore-article-category">
                      <span className="lore-article-type">{articleTypeLabels[a.article_type] ?? a.article_type}</span>
                      {a.subtype && <><span className="text-stone-500" aria-hidden="true">·</span><span className="lore-article-subtype">{a.subtype.name}</span></>}
                    </span>
                    <Badge tone={a.status === 'published' ? 'good' : a.status === 'in_review' ? 'accent' : 'default'}>{articleStatusLabels[a.status] ?? a.status}</Badge>
                    {a.visibility === 'gm_only' && <GmOnlyBadge />}

                  </span>
                  <span className="lore-article-heading"><span className="article-library-title">{a.title}</span></span>
                  <ArticleAuthor author={a.author} />
                  {a.excerpt && <span className="lore-article-excerpt">{a.excerpt}</span>}
                  <LoreIcon name="arrow" className="lore-article-arrow" />
                </button>
              </li>
            ))}
            {listQ.data && listQ.data.items.length === 0 && <li className="lore-empty">Статей пока нет.</li>}
          </ul>
          <Pagination page={page} total={listQ.data?.total ?? 0} size={PAGE_SIZE} onPage={setPage} />
        </div>
        </section>}

        <div>
          {selected === 'new' && (
            <ArticleForm
              key="new"
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
    </div>
  )
}

function ArticleActions({ article, canDelete, onDelete }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const outside = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    const escape = (event) => { if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])
  return <div className="article-editor-menu" ref={rootRef}>
    <button ref={buttonRef} type="button" aria-label="Действия со статьёй" aria-expanded={open} onClick={() => setOpen(!open)}>⋯</button>
    {open && <div className="lore-tools-content article-actions-dropdown">
      <Link to={articlePath(article)}><LoreIcon name="arrow" />Открыть в лоре</Link>
      {canDelete && <button type="button" onClick={() => { setOpen(false); onDelete() }}><LoreIcon name="trash" />Удалить статью</button>}
    </div>}
  </div>
}

// Какие переходы доступны из статуса: отправить на проверку может автор статьи (чужие ГМ не правят),
// опубликовать/вернуть/архивировать/восстановить — только основатель.
const WORKFLOW = {
  draft: { gm: ['submit'], founder: ['submit', 'archive'] },
  in_review: { gm: [], founder: ['publish', 'reject', 'archive'] },
  published: { gm: [], founder: ['archive'] },
  archived: { gm: [], founder: ['restore'] },
}

const WORKFLOW_HINTS = {
  draft: 'Черновик доступен только мастерам. Отправьте его на проверку перед публикацией.',
  in_review: 'Статья ожидает проверки основателем и пока недоступна читателям.',
  published: 'Статья доступна читателям согласно выбранной видимости.',
  archived: 'Статья в архиве и недоступна читателям.',
}

function ArticleWorkflow({ status, saveStatus, onAction }) {
  const { isFounder } = useAuth()
  const actions = WORKFLOW[status]?.[isFounder ? 'founder' : 'gm'] ?? []
  const busy = saveStatus?.state === 'saving'
  return (
    <section className="article-workflow" aria-label="Статус статьи">
      <h3 className="article-editor-label">Статус</h3>
      <div className="article-workflow-state">
        <Badge tone={status === 'published' ? 'good' : status === 'in_review' ? 'accent' : 'default'}>{articleStatusLabels[status] ?? status}</Badge>
        <SaveStatus compact status={saveStatus} />
      </div>
      <p className="text-xs text-stone-500">{WORKFLOW_HINTS[status]}</p>
      {actions.length > 0 && <div className="article-workflow-actions">
        {actions.map((action) => (
          <Button key={action} type="button" size="sm" variant={action === 'archive' || action === 'reject' ? 'ghost' : 'primary'} className="w-full" disabled={busy} onClick={() => onAction(action)}>
            {articleActionLabels[action]}
          </Button>
        ))}
      </div>}
      {isFounder && status === 'in_review' && (
        <p className="text-xs text-stone-500">Перед публикацией проверьте изменения во вкладке «История»: публикуется именно та версия, которую вы открыли.</p>
      )}
    </section>
  )
}

function EditorSettings({ children }) {
  const [mobile, setMobile] = useState(() => window.matchMedia?.('(max-width: 900px)').matches ?? false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 900px)')
    if (!media) return
    const change = () => setMobile(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  return mobile ? (
    <div className="article-editor-settings-toggle">
      <Button variant="ghost" onClick={() => setOpen(true)}>Параметры статьи</Button>
      {open && <Drawer title="Параметры статьи" closeLabel="Закрыть параметры" onClose={() => setOpen(false)}><div className="article-editor-parameters">{children}</div></Drawer>}
    </div>
  ) : (
    <aside className="article-editor-settings article-editor-parameters" aria-label="Параметры статьи">
      <h3 className="article-editor-label mb-5">Параметры статьи</h3>
      {children}
    </aside>
  )
}

// author — { id, username } или null, если автора удалили.
// Поле чужой статьи в той же раскладке, что у автора (подпись + рамка), но без «Изменить».
function ReadOnlyField({ label, children }) {
  return (
    <div>
      <span className="text-label mb-1.5 block">{label}</span>
      <div className="rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2 text-sm text-stone-200">
        {children || <span className="text-stone-500">—</span>}
      </div>
    </div>
  )
}

function AuthorRow({ article }) {
  const { user } = useAuth()
  const { author } = article
  return <FactRow label="Автор" value={!author ? 'неизвестен' : String(author.id) === String(user?.id) ? 'Вы' : author.username} />
}

function ParentTitle({ id }) {
  const q = useArticleDetail(id)
  return <Link to={`/gm/articles?id=${id}`} className="text-ember hover:underline">{q.data?.title ?? `#${id}`}</Link>
}

// Параметры чужой статьи для ГМ-не-автора: то же, что в панели автора, но без правки.
function ArticleFacts({ article, values }) {
  return (
    <FactList>
      <AuthorRow article={article} />
      <FactRow label="Статус" value={articleStatusLabels[values.status] ?? values.status} />
      <FactRow label="Тип" value={articleTypeLabels[values.article_type] ?? values.article_type} />
      <FactRow label="Подтип" value={article.subtype?.name ?? '—'} />
      <FactRow label="Видимость" value={articleVisibilityLabels[values.visibility] ?? values.visibility} />
      <FactRow label="Родительская статья" value={values.parent_id ? <ParentTitle id={values.parent_id} /> : '—'} />
      <FactRow label="Теги" value={values.tags.length ? values.tags.map((t) => t.name).join(', ') : '—'} />
    </FactList>
  )
}

// Поля статьи в том виде, в каком они уходят на бэк (пустое описание — null). Статус не
// отправляется: новая статья всегда черновик, дальше — только переходы (ArticleWorkflow).
const toBody = (f) => ({
  title: f.title.trim(),
  article_type: f.article_type,
  subtype_id: f.subtype_id,
  visibility: f.visibility,
  parent_id: f.parent_id,
  excerpt: f.excerpt.trim() || null,
  body_markdown: f.body_markdown,
})

const SECRET_TOOL = {
  title: 'Секрет мастера: блок, скрытый от игроков',
  label: <LoreIcon name="eye" />,
  onClick: insertGmBlock,
}

const SecretHint = () => (
  <p className="flex items-center gap-1.5 text-xs text-stone-500">
    <LoreIcon name="eye" className="shrink-0" />
    <span>— блок <code>:::gm Текст :::</code> игроки его не видят и не находят поиском.</span>
  </p>
)

function ArticleForm({ article, ...props }) {
  return article ? <ArticleEditForm article={article} {...props} /> : <ArticleCreateForm {...props} />
}

// Выпадающие списки общие для создания и правки; onChange(patch) решает, что с ними делать.
function ArticleSelects({ values, articleId, onChange, disabled = false, statuses }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="space-y-2">
      <Field label="Тип">
        <Select value={values.article_type} disabled={disabled || statuses?.article_type?.state === 'saving'} onChange={(e) => onChange({ article_type: e.target.value, ...(values.subtype_id ? { subtype_id: null } : {}) }, 'Тип')}>
          {ARTICLE_TYPES.map((t) => (
            <option key={t} value={t}>
              {articleTypeLabels[t]}
            </option>
          ))}
        </Select>
        {statuses && <SaveStatus status={statuses.article_type} />}
      </Field>
      <SubtypeSelect articleType={values.article_type} value={values.subtype_id} disabled={disabled || statuses?.subtype_id?.state === 'saving'} onChange={(id) => onChange({ subtype_id: id })} />
      {statuses && <SaveStatus status={statuses.subtype_id} />}
      </div>
      <Field label="Видимость">
        <Select
          value={values.visibility}
          disabled={disabled || statuses?.visibility?.state === 'saving'}
          onChange={(e) => onChange({ visibility: e.target.value }, 'Видимость')}
        >
          {ARTICLE_VISIBILITY.map((v) => (
            <option key={v} value={v}>
              {articleVisibilityLabels[v]}
            </option>
          ))}
        </Select>
        {statuses && <SaveStatus status={statuses.visibility} />}
      </Field>
      <div>
        <ParentArticlePicker articleId={articleId} value={values.parent_id} disabled={disabled || statuses?.parent_id?.state === 'saving'} onChange={(id) => onChange({ parent_id: id }, 'Родительская статья')} />
        {statuses && <SaveStatus status={statuses.parent_id} />}
      </div>
    </div>
  )
}

// Новая статья — обычная форма и одна кнопка «Создать статью»; дальше она открывается
// в режиме правки (ArticleEditForm), где каждое поле сохраняется само.
function ArticleCreateForm({ onSaved, toasts }) {
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
    <section className="article-editor">
      {/* creating: после «Создать» форма сама уходит на новую статью — это не потеря правки */}
      <UnsavedGuard when={!creating && Boolean(form.title.trim() || form.excerpt.trim() || form.body_markdown.trim())} />
      <h2 className="font-display text-xl font-bold text-stone-100">Новая статья</h2>
      <div className="article-editor-layout">
      <div className="article-editor-main space-y-5">
        <Field label="Название">
          <Input value={form.title} maxLength={200} onChange={(e) => set({ title: e.target.value })} />
        </Field>
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
      </div>
      <EditorSettings>
        <div className="space-y-3">
      <ArticleSelects values={form} onChange={(patch) => set(patch)} />
      <TagInput value={form.tags} onChange={(tags) => set({ tags })} />
        </div>
      </EditorSettings>
      </div>
      {error && <ErrorBox error={error} onRetry={() => setError(null)} />}
      <div className="article-editor-save flex flex-wrap items-center gap-3">
        <Button disabled={creating || !titleOk} onClick={create}>
          {creating ? 'Создаём…' : 'Создать статью'}
        </Button>
        {!titleOk && <span className="text-xs text-stone-500">Сначала введите название.</span>}
      </div>
    </section>
  )
}

// Правка статьи как в конструкторе справочников: общей кнопки «Сохранить» нет.
// Текстовые поля — «Изменить» → «Сохранить» (PATCH только этого поля); списки и теги
// сохраняются сразу при изменении. Все запросы идут по очереди (queueRef), чтобы
// ответы не приходили вперемешку, а на экране — последнее выбранное значение.
function ArticleEditForm({ article, onSaved, onImagesChanged, onDeleted, toasts }) {
  const { user, isFounder } = useAuth()
  const canEdit = canEditArticle(article, user, isFounder)
  // Основатель правит любую статью напрямую, но к чужой может и предложить правку — пусть решает автор.
  const isAuthor = article.author?.id != null && String(article.author.id) === String(user?.id)
  const founderMayPropose = isFounder && !isAuthor
  const { statuses, run, clear } = useSaveStatus()
  const [values, setValues] = useState(() => fromArticle(article))
  // Версия содержимого, которую сейчас показывает форма: уходит в publish (проверка «основатель читал именно её»)
  // и обновляется из каждого ответа сервера. Читателям версия не отдаётся — только ГМ.
  const [version, setVersion] = useState(article.version)
  const versionRef = useRef(article.version)
  const syncVersion = (next) => {
    if (next == null) return
    versionRef.current = next
    setVersion(next)
  }
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activePanel, setActivePanel] = useState('text')
  const tabsRef = useRef(null)
  useLayoutEffect(() => {
    const tabs = tabsRef.current
    if (!tabs) return
    const updateIndicator = () => {
      const selected = tabs.querySelector('[aria-pressed="true"]')
      if (!selected) return
      tabs.style.setProperty('--tab-left', `${selected.offsetLeft}px`)
      tabs.style.setProperty('--tab-width', `${selected.offsetWidth}px`)
    }
    updateIndicator()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateIndicator)
      return () => window.removeEventListener('resize', updateIndicator)
    }
    const observer = new ResizeObserver(updateIndicator)
    observer.observe(tabs)
    tabs.querySelectorAll('button').forEach((button) => observer.observe(button))
    return () => observer.disconnect()
  }, [activePanel])
  const [bodyEdit, setBodyEdit] = useState(false)
  const [bodyDraft, setBodyDraft] = useState('')
  const [bodySaving, setBodySaving] = useState(false)
  const [bodyNote, setBodyNote] = useState('')
  const [proposing, setProposing] = useState(false)
  const pendingCount = useArticleProposals(article.id, { status: 'pending', size: 1 }).data?.total ?? 0
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
  // extra — то, что уходит в запрос, но не поле формы (change_note для истории).
  const patchFields = (patch, extra) =>
    enqueue(async () => {
      const saved = await articlesApi.update(article.id, { ...patch, ...extra })
      syncVersion(saved.version)
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
  const saveNow = async (patch) => {
    setValues((v) => ({ ...v, ...patch }))
    await run(Object.keys(patch)[0], () => patchFields(patch))
  }

  const saveTags = async (tags) => {
    setValues((v) => ({ ...v, tags }))
    await run('tags', async () => {
      await enqueue(async () => {
        const saved = await articlesApi.setTags(
          article.id,
          tags.map((t) => t.id),
        )
        onSaved?.(saved)
      })
    })
  }

  const transition = (action) =>
    run('status', () =>
      enqueue(async () => {
        const sent = versionRef.current
        let saved
        try {
          saved = await (action === 'publish'
            ? articlesApi.transition(article.id, action, { version: sent })
            : articlesApi.transition(article.id, action))
        } catch (e) {
          if (action !== 'publish' || e?.status !== 409) throw e
          // 409 бывает и из-за статуса; если версия на сервере другая — статью правили после вашего просмотра:
          // показываем свежий текст, чтобы публиковалось только прочитанное.
          const fresh = await articlesApi.get(article.id)
          if (fresh.version === sent) throw e
          setValues(fromArticle(fresh))
          syncVersion(fresh.version)
          onSaved?.(fresh)
          throw new Error('Статью изменили после вашего просмотра. Текст обновлён: проверьте изменения во вкладке «История» и опубликуйте снова.', { cause: e })
        }
        syncVersion(saved.version)
        setValues((v) => ({ ...v, status: saved.status }))
        onSaved?.(saved)
        toasts.push(articleStatusLabels[saved.status], saved.title, 'success')
      }),
    )

  // Возврат к старой версии: сервер создаёт новую версию с тем содержимым, форма показывает его.
  const onRestored = (saved, title = 'Версия восстановлена') => {
    syncVersion(saved.version)
    setValues(fromArticle(saved))
    onSaved?.(saved)
    toasts.push(title, saved.title, 'success')
  }

  const startBodyEdit = () => {
    clear('body')
    setBodyDraft(values.body_markdown)
    setBodyNote('')
    setBodyEdit(true)
  }

  const saveBody = async () => {
    if (bodySaving || statuses.body?.state === 'saving') return
    setBodySaving(true)
    await run('body', async () => {
      await patchFields({ body_markdown: bodyDraft }, bodyNote.trim() ? { change_note: bodyNote.trim() } : undefined)
      setBodyEdit(false)
    })
    setBodySaving(false)
  }

  // Вставка на место курсора. Если текст не в режиме правки — открываем его и
  // вставляем, как только редактор появится (см. onEditor).
  const insertImages = (urls) => {
    setActivePanel('text')
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

  const proposalForm = (
    <ProposalForm
      articleId={article.id}
      values={values}
      onCancel={() => setProposing(false)}
      onDone={() => {
        setProposing(false)
        setActivePanel('proposals')
        toasts.push('Предложение отправлено', values.title, 'success')
      }}
    />
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
    <section className="article-editor">
      <UnsavedGuard when={bodyEdit && bodyDraft !== values.body_markdown} />
      <div className="article-editor-heading">
        <h2 className="min-w-0 font-display text-xl font-bold text-stone-100">
          {values.title}
        </h2>
        <div className="flex items-center gap-3">
          <Badge tone={values.status === 'published' ? 'good' : values.status === 'in_review' ? 'accent' : 'default'}>{articleStatusLabels[values.status]}</Badge>
          <ArticleActions article={article} canDelete={isFounder} onDelete={() => setConfirmDelete(true)} />
        </div>
      </div>

      {error && <ErrorBox error={error} onRetry={() => setError(null)} />}
      {pendingCount > 0 && activePanel !== 'proposals' && (
        <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ember/60 bg-ember/10 px-4 py-3 text-sm text-stone-200">
          <p>
            <b className="text-ember">Ждут решения: {pendingCount}</b>{' '}
            {canEdit ? '— другие ГМ предложили правки к этой статье.' : '— предложения правок ещё рассматриваются.'}
          </p>
          <Button size="sm" onClick={() => setActivePanel('proposals')}>{canEdit ? 'Рассмотреть' : 'Посмотреть'}</Button>
        </div>
      )}
      <div className="article-editor-layout">
      <div className="article-editor-main">
      <div ref={tabsRef} className="article-editor-tabs" aria-label="Разделы редактора">
        {[
          ['text', 'Текст'],
          ['images', 'Изображения'],
          ['relations', 'Связи'],
          ['proposals', pendingCount ? `Предложения (${pendingCount})` : 'Предложения'],
          ['history', 'История'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={activePanel === key}
            className={key === 'proposals' && pendingCount > 0 ? 'article-editor-tab--attention' : undefined}
            onClick={() => setActivePanel(key)}
          >
            {label}
          </button>
        ))}
        <span className="article-editor-tab-indicator" aria-hidden="true" />
      </div>
      {!canEdit && (
      <div hidden={activePanel !== 'text'} className="article-editor-panel space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2 text-sm text-stone-300">
          <p>Эту статью написал другой ГМ: напрямую её правят только автор и основатель. Вы можете предложить изменение — автор или основатель его рассмотрит.</p>
          {!proposing && <Button size="sm" onClick={() => setProposing(true)}>Предложить изменение</Button>}
        </div>
        {proposing ? proposalForm : (
          <>
            <ReadOnlyField label="Название">{values.title}</ReadOnlyField>
            <ReadOnlyField label="Краткое описание">{values.excerpt}</ReadOnlyField>
            <ReadOnlyField label="Текст">{values.body_markdown && <ArticleText value={values.body_markdown} />}</ReadOnlyField>
          </>
        )}
      </div>
      )}
      {canEdit && proposing && (
      <div hidden={activePanel !== 'text'} className="article-editor-panel space-y-3">
        <p className="rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2 text-sm text-stone-300">
          Предложение правки: изменения попадут в статью, только если автор их примет.
        </p>
        {proposalForm}
      </div>
      )}
      {canEdit && !proposing && (
      <div hidden={activePanel !== 'text'} className="article-editor-panel space-y-5">
      {founderMayPropose && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2 text-sm text-stone-300">
          <p>Статью написал {article.author?.username ?? 'другой ГМ'}. Вы можете править её напрямую или, если не уверены, предложить правку автору.</p>
          <Button size="sm" variant="ghost" disabled={bodyEdit} onClick={() => setProposing(true)}>Предложить автору</Button>
        </div>
      )}
      <TextField label="Название" value={values.title} onSave={(draft) => saveText('title', draft)} />
      <TextField label="Краткое описание" value={values.excerpt} onSave={(draft) => saveText('excerpt', draft)} />

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-label">Текст (Markdown)</span>
          {!bodyEdit && (
            <button type="button" onClick={startBodyEdit} aria-label="Изменить текст статьи" className="btn-edit-inline">
              Изменить
            </button>
          )}
        </div>
        {bodyEdit ? (
          <>
            <RichTextEditor
              value={bodyDraft}
              disabled={bodySaving || statuses.body?.state === 'saving'}
              onChange={(e) => { clear('body'); setBodyDraft(e.target.value) }}
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
            <Field label="Что изменено (для истории, необязательно)" className="mt-2">
              <Input value={bodyNote} maxLength={300} onChange={(e) => setBodyNote(e.target.value)} placeholder="Например: дописал раздел о войне" />
            </Field>
            <div className="mt-2 flex items-center gap-2">
              <Button type="button" size="sm" onClick={saveBody} disabled={bodySaving || statuses.body?.state === 'saving'}>
                {bodySaving || statuses.body?.state === 'saving' ? <SaveStatus compact status={{ state: 'saving' }} /> : 'Сохранить'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { clear('body'); setBodyEdit(false) }} disabled={bodySaving || statuses.body?.state === 'saving'}>
                Отмена
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2">
            <ArticleText value={values.body_markdown} />
          </div>
        )}
      </div>

      <SaveStatus status={statuses.body} />
      </div>
      )}
      <div hidden={activePanel !== 'images'} className="article-editor-panel">
      <ArticleImages
        articleId={article.id}
        images={article.images ?? []}
        usedUrls={usedUrls}
        onChanged={onImagesChanged}
        onInsert={(img) => insertImages([img.image_url])}
        readOnly={!canEdit}
      />

      </div>
      <div hidden={activePanel !== 'relations'} className="article-editor-panel">
      <ArticleRelations articleId={article.id} articleTitle={values.title} readOnly={!canEdit} />
      </div>
      <div hidden={activePanel !== 'proposals'} className="article-editor-panel">
        {activePanel === 'proposals' && (
          <ArticleProposals articleId={article.id} canReview={canEdit} onAccepted={(saved) => onRestored(saved, 'Предложение принято')} />
        )}
      </div>
      <div hidden={activePanel !== 'history'} className="article-editor-panel">
        {activePanel === 'history' && (
          <ArticleHistory articleId={article.id} currentVersion={version} canRestore={canEdit} onRestored={onRestored} />
        )}
      </div>
      </div>
      {canEdit && <EditorSettings>
        <div className="space-y-3">
          <ul><AuthorRow article={article} /></ul>
          <ArticleWorkflow status={values.status} saveStatus={statuses.status} onAction={transition} />
          <ArticleSelects values={values} articleId={article.id} onChange={saveNow} statuses={statuses} />
          <TagInput value={values.tags} onChange={saveTags} />
          <SaveStatus status={statuses.tags} />
          <p className="text-xs text-stone-500">Параметры и теги сохраняются сразу. Для текста используйте кнопку «Сохранить».</p>
        </div>
      </EditorSettings>}
      {!canEdit && <EditorSettings><ArticleFacts article={article} values={values} /></EditorSettings>}
      </div>

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
    </section>
  )
}
