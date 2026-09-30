import { scrollChildToTop } from '@/lib/utils/scroll.js'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { sentenceCase } from '@/lib/i18n/index.js'
import { toPlainText } from '@/lib/utils/richText.js'
import { catalog } from '../catalog.js'
import { findCatalogPage } from '../findPage.js'
import { useCatalogPage } from '@/features/catalog/queries.js'
import { Badge, Card, ErrorBox, Skeleton, SkeletonCard } from '@/components/ui'
import FilterModal from '@/features/catalog/components/browse/FilterModal.jsx'
import CatalogToolbar from '@/features/catalog/components/CatalogToolbar.jsx'
import CatalogFilterSummary from '@/features/catalog/components/CatalogFilterSummary.jsx'
import CatalogEmptyState from '@/features/catalog/components/CatalogEmptyState.jsx'
import Pagination from '@/components/ui/Pagination.jsx'
import TileCard from '@/features/catalog/components/browse/TileCard.jsx'
import DetailPanel from '@/features/catalog/components/browse/detail/DetailPanel.jsx'
import { summaryBadges } from '@/features/catalog/components/browse/detail/detailHelpers.jsx'

async function fetchDetail(resource, selectedId) {
  const cfg = catalog[resource]
  return cfg.api.get(selectedId)
}

const PAGE_SIZE = 16

export function CatalogListPage() {
  const { resource, id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const cfg = catalog[resource]

  const pageParam = Number(searchParams.get('page')) || 1

  const selectedId = id ? Number(id) : null
  const requestedSubId = searchParams.get('sub') ? Number(searchParams.get('sub')) : null

  // Поиск и фильтры применяются по кнопке подтверждения.
  const [queryInput, setQueryInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [filters, setFilters] = useState({})
  const [showFilters, setShowFilters] = useState(false)
  const [manualPageChange, setManualPageChange] = useState(false)
  const [subSel, setSubSel] = useState({ parentId: null, id: null })
  const selectedSubId = subSel.parentId === selectedId ? subSel.id : null

  // Deep-link: при переходе с персонажа сразу открываем конкретную подрасу/подкласс.
  // Используем ref, чтобы при первом рендере эффект resource не перезатёр subSel.
  const subDeepLinked = useRef(false)
  const previousResource = useRef(resource)

  // Синхронизация с URL (deep-link из карточки персонажа): читаем ?sub= один раз
  // и сразу убираем его из адресной строки, поэтому setState здесь неизбежен.
  useEffect(() => {
    if (!selectedId || requestedSubId == null) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubSel({ parentId: selectedId, id: requestedSubId })
    subDeepLinked.current = true
    const next = new URLSearchParams(searchParams)
    next.delete('sub')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, requestedSubId])

  // Сброс локального поиска/фильтров при смене справочника (resource из URL) —
  // страница не размонтируется между справочниками, так что это делает эффект.
  useEffect(() => {
    if (previousResource.current === resource) {
      subDeepLinked.current = false
      return
    }
    previousResource.current = resource
    setManualPageChange(false)
    setQueryInput('')
    setAppliedSearch('')
    setFilters({})
    if (!subDeepLinked.current) {
      setSubSel({ parentId: null, id: null })
    }
    subDeepLinked.current = false
    if (searchParams.get('page')) {
      const next = new URLSearchParams(searchParams)
      next.delete('page')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource])

  const sectionRef = useRef(null)
  const listScrollRef = useRef(null)
  const resultsRef = useRef(null)
  const listScrollState = useRef({ resource, top: 0, hasSelection: false })
  const lastScrolledSelection = useRef(null)

  useEffect(() => {
    if (selectedId && window.innerWidth < 1024 && sectionRef.current) {
      const y = sectionRef.current.getBoundingClientRect().top + window.scrollY - 200
      const start = window.scrollY
      const dist = y - start
      const duration = 600
      let raf
      function step(t) {
        if (!t) t = performance.now()
        const p = Math.min((t - startTime) / duration, 1)
        const ease = 1 - Math.pow(1 - p, 3)
        window.scrollTo(0, start + dist * ease)
        if (p < 1) raf = requestAnimationFrame(step)
      }
      const startTime = performance.now()
      raf = requestAnimationFrame(step)
      return () => cancelAnimationFrame(raf)
    }
  }, [selectedId, selectedSubId])

  const listParams = useMemo(() => {
    const params = { page: pageParam, size: PAGE_SIZE, ...(cfg.listParams ?? {}) }
    if (appliedSearch.trim()) params.search = appliedSearch.trim()
    for (const f of cfg.filters ?? []) {
      if (Array.isArray(filters[f.name]) && filters[f.name].length > 0) {
        params[f.name] = filters[f.name]
      }
    }
    return params
  }, [cfg, pageParam, appliedSearch, filters])

  const listQ = useCatalogPage(resource, listParams)
  const pageData = listQ.data ?? null
  const items = pageData?.items ?? null

  // Список может размонтироваться во время загрузки другой страницы.
  useLayoutEffect(() => {
    const state = listScrollState.current
    if (state.resource !== resource) {
      listScrollState.current = { resource, top: 0, hasSelection: false }
      return
    }
    const box = listScrollRef.current
    if (box && box.scrollTop === 0 && state.top > 0) {
      box.scrollTop = Math.min(state.top, box.scrollHeight - box.clientHeight)
    }
  }, [resource, selectedId, pageData])

  // Активная плитка подтягивается от сохранённой позиции прокрутки.
  useEffect(() => {
    const box = listScrollRef.current
    const el = box?.querySelector('[data-active="true"]')
    if (!box || !el) return undefined
    const selection = `${resource}:${pageParam}:${selectedId}`
    if (lastScrolledSelection.current === selection) return undefined
    lastScrolledSelection.current = selection
    const duration = listScrollState.current.hasSelection ? undefined : 0
    listScrollState.current.hasSelection = true
    return scrollChildToTop(box, el, duration)
  }, [resource, pageParam, selectedId, items])
  const total = pageData?.total ?? 0

  useLayoutEffect(() => {
    if (selectedId || total <= PAGE_SIZE || !items?.length) return undefined
    const results = resultsRef.current
    if (!results) return undefined
    const updateHeight = () => {
      results.style.setProperty('--catalog-results-top', `${Math.max(0, results.getBoundingClientRect().top)}px`)
    }
    updateHeight()
    const header = results.closest('.catalog-page')?.querySelector('.catalog-page-aside')
    const observer = new ResizeObserver(updateHeight)
    if (header) observer.observe(header)
    window.addEventListener('resize', updateHeight)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateHeight)
    }
  }, [selectedId, total, items, resource])

  const setPage = (p) => {
    if (selectedId) window.scrollTo({ top: 0 })
    setManualPageChange(Boolean(selectedId))
    const next = new URLSearchParams(searchParams)
    if (p <= 1 && !selectedId) next.delete('page')
    else next.set('page', String(p))
    setSearchParams(next)
  }

  const applySearch = () => {
    setAppliedSearch(queryInput)
    setPage(1)
  }

  const applyFilters = (next) => {
    setFilters(next)
    setPage(1)
  }

  const detailQ = useQuery({
    queryKey: ['catalog', resource, selectedId],
    queryFn: () => fetchDetail(resource, selectedId),
    enabled: !!selectedId,
  })

  const hasActiveFilters = Object.keys(filters).length > 0
  const hasQuery = Boolean(appliedSearch.trim()) || hasActiveFilters
  const selectedOnPage = items?.some((item) => Number(item.id) === selectedId) ?? false
  const shouldLocatePage = Boolean(selectedId && items?.length && !selectedOnPage && (!searchParams.has('page') || !manualPageChange) && !hasQuery)
  const pageLookupQ = useQuery({
    queryKey: ['catalog', resource, 'page-for-item', selectedId, total, PAGE_SIZE],
    queryFn: () => findCatalogPage(cfg.api.list, selectedId, total, PAGE_SIZE, cfg.listParams),
    enabled: shouldLocatePage,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  useEffect(() => {
    if (!shouldLocatePage || pageLookupQ.data == null || pageParam === pageLookupQ.data) return
    const next = new URLSearchParams(searchParams)
    next.set('page', String(pageLookupQ.data))
    setSearchParams(next, { replace: true })
  }, [shouldLocatePage, pageLookupQ.data, pageParam, searchParams, setSearchParams])

  const CatalogNavigation = selectedId ? 'aside' : 'header'

  return (
    <div className={`catalog-page ${selectedId ? 'catalog-page--detail' : 'catalog-page--list'}`}>
      <CatalogNavigation className="catalog-page-aside" aria-label="Навигация по справочнику">
        <div className="catalog-aside-heading">
          {selectedId ? (
            <Link
              to={pageParam > 1 ? `/catalog/${resource}?page=${pageParam}` : `/catalog/${resource}`}
              className="link-back inline-flex items-center gap-1.5"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4 shrink-0">
                <path d="m12 19-7-7 7-7M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="leading-none">Ко всем записям</span>
            </Link>
          ) : (
            <>
              <p className="catalog-heading-eyebrow">Справочник</p>
              <h1 className="heading-page">{cfg.label}</h1>
              <p className="catalog-heading-intro">Описание, особенности и правила мира Хеофберу.</p>
            </>
          )}
        </div>
        {!selectedId && (
          <>
            <CatalogToolbar query={queryInput} onQueryChange={setQueryInput} onSearch={applySearch} onFilters={() => setShowFilters(true)} filterCount={Object.values(filters).reduce((count, values) => count + values.length, 0)} filtersOpen={showFilters} />
            <CatalogFilterSummary definitions={cfg.filters ?? []} value={filters} onChange={applyFilters} />
          </>
        )}
        {shouldLocatePage && pageLookupQ.isPending && (
          <p className="text-sm text-stone-400" aria-busy="true">Находим запись в каталоге…</p>
        )}
        {selectedId && items !== null && items.length > 0 && !(shouldLocatePage && pageLookupQ.isPending) && (
            <div className="catalog-entry-navigation">
              <div className="catalog-entry-body">
              <div
                ref={listScrollRef}
                className="catalog-entry-list"
                onScroll={(event) => {
                  listScrollState.current = { ...listScrollState.current, resource, top: event.currentTarget.scrollTop }
                }}
              >
              <div className="flex flex-col gap-1">
                {items.map((it) => {
                  const isActive = Number(it.id) === selectedId
                  const activeSubs =
                    resource === 'classes'
                      ? it.subclasses ?? []
                      : isActive
                        ? detailQ.data?.subraces ?? []
                        : []
                  return (
                    <div
                      key={it.id}
                      data-active={isActive}
                      className="catalog-record-card"
                    >
                      <button
                        type="button"
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() =>
                          navigate({
                            pathname: `/catalog/${resource}/${it.id}`,
                            search: searchParams.toString(),
                          })
                        }
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-display text-base font-bold text-stone-100">
                            {sentenceCase(it.name)}
                          </p>
                        </div>
                        {it.description && (
                          <p className="mt-1.5 line-clamp-2 break-words text-xs text-stone-400">{toPlainText(it.description)}</p>
                        )}
                        {summaryBadges(it, resource).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {summaryBadges(it, resource).map((b, i) => (
                              <Badge key={i} tone={b.tone} className="my-[5px]">{b.text}</Badge>
                            ))}
                          </div>
                        )}
                      </button>
                      <div
                        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                          isActive && (resource === 'classes' || resource === 'races') && activeSubs.length > 0
                            ? 'grid-rows-[1fr]'
                            : 'grid-rows-[0fr]'
                        }`}
                      >
                        <div className="overflow-hidden">
                          {(resource === 'classes' || resource === 'races') && (
                            <div className="mt-3  pt-2">
                              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                                {resource === 'races' ? 'Подрасы' : 'Подклассы'}
                              </p>
              <div className="grid auto-rows-fr gap-1">
                                {activeSubs.map((sub) => {
                                  const isSubActive = String(selectedSubId) === String(sub.id)
                                  return (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() => setSubSel({ parentId: selectedId, id: isSubActive ? null : sub.id })}
                                      className={`my-[5px] rounded border px-2 py-1 text-left text-xs transition ${
                                        isSubActive
                                          ? 'border-ember bg-ember/10 text-ember'
                                          : 'border-stone-700 text-stone-300 hover:border-ember/50'
                                      }`}
                                    >
                                      {sentenceCase(sub.name)}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              </div>
              <div className="catalog-entry-pagination shrink-0">
                <Pagination page={pageParam} total={total} size={PAGE_SIZE} onPage={setPage} />
              </div>
              </div>
            </div>
        )}
      </CatalogNavigation>
      <div className="catalog-page-content">
      {(listQ.error ?? detailQ.error) && (
        <ErrorBox
          error={listQ.error ?? detailQ.error}
          onRetry={() => {
            listQ.refetch()
            detailQ.refetch()
          }}
        />
      )}
      {items === null && !listQ.error && (
        selectedId ? (
          <div aria-busy="true"><SkeletonCard className="min-h-[24rem]" /></div>
        ) : (
          <div className="catalog-grid" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="catalog-tile p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-2/3" />
              </div>
            ))}
          </div>
        )
      )}
      {items !== null && items.length === 0 && (
        <CatalogEmptyState
          filtered={hasQuery}
          onReset={() => {
            setQueryInput('')
            setAppliedSearch('')
            setFilters({})
            setPage(1)
          }}
        />
      )}

      {items !== null &&
        items.length > 0 &&
        (selectedId ? (
          <section ref={sectionRef} className="catalog-detail min-w-0" aria-label={`${cfg.label}: подробности`}>

              {detailQ.data ? (
                <DetailPanel
                  key={`${resource}-${selectedId}`}
                  resource={resource}
                  item={detailQ.data}
                  selectedSubId={selectedSubId}
                />
              ) : (
                <Card className="p-8" aria-busy="true">
                  <div className="space-y-2">
                    <Skeleton className="h-7 w-1/2" />
                    <div className="mt-3 flex gap-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-28" />
                    </div>
                  </div>
                  <div className="mt-6 space-y-2.5">
                    {Array.from({ length: 6 }, (_, i) => (
                      <Skeleton key={i} className="h-4 w-full" />
                    ))}
                  </div>
                  <div className="mt-6 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </Card>
              )}
          </section>
        ) : (
          <div ref={resultsRef} className={total > PAGE_SIZE ? 'catalog-results catalog-results--paginated' : 'catalog-results'}>
            <div className="catalog-grid">
              {items.map((it) => (
                <TileCard key={it.id} item={it} resource={resource} />
              ))}
            </div>
            <Pagination page={pageParam} total={total} size={PAGE_SIZE} onPage={setPage} />
          </div>
        ))}

      </div>

      {showFilters && (
        <FilterModal
          filters={cfg.filters ?? []}
          value={filters}
          onChange={applyFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  )
}

export default CatalogListPage
