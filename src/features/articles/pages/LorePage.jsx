import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigationType, useOutletContext, useSearchParams } from 'react-router-dom'
import { articlePath } from '@/features/articles/api.js'
import { parseTagIds, parseTypes } from '@/features/articles/filters.js'
import { ARTICLE_SORTS } from '@/features/articles/sorts.js'
import { useArticlesPage, useArticlesSearch } from '@/features/articles/queries.js'
import { Badge, ErrorBox, Skeleton } from '@/components/ui'
import Pagination from '@/components/ui/Pagination.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import GmOnlyBadge from '@/features/articles/components/GmOnlyBadge.jsx'
import { articleStatusLabels, articleTypeLabels } from '@/lib/i18n'

const PAGE_SIZE = 12

// search — текущие фильтры списка: уходят в ссылку на статью, чтобы на её странице
// панель поиска показывала их же, а «Лор» в хлебных крошках вёл обратно к этим результатам.
function ArticleRow({ article, gmView, showSnippet, search }) {
  return (
    <Link
      to={{ pathname: articlePath(article), search }}
      className="lore-article-row"
    >
      <div className="lore-article-meta">
        <span className="lore-article-type">{articleTypeLabels[article.article_type] ?? article.article_type}</span>
        {gmView && article.status !== 'published' && (
          <Badge tone="default">{articleStatusLabels[article.status] ?? article.status}</Badge>
        )}
        {gmView && article.visibility === 'gm_only' && <GmOnlyBadge />}
        {article.subtype && <span className="text-xs text-stone-500">{article.subtype}</span>}
      </div>
      <div className="lore-article-heading"><h2>{article.title}</h2><LoreIcon name="arrow" /></div>
      {article.excerpt && !(showSnippet && article.snippet) && <p className="lore-article-excerpt">{article.excerpt}</p>}
      {showSnippet && article.snippet && (
        <p
          className="lore-article-excerpt [&_mark]:bg-ember/20 [&_mark]:text-stone-100"
          dangerouslySetInnerHTML={{ __html: article.snippet }}
        />
      )}
    </Link>
  )
}

function scrollKey(locationKey) {
  return `lore-scroll:${locationKey}`
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
  const sort = ARTICLE_SORTS.some(([key]) => key === params.get('sort')) ? params.get('sort') : 'newest'

  const filters = {
    article_type: types.length ? types : undefined,
    tag_id: tagIds.length ? tagIds : undefined,
    tag_match: tagIds.length ? (tagMatchAll ? 'all' : 'any') : undefined,
    page,
    size: PAGE_SIZE,
  }
  const searching = q.trim().length >= 2
  const searchQ = useArticlesSearch({ q, ...filters }, { publicView: playerView })
  const listQ = useArticlesPage({ sort, ...filters }, { enabled: !searching, publicView: playerView })
  const activeQ = searching ? searchQ : listQ

  // Публичный запрос фильтруется сервером до пагинации. Сниппеты в этом режиме не показываем.
  const items = activeQ.data?.items ?? []
  const total = activeQ.data?.total ?? 0

  // Continuously remember scroll position per search/page, so coming back with the
  // browser's back button (after reading an article) restores exactly where we were,
  // without waiting for a fresh re-render.
  useEffect(() => {
    const key = scrollKey(location.key)
    const onScroll = () => sessionStorage.setItem(key, String(window.scrollY))
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [location.key])

  const restoredRef = useRef(null)
  useEffect(() => {
    if (navigationType !== 'POP') {
      window.scrollTo(0, 0)
      return
    }
    if (!activeQ.data) return
    const key = scrollKey(location.key)
    if (restoredRef.current === key) return
    restoredRef.current = key
    const saved = sessionStorage.getItem(key)
    if (saved === null) {
      window.scrollTo(0, 0)
      return
    }
    const y = Number(saved)
    window.scrollTo(0, y)
  }, [navigationType, location.key, activeQ.data])

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
    <section className="lore-results" aria-label="Статьи">
      <div aria-busy={activeQ.isFetching} className={`lore-article-list transition-opacity ${activeQ.isPlaceholderData ? 'opacity-60' : ''}`}>
        {activeQ.isLoading &&
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="my-3 h-14 w-full" />)}
        {activeQ.error && <ErrorBox error={activeQ.error} onRetry={activeQ.refetch} />}
        {items.map((a) => (
          <ArticleRow key={a.id} article={a} gmView={gmView} showSnippet={!playerView} search={location.search} />
        ))}
        {activeQ.data && items.length === 0 && (
          <p className="lore-empty">
            {searching ? 'По этому запросу ничего не нашлось.' : 'Статей пока нет.'}
          </p>
        )}
      </div>

      <Pagination page={page} total={total} size={PAGE_SIZE} onPage={setPage} />
    </section>
  )
}
