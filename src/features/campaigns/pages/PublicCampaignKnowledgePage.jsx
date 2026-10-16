import { useState } from 'react'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Badge, ErrorBox, Skeleton, SkeletonCard, TextField } from '@/components/ui'
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
import { useCampaignMaterials, usePublicCampaign } from '@/features/campaigns/queries.js'
import ActiveFilters from '../components/ActiveFilters.jsx'
import FilterDrawer from '../components/FilterDrawer.jsx'
import AttachArticleDrawer, { NewMaterialForm } from '../components/KnowledgeBaseTools.jsx'

const typeLabel = (type) => articleTypeLabels[type] ?? type
const EMPTY_FILTERS = { types: [], pending: '' }

function TagLinks({ tags }) {
  if (!tags?.length) return null
  return <div className="article-detail-tags mt-3 flex flex-wrap items-center gap-2" aria-label="Теги">{tags.map((tag) => <Link key={tag.id} to={`/lore?tags=${tag.id}`} className="rounded-full border border-stone-700 px-2 py-0.5 text-xs text-stone-400 hover:border-ember hover:text-ember">#{tag.name}</Link>)}</div>
}

// Строка списка — как строка статьи в лоре (тип, автор, краткое описание), только открывает статью здесь (?article=…).
function KnowledgeRow({ caption, title, author, excerpt, note, pending, article }) {
  return (
    <Link to={{ search: `?article=${encodeURIComponent(article)}` }} className={`lore-article-row ${pending ? 'article-library-row--pending' : ''}`}>
      <div className="lore-article-meta">
        <span className="lore-article-type">{caption}</span>
        {author && <span className="text-xs text-stone-500">@{author.username}</span>}
        {pending > 0 && <Badge tone="accent">Ждут решения: {pending}</Badge>}
      </div>
      <div className="lore-article-heading"><h2>{title}</h2><LoreIcon name="arrow" /></div>
      {excerpt && <p className="lore-article-excerpt">{excerpt}</p>}
      {note && <p className="text-hint mt-1">Пометка: {note}</p>}
    </Link>
  )
}

const PENDING_PARAMS = { has_pending_proposals: true, size: 100 }

// Список базы знаний — как лор: поиск и фильтры на клиенте (подвязанных статей не больше сотни).
// ponytail: автор и описание — из карточки каждой статьи (N запросов, кэшируются); если базы вырастут,
// отдавать author/excerpt/pending_proposals прямо в PublicCampaignArticleLink на бэке.
function KnowledgeList({ preset, links }) {
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const details = useQueries({ queries: links.map((link) => ({ queryKey: queryKeys.articles.detail(link.article_id), queryFn: () => articlesApi.get(link.article_id) })) })
  const byId = new Map(details.map((q) => q.data).filter(Boolean).map((article) => [article.id, article]))
  // «Ждут правок» — те же списки, что у фильтра редактора статей, лор и материалы кампаний отдельно.
  const pendingLore = useQuery({ queryKey: queryKeys.articles.list(PENDING_PARAMS), queryFn: () => articlesApi.list(PENDING_PARAMS) })
  const pendingMaterials = useCampaignMaterials(PENDING_PARAMS)
  const pending = new Map([...(pendingLore.data?.items ?? []), ...(pendingMaterials.data?.items ?? [])].map((article) => [article.id, article.pending_proposals ?? 0]))
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
  const sections = [
    { key: 'pending', legend: 'Правки', hint: 'Статьи, к которым другие ГМ предложили изменения.', options: [['', 'Все статьи'], ['1', 'Ждут правок']] },
    { key: 'types', legend: 'Тип', hint: 'Без выбора — все статьи.', multiple: true, options: present.map((type) => [type, typeLabel(type)]) },
  ]
  return (
    <section className="lore-results" aria-label="Статьи базы знаний">
      <div className="lore-search-panel">
        <SearchToolbar className="lore-search-toolbar" query={query} onQueryChange={setQuery} onSearch={() => setApplied(query.trim())} onFilters={() => setFiltersOpen(true)} filterCount={chips.length} filtersOpen={filtersOpen} label="Поиск в базе знаний" placeholder="Название, описание, автор или пометка…" />
        <ActiveFilters chips={chips} onReset={() => setFilters(EMPTY_FILTERS)} />
      </div>
      {filtersOpen && <FilterDrawer title="Фильтры базы знаний" subtitle={preset.title} sections={sections} value={filters} empty={EMPTY_FILTERS} onApply={setFilters} onClose={() => setFiltersOpen(false)} />}
      <div className="lore-article-list">
        {filtered && <p className="lore-results-toolbar">Найдено: {shown.length}</p>}
        {!filtered && <KnowledgeRow caption="Кампания" title="Описание кампании" author={preset.author} excerpt={stripGmBlocks(preset.pitch ?? '').trim()} article="about" />}
        {shown.map((link) => { const article = byId.get(link.article_id); return <KnowledgeRow key={link.article_id} caption={typeLabel(link.article_type)} title={link.title} author={article?.author} excerpt={article?.excerpt} note={link.note} pending={pending.get(link.article_id)} article={link.slug} /> })}
        {shown.length === 0 && <p className="lore-empty">{filtered ? 'По этим условиям статей нет.' : 'Статей пока не подвязано.'}</p>}
      </div>
    </section>
  )
}

// Квест или сессия — тем же конструктором, что в редакторе статей, без вкладки «Связи».
function MaterialEditor({ articleId, onSaved, onDeleted }) {
  const toasts = useToasts()
  const { data: article, isLoading, error, refetch } = useArticleDetail(articleId)
  if (error) return <ErrorBox error={error} onRetry={refetch} />
  if (isLoading || !article) return <SkeletonCard className="min-h-[20rem]" />
  return <ArticleEditForm key={article.id} article={article} campaignMaterial toasts={toasts} onSaved={onSaved} onImagesChanged={() => onSaved(article)} onDeleted={onDeleted} />
}

// Чтение статьи — колонкой, как статья лора, без связей. В лор уводим только лорные статьи.
function ArticleReading({ link, kb, canEditBase }) {
  const { data: article, isLoading, error, refetch } = useArticleBySlug(link.slug)
  if (error) return <ErrorBox error={error} onRetry={refetch} />
  if (isLoading || !article) return <SkeletonCard className="min-h-[20rem]" />
  return (
    <article className="mx-auto w-full max-w-3xl" aria-label={article.title}>
      <p className="lore-article-type">{typeLabel(article.article_type)}</p>
      <h1 className="heading-section mt-2 text-left">{article.title}</h1>
      <TagLinks tags={article.tags} />
      {canEditBase ? <div className="mt-4"><TextField label="Пометка (необязательно)" value={link.note} placeholder="Зачем читать: «до первой сессии», «если пойдут в порт»…" onSave={(note) => kb.saveNote(link.article_id, note)} /></div> : link.note && <p className="text-hint mt-2">{link.note}</p>}
      <div className="mt-6"><ArticleText value={article.body_markdown} /></div>
    </article>
  )
}

function KnowledgeBase({ preset, canEdit }) {
  const { user, isFounder } = useAuth()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateArticles()
  const [params, setParams] = useSearchParams()
  const [attaching, setAttaching] = useState(false)
  const kb = useKnowledgeLinks(preset)
  const current = params.get('article')
  const editing = params.get('edit') === '1'
  const link = kb.links.find((item) => item.slug === current)
  const go = (slug, edit = false) => setParams({ ...(slug ? { article: slug } : {}), ...(edit ? { edit: '1' } : {}) })
  const detail = useArticleBySlug(link && isCampaignMaterial(link.article_type) ? link.slug : null)
  const canEditMaterial = Boolean(link && isCampaignMaterial(link.article_type) && detail.data && canEditArticle(detail.data, user, isFounder))
  const saved = (article) => { invalidate(article.id); queryClient.invalidateQueries({ queryKey: queryKeys.publicCampaigns.all }); kb.retitle(article.id, article.title) }
  const back = <button type="button" className="article-back" onClick={() => go(null)}><LoreIcon name="back" />Ко всем статьям базы знаний</button>

  return (
    <div className="lore-page preset-knowledge-page">
      {/* Как в лоре: слева — назад, справа — действия; название ниже идёт на всю ширину. */}
      <div className="lore-reading-toolbar">
        {current ? back : <Link to={`/public-campaigns/${preset.slug}`}><LoreIcon name="back" />{preset.title}</Link>}
        <div className="lore-reading-actions">
          {!current && canEdit && <><button type="button" onClick={() => go('new')}><LoreIcon name="plus" />Новый квест или сессия</button><button type="button" onClick={() => setAttaching(true)}><LoreIcon name="search" />Подвязать статью</button></>}
          {link && canEditMaterial && (editing ? <button type="button" onClick={() => go(link.slug)}><LoreIcon name="book" />Готово</button> : <button type="button" onClick={() => go(link.slug, true)}><LoreIcon name="edit" />Редактировать</button>)}
          {link && !isCampaignMaterial(link.article_type) && <Link to={`/lore/${link.slug}`}>Открыть в лоре <LoreIcon name="arrow" /></Link>}
          {link && canEdit && !editing && <button type="button" onClick={() => { kb.remove(link.article_id); go(null) }}><LoreIcon name="close" />Отвязать</button>}
        </div>
      </div>

      {!current && <>
        <header className="lore-header"><div><p className="lore-eyebrow">База знаний</p><h1 className="heading-section">{preset.title}</h1><p className="lore-intro">Квесты, сессии и статьи лора, на которые опирается кампания. Видно только ГМ.</p></div></header>
        <KnowledgeList preset={preset} links={kb.links} />
      </>}
      {current === 'about' && <article className="mx-auto w-full max-w-3xl" aria-label="Описание кампании">
        <p className="lore-article-type">Кампания</p>
        <h1 className="heading-section mt-2 text-left">{preset.title}</h1>
        <TagLinks tags={preset.tags} />
        {/* Описание правится в редакторе кампании, здесь — только чтение. */}
        <div className="mt-6"><ArticleText value={preset.description_markdown} empty="Описание пока не написано." /></div>
      </article>}
      {current === 'new' && canEdit && <div className="mx-auto w-full max-w-3xl"><NewMaterialForm onCreated={async (article) => { await kb.attach(article); go(article.slug, true) }} onCancel={() => go(null)} /></div>}
      {link && (editing && canEditMaterial
        ? <MaterialEditor articleId={link.article_id} onSaved={saved} onDeleted={() => { kb.remove(link.article_id); go(null) }} />
        : <ArticleReading key={link.slug} link={link} kb={kb} canEditBase={canEdit} />)}
      {current && current !== 'about' && current !== 'new' && !link && <p className="lore-empty">Этой статьи нет в базе знаний.</p>}

      {attaching && <AttachArticleDrawer kb={kb} onClose={() => setAttaching(false)} />}
    </div>
  )
}

// База знаний публичной кампании — для ГМ, как лор: список с поиском и фильтром, статья открывается здесь же
// колонкой (без связей). Квесты и сессии автор правит конструктором статей (?edit=1); статьи лора — только
// чтение со ссылкой в лор. Подвязка, отвязка и пометки — у автора кампании и основателя.
export default function PublicCampaignKnowledgePage() {
  const { slug } = useParams()
  const { user, isFounder } = useAuth()
  const { data: preset, isLoading, error, refetch } = usePublicCampaign(slug)
  if (error) return <div className="lore-page"><ErrorBox error={toCampaignError(error)} onRetry={refetch} /></div>
  if (isLoading || !preset) return <div className="lore-page" aria-busy="true"><Skeleton className="mb-6 h-10 w-80" /><SkeletonCard className="min-h-[20rem]" /></div>
  return <KnowledgeBase key={preset.id} preset={preset} canEdit={isFounder || preset.author?.id === user?.id} />
}
