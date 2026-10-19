import { useState } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Badge, Button, ErrorBox, Field, Skeleton, SkeletonCard, TextArea, TextField } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import SearchToolbar from '@/components/ui/SearchToolbar.jsx'
import { useToasts } from '@/components/ToastProvider.jsx'
import ArticleText from '@/features/articles/components/ArticleText.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { ArticleEditForm } from '@/features/articles/pages/GmArticlesPage.jsx'
import { articlesApi, canEditArticle } from '@/features/articles/api.js'
import { stripGmBlocks } from '@/features/articles/secrets.js'
import { useArticleBySlug, useArticleDetail, useInvalidateArticles } from '@/features/articles/queries.js'
import { useAuth } from '@/features/auth/useAuth.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { articleTypeLabels } from '@/lib/i18n/index.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { isCampaignMaterial, useKnowledgeLinks } from '@/features/campaigns/knowledgeLinks.js'
import { useCampaignMaterials, usePublicCampaign, usePublicCampaignArticles } from '@/features/campaigns/queries.js'
import ActiveFilters from '../components/ActiveFilters.jsx'
import FilterDrawer from '../components/FilterDrawer.jsx'
import AttachArticleDrawer, { NewMaterialForm } from '../components/KnowledgeBaseTools.jsx'
import TagLinks from '../components/TagLinks.jsx'

const typeLabel = (type) => articleTypeLabels[type] ?? type
const EMPTY_FILTERS = { types: [], pending: '' }
const articleSearch = (slug, edit = false) => ({ search: `?article=${encodeURIComponent(slug)}${edit ? '&edit=1' : ''}` })
const NOTE_PLACEHOLDER = 'Зачем читать: «до первой сессии», «если пойдут в порт»…'

// База знаний — папка подготовки ГМ, а не энциклопедия: свои материалы кампании разложены по разделам,
// лор идёт отдельно, справкой.
const MATERIAL_SECTIONS = [
  { type: 'quest', title: 'Квесты', icon: 'flag', empty: 'Квестов пока нет.' },
  { type: 'session', title: 'Сессии', icon: 'calendar', empty: 'Сессий пока нет.' },
]
const materialIcon = (type) => MATERIAL_SECTIONS.find((section) => section.type === type)?.icon ?? 'book'

function KnowledgeSection({ icon, title, count, hint, children }) {
  return (
    <section className="kb-section" aria-label={title}>
      <header className="kb-section-header">
        <h2><LoreIcon name={icon} />{title}<span className="kb-section-count">{count}</span></h2>
        {hint && <p className="text-hint">{hint}</p>}
      </header>
      {children}
    </section>
  )
}

// Пометка к статье базы — в боковой панели справа: написать, поправить, стереть или отвязать статью совсем.
// Панель закрывается, только когда сохранение прошло; ошибку показывает тост из useKnowledgeLinks.
function NoteDialog({ link, kb, onClose }) {
  const [note, setNote] = useState(link.note)
  const [busy, setBusy] = useState(false)
  const run = async (action) => {
    setBusy(true)
    try { await action(); onClose() } catch { setBusy(false) }
  }
  return (
    <Drawer title="Пометка" subtitle={link.title} onClose={busy ? () => {} : onClose} closeLabel="Закрыть пометку" footer={
      <div className="modal-actions">
        <Button variant="ghost" disabled={busy} onClick={onClose}>Отмена</Button>
        <Button disabled={busy || note.trim() === link.note.trim()} onClick={() => run(() => kb.saveNote(link.article_id, note.trim()))}>{busy ? 'Сохраняем…' : 'Сохранить'}</Button>
      </div>
    }>
      <Field label="Зачем читать">
        <TextArea value={note} rows={4} disabled={busy} placeholder={NOTE_PLACEHOLDER} onChange={(event) => setNote(event.target.value)} />
      </Field>
      <p className="text-hint mt-2">Пустая пометка — статья остаётся в базе без неё.</p>
      <div className="kb-note-unlink">
        <p className="text-hint">Статья больше не нужна кампании — уберите её из базы знаний. {isCampaignMaterial(link.article_type) ? 'Сам материал не удалится, его можно подвязать снова.' : 'В лоре она останется.'}</p>
        <Button variant="danger" disabled={busy} onClick={() => run(() => kb.remove(link.article_id))}><LoreIcon name="close" />Отвязать статью</Button>
      </div>
    </Drawer>
  )
}

// Одна строка — одна статья: тип, название, пометка. Квест или сессия открывается здесь же (?article=…),
// статья лора — сразу в лоре. Карандаш у квеста или сессии ведёт в редактор (пометка там, под названием),
// у статьи лора — открывает боковую панель с пометкой и отвязкой.
function KnowledgeRow({ link, kb, canEdit, article, pending }) {
  const [editing, setEditing] = useState(false)
  const material = isCampaignMaterial(link.article_type)
  return (
    <li className="kb-ref" data-type={link.article_type}>
      <Link to={material ? articleSearch(link.slug) : `/lore/${link.slug}`} className="kb-ref-link">
        <span className="kb-ref-type">{material && <LoreIcon name={materialIcon(link.article_type)} />}{typeLabel(link.article_type)}</span>
        <span className="kb-ref-body">
          <span className="kb-ref-title">{link.title}</span>
          {(link.note || canEdit) && <span className="kb-ref-note"><span className="kb-note-label">Пометка:</span> {link.note || 'не задана'}</span>}
          {material && (article?.author || pending > 0) && <span className="kb-ref-meta">{article?.author && <span>@{article.author.username}</span>}{pending > 0 && <Badge tone="accent">Ждут решения: {pending}</Badge>}</span>}
        </span>
        <LoreIcon name="arrow" />
      </Link>
      {canEdit && (material
        ? <Link to={articleSearch(link.slug, true)} className="kb-ref-edit" title="Редактировать" aria-label={`Редактировать: ${link.title}`}><LoreIcon name="edit" /></Link>
        : <button type="button" className="kb-ref-edit" title="Пометка" aria-label={`Пометка: ${link.title}`} onClick={() => setEditing(true)}><LoreIcon name="edit" /></button>)}
      {editing && <NoteDialog link={link} kb={kb} onClose={() => setEditing(false)} />}
    </li>
  )
}

const PENDING_PARAMS = { has_pending_proposals: true, size: 100 }

// Список базы знаний: поиск и фильтры на клиенте (подвязанных статей не больше сотни), результаты — по разделам.
// ponytail: автор и описание — из карточки каждой статьи (N запросов, кэшируются); если базы вырастут,
// отдавать author/excerpt/pending_proposals прямо в PublicCampaignArticleLink на бэке.
function KnowledgeList({ preset, kb, canEdit }) {
  const { links } = kb
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const details = useQueries({ queries: links.map((link) => ({ queryKey: queryKeys.articles.detail(link.article_id), queryFn: () => articlesApi.get(link.article_id) })) })
  const byId = new Map(details.map((q) => q.data).filter(Boolean).map((article) => [article.id, article]))
  // «Ждут правок» — только материалы кампаний: правятся здесь лишь квесты и сессии.
  const pendingMaterials = useCampaignMaterials(PENDING_PARAMS)
  const pending = new Map((pendingMaterials.data?.items ?? []).map((article) => [article.id, article.pending_proposals ?? 0]))
  const present = [...new Set(links.map((link) => link.article_type))]
  const needle = applied.toLowerCase()
  const shown = links.filter((link) => {
    const article = byId.get(link.article_id)
    if (filters.types.length && !filters.types.includes(link.article_type)) return false
    if (filters.pending && !(pending.get(link.article_id) > 0)) return false
    return !needle || [link.title, link.note, article?.excerpt, article?.author?.username].filter(Boolean).join(' ').toLowerCase().includes(needle)
  })
  const chips = [
    ...filters.types.map((type) => [`type-${type}`, typeLabel(type), () => setFilters({ ...filters, types: filters.types.filter((item) => item !== type) })]),
    filters.pending && ['pending', 'Ждут правок', () => setFilters({ ...filters, pending: '' })],
  ].filter(Boolean)
  const filtered = Boolean(applied || chips.length)
  const lore = shown.filter((link) => !isCampaignMaterial(link.article_type))
  const pitch = stripGmBlocks(preset.pitch ?? '').trim()
  const sections = [
    { key: 'pending', legend: 'Правки', hint: 'Квесты и сессии, к которым другие ГМ предложили изменения.', options: [['', 'Все статьи'], ['1', 'Ждут правок']] },
    { key: 'types', legend: 'Тип', hint: 'Без выбора — все статьи.', multiple: true, options: present.map((type) => [type, typeLabel(type)]) },
  ]
  return (
    <section className="lore-results" aria-label="Статьи базы знаний">
      <div className="lore-search-panel">
        <SearchToolbar className="lore-search-toolbar" query={query} onQueryChange={setQuery} onSearch={() => setApplied(query.trim())} onFilters={() => setFiltersOpen(true)} filterCount={chips.length} filtersOpen={filtersOpen} label="Поиск в базе знаний" placeholder="Название, описание, автор или пометка…" />
        <ActiveFilters chips={chips} onReset={() => setFilters(EMPTY_FILTERS)} />
      </div>
      {filtersOpen && <FilterDrawer title="Фильтры базы знаний" subtitle={preset.title} sections={sections} value={filters} empty={EMPTY_FILTERS} onApply={setFilters} onClose={() => setFiltersOpen(false)} />}
      <div className="kb-sections">
        {filtered && <p className="lore-results-toolbar">Найдено: {shown.length}</p>}
        {!filtered && <Link to={articleSearch('about')} className="kb-brief">
          <span className="kb-brief-eyebrow">С чего начать</span>
          <span className="kb-brief-title">Описание кампании<LoreIcon name="arrow" /></span>
          {pitch && <span className="kb-brief-pitch">{pitch}</span>}
          {preset.author && <span className="kb-card-author">@{preset.author.username}</span>}
        </Link>}
        {MATERIAL_SECTIONS.map((section) => {
          const items = shown.filter((link) => link.article_type === section.type)
          if (filtered && !items.length) return null
          return (
            <KnowledgeSection key={section.type} icon={section.icon} title={section.title} count={items.length}>
              {items.length
                ? <ul className="kb-refs">{items.map((link) => <KnowledgeRow key={link.article_id} link={link} kb={kb} canEdit={canEdit} article={byId.get(link.article_id)} pending={pending.get(link.article_id)} />)}</ul>
                : <p className="kb-section-empty">{section.empty}</p>}
            </KnowledgeSection>
          )
        })}
        {(lore.length > 0 || !filtered) && <KnowledgeSection icon="book" title="Справка из лора" count={lore.length} hint="Статьи общего лора, на которые опирается кампания. Открываются в лоре.">
          {lore.length
            ? <ul className="kb-refs">{lore.map((link) => <KnowledgeRow key={link.article_id} link={link} kb={kb} canEdit={canEdit} />)}</ul>
            : <p className="kb-section-empty">Статьи лора пока не подвязаны.</p>}
        </KnowledgeSection>}
        {filtered && shown.length === 0 && <p className="lore-empty">По этим условиям статей нет.</p>}
      </div>
    </section>
  )
}

// Квест или сессия — тем же конструктором, что в редакторе статей, без вкладки «Связи»; под названием — пометка в базе знаний.
function MaterialEditor({ link, kb, onSaved, onDeleted, onUnlink }) {
  const articleId = link.article_id
  const toasts = useToasts()
  const { data: article, isLoading, error, refetch } = useArticleDetail(articleId)
  if (error) return <ErrorBox error={error} onRetry={refetch} />
  if (isLoading || !article) return <SkeletonCard className="min-h-[20rem]" />
  const note = <TextField label="Пометка в базе знаний (необязательно)" value={link.note} placeholder={NOTE_PLACEHOLDER} onSave={(value) => kb.saveNote(link.article_id, value.trim())} />
  const unlink = <Button size="sm" variant="ghost" onClick={onUnlink}><LoreIcon name="close" />Отвязать</Button>
  return <ArticleEditForm key={article.id} article={article} campaignMaterial toasts={toasts} onSaved={onSaved} onImagesChanged={() => onSaved(article)} onDeleted={onDeleted} afterTitle={note} headingActions={unlink} />
}

// Чтение статьи — колонкой, как статья лора, без связей. В лор уводим только лорные статьи.
function ArticleReading({ link }) {
  const { data: article, isLoading, error, refetch } = useArticleBySlug(link.slug)
  if (error) return <ErrorBox error={error} onRetry={refetch} />
  if (isLoading || !article) return <SkeletonCard className="min-h-[20rem]" />
  return (
    <article className="mx-auto w-full max-w-3xl" aria-label={article.title}>
      <p className="kb-card-type" data-type={article.article_type}><LoreIcon name={isCampaignMaterial(article.article_type) ? materialIcon(article.article_type) : 'book'} />{isCampaignMaterial(article.article_type) ? typeLabel(article.article_type) : `Из лора · ${typeLabel(article.article_type)}`}</p>
      <h1 className="heading-section mt-2 text-left">{article.title}</h1>
      <TagLinks tags={article.tags} />
      {/* Пометка здесь только читается: у квеста и сессии она правится в редакторе, у статьи лора — в панели из списка. */}
      {link.note && <p className="kb-reading-note"><span className="kb-note-label">Пометка:</span> {link.note}</p>}
      <div className="mt-6"><ArticleText value={article.body_markdown} /></div>
    </article>
  )
}

function KnowledgeBase({ preset, articles, canEdit }) {
  const { user, isFounder, isGM } = useAuth()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateArticles()
  const [params, setParams] = useSearchParams()
  const [attaching, setAttaching] = useState(false)
  const kb = useKnowledgeLinks(preset, articles)
  const current = params.get('article')
  const editing = params.get('edit') === '1'
  const link = kb.links.find((item) => item.slug === current)
  const go = (slug, edit = false) => setParams({ ...(slug ? { article: slug } : {}), ...(edit ? { edit: '1' } : {}) })
  const detail = useArticleBySlug(link && isCampaignMaterial(link.article_type) ? link.slug : null)
  const canEditMaterial = Boolean(link && isCampaignMaterial(link.article_type) && detail.data && canEditArticle(detail.data, user, isFounder, isGM))
  const saved = (article) => { invalidate(article.id); queryClient.invalidateQueries({ queryKey: queryKeys.publicCampaigns.all }); kb.retitle(article.id, article.title) }
  const back = <button type="button" className="article-back" onClick={() => go(null)}><LoreIcon name="back" />Ко всем статьям базы знаний</button>

  return (
    <div className="lore-page kb-page">
      {/* Как в лоре: слева — назад, справа — действия; название ниже идёт на всю ширину. */}
      <div className="lore-reading-toolbar">
        {current ? back : <Link to={`/public-campaigns/${preset.slug}`}><LoreIcon name="back" />{preset.title}</Link>}
        <div className="lore-reading-actions">
          {!current && canEdit && <><button type="button" onClick={() => go('new')}><LoreIcon name="plus" />Новый квест или сессия</button><button type="button" onClick={() => setAttaching(true)}><LoreIcon name="search" />Подвязать статью</button></>}
          {link && canEditMaterial && (editing ? <button type="button" onClick={() => go(link.slug)}><LoreIcon name="book" />Готово</button> : <button type="button" onClick={() => go(link.slug, true)}><LoreIcon name="edit" />Редактировать</button>)}
          {link && !isCampaignMaterial(link.article_type) && <Link to={`/lore/${link.slug}`}>Открыть в лоре <LoreIcon name="arrow" /></Link>}
          {/* Квест или сессию отвязывают в редакторе, статью лора — здесь (и в панели пометки из списка). */}
          {link && canEdit && !isCampaignMaterial(link.article_type) && <button type="button" onClick={() => { kb.remove(link.article_id); go(null) }}><LoreIcon name="close" />Отвязать</button>}
        </div>
      </div>

      {!current && <>
        <header className="kb-hero">
          <p className="kb-stamp">Только для ГМ</p>
          <p className="lore-eyebrow">База знаний мастера</p>
          <h1 className="heading-section">{preset.title}</h1>
          <p className="kb-intro">Папка подготовки к кампании: квесты и сессии, которые ведут ГМ, и статьи лора для справки.</p>
          <ul className="kb-counts" aria-label="Состав базы знаний">
            {[...MATERIAL_SECTIONS.map((section) => [section.title, kb.links.filter((link) => link.article_type === section.type).length]), ['Из лора', kb.links.filter((link) => !isCampaignMaterial(link.article_type)).length]].map(([title, count]) => <li key={title}>{title}: <strong>{count}</strong></li>)}
          </ul>
        </header>
        <KnowledgeList preset={preset} kb={kb} canEdit={canEdit} />
      </>}
      {current === 'about' && <article className="mx-auto w-full max-w-3xl" aria-label="Описание кампании">
        <p className="kb-card-type"><LoreIcon name="book" />Описание кампании</p>
        <h1 className="heading-section mt-2 text-left">{preset.title}</h1>
        <TagLinks tags={preset.tags} />
        {/* Описание правится в редакторе кампании, здесь — только чтение. */}
        <div className="mt-6"><ArticleText value={preset.description_markdown} empty="Описание пока не написано." /></div>
      </article>}
      {/* Ошибку подвязки показывает тост из useKnowledgeLinks; созданный материал открываем в редакторе в любом случае. */}
      {current === 'new' && canEdit && <NewMaterialForm onCreated={(article, note) => kb.attach(article, note).catch(() => {}).then(() => go(article.slug, true))} onCancel={() => go(null)} />}
      {link && (editing && canEditMaterial
        ? <MaterialEditor link={link} kb={kb} onSaved={saved} onDeleted={() => { kb.remove(link.article_id); go(null) }} onUnlink={() => { kb.remove(link.article_id); go(null) }} />
        : <ArticleReading key={link.slug} link={link} />)}
      {current && current !== 'about' && current !== 'new' && !link && <p className="lore-empty">Этой статьи нет в базе знаний.</p>}

      {attaching && <AttachArticleDrawer kb={kb} onClose={() => setAttaching(false)} />}
    </div>
  )
}

// База знаний публичной кампании — вики ГМ, как лор: список с поиском и фильтром, статья открывается здесь же
// колонкой (без связей). Квесты и сессии правит любой ГМ конструктором статей (?edit=1), без ревью и статусов;
// статьи лора — только чтение со ссылкой в лор. Подвязка, отвязка и пометки — тоже у любого ГМ (сам пресет
// по-прежнему правят только автор и основатель).
export default function PublicCampaignKnowledgePage() {
  const { slug } = useParams()
  const { isGM, isFounder } = useAuth()
  const { data: preset, isLoading, error, refetch } = usePublicCampaign(slug)
  const linksQ = usePublicCampaignArticles(preset?.id)
  const failure = error || linksQ.error
  if (failure) return <div className="lore-page"><ErrorBox error={toCampaignError(failure)} onRetry={error ? refetch : linksQ.refetch} /></div>
  if (isLoading || !preset || linksQ.isLoading || !linksQ.data) return <div className="lore-page" aria-busy="true"><Skeleton className="mb-6 h-10 w-80" /><SkeletonCard className="min-h-[20rem]" /></div>
  return <KnowledgeBase key={preset.id} preset={preset} articles={linksQ.data} canEdit={Boolean(isGM || isFounder)} />
}
