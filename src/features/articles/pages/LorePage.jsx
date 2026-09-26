import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigationType, useOutletContext, useSearchParams } from 'react-router-dom'
import { articlePath, isPublicArticle } from '@/features/articles/api.js'
import { parseTagIds, parseTypes } from '@/features/articles/filters.js'
import { useArticlesPage, useArticlesSearch } from '@/features/articles/queries.js'
import { Badge, Button, ErrorBox, Skeleton } from '@/components/ui'
import { articleStatusLabels, articleTypeLabels } from '@/lib/i18n'

const PAGE_SIZE = 12
const SORTS = [
  ['newest', 'Сначала новые'],
  ['title', 'По алфавиту'],
  ['updated', 'Недавно обновлённые'],
  ['oldest', 'Сначала старые'],
]

// search — текущие фильтры списка: уходят в ссылку на статью, чтобы на её странице
// панель поиска показывала их же, а «Лор» в хлебных крошках вёл обратно к этим результатам.
function ArticleRow({ article, gmView, showSnippet, search }) {
  return (
    <Link
      to={{ pathname: articlePath(article), search }}
      className="block border-b border-stone-800 py-3 transition hover:bg-stone-900/60"
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 className="font-medium text-stone-100 hover:text-ember">{article.title}</h3>
        <Badge>{articleTypeLabels[article.article_type] ?? article.article_type}</Badge>
        {article.subtype && <span className="text-xs text-stone-500">{article.subtype}</span>}
        {gmView && article.status !== 'published' && (
          <Badge tone="default">{articleStatusLabels[article.status] ?? article.status}</Badge>
        )}
        {gmView && article.visibility === 'gm_only' && <Badge tone="violet">🔒 ГМ</Badge>}
      </div>
      {article.excerpt && <p className="mt-1 line-clamp-1 text-sm text-stone-400">{article.excerpt}</p>}
      {showSnippet && article.snippet && (
        <p
          className="mt-1 line-clamp-1 text-sm text-stone-400 [&_mark]:bg-ember/30 [&_mark]:text-stone-100"
          dangerouslySetInnerHTML={{ __html: article.snippet }}
        />
      )}
    </Link>
  )
}

function scrollKey(search) {
  return `lore-scroll:${search}`
}

// Rendered as the /lore index route, inside LoreLayout's <Outlet/> — the search/filters
// bar in the layout stays mounted, this only owns the results list, pagination, and
// scroll-position restore for the list itself.
export default function LorePage() {
  const { gmView, playerView } = useOutletContext()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigationType = useNavigationType()
  const q = params.get('q') ?? ''
  const types = parseTypes(params)
  const tagIds = parseTagIds(params)
  const tagMatchAll = params.get('match') === 'all'
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)
  const sort = SORTS.some(([key]) => key === params.get('sort')) ? params.get('sort') : 'newest'

  const filters = {
    article_type: types.length ? types : undefined,
    tag_id: tagIds.length ? tagIds : undefined,
    tag_match: tagIds.length ? (tagMatchAll ? 'all' : 'any') : undefined,
    page,
    size: PAGE_SIZE,
  }
  const searching = q.trim().length >= 2
  const searchQ = useArticlesSearch({ q, ...filters })
  const listQ = useArticlesPage({ sort, ...filters }, { enabled: !searching })
  const activeQ = searching ? searchQ : listQ

  // «Глазами игрока» — только предпросмотр: ГМ-токен всё равно получает скрытые статьи,
  // поэтому отфильтровываем их здесь. Сниппеты поиска ГМ строятся по полному тексту
  // (с секретами), так что в этом режиме их не показываем.
  const items = (activeQ.data?.items ?? []).filter((a) => !playerView || isPublicArticle(a))
  const totalPages = Math.max(1, Math.ceil((activeQ.data?.total ?? 0) / PAGE_SIZE))

  // Continuously remember scroll position per search/page, so coming back with the
  // browser's back button (after reading an article) restores exactly where we were,
  // without waiting for a fresh re-render.
  useEffect(() => {
    const key = scrollKey(location.search)
    const onScroll = () => sessionStorage.setItem(key, String(window.scrollY))
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [location.search])

  const restoredRef = useRef(null)
  useEffect(() => {
    if (navigationType !== 'POP' || !activeQ.data) return
    const key = scrollKey(location.search)
    if (restoredRef.current === key) return
    restoredRef.current = key
    const y = Number(sessionStorage.getItem(key) ?? '0')
    window.scrollTo(0, y)
  }, [navigationType, location.search, activeQ.data])

  const setParam = (key, value) => {
    setParams((p) => {
      const next = new URLSearchParams(p)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    })
  }
  const setPage = (nextPage) => setParam('page', nextPage > 1 ? String(nextPage) : '')

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
        <span>{activeQ.data && (searching ? `Найдено: ${activeQ.data.total}` : `Статей: ${activeQ.data.total}`)}</span>
        {searching ? (
          <span>по релевантности</span>
        ) : (
          <label className="flex items-center gap-1.5">
            Порядок:
            <select
              value={sort}
              onChange={(e) =>
                setParams((p) => {
                  const next = new URLSearchParams(p)
                  if (e.target.value === 'newest') next.delete('sort')
                  else next.set('sort', e.target.value)
                  next.delete('page')
                  return next
                })
              }
              className="rounded border border-stone-700 bg-stone-900 px-2 py-1 text-xs text-stone-300"
            >
              {SORTS.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className={`mt-1 divide-y divide-stone-800 transition-opacity ${activeQ.isPlaceholderData ? 'opacity-60' : ''}`}>
        {activeQ.isLoading &&
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="my-3 h-14 w-full" />)}
        {activeQ.error && <ErrorBox error={activeQ.error} onRetry={activeQ.refetch} />}
        {items.map((a) => (
          <ArticleRow key={a.id} article={a} gmView={gmView} showSnippet={!playerView} search={location.search} />
        ))}
        {activeQ.data && items.length === 0 && (
          <p className="py-6 text-stone-500">
            {searching ? 'По этому запросу ничего не нашлось.' : 'Статей пока нет.'}
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm text-stone-400">
          <Button size="xs" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Назад
          </Button>
          {page} / {totalPages}
          <Button size="xs" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Вперёд
          </Button>
        </div>
      )}
    </>
  )
}
