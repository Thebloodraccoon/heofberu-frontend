import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { catalogApi as api } from '@/features/catalog/api.js'
import { catalog, PAGE_SIZE } from '../catalog.js'
import { useCatalogPage } from '@/features/catalog/queries.js'
import { Badge, Card, EmptyState, ErrorBox, PageHeader, Spinner } from '@/components/ui'
import FilterModal from '@/features/catalog/components/browse/FilterModal.jsx'
import Pagination from '@/features/catalog/components/browse/Pagination.jsx'
import TileCard from '@/features/catalog/components/browse/TileCard.jsx'
import DetailPanel from '@/features/catalog/components/browse/detail/DetailPanel.jsx'
import { summaryBadges } from '@/features/catalog/components/browse/detail/detailHelpers.jsx'

async function fetchDetail(resource, selectedId) {
  const cfg = catalog[resource]
  const data = await cfg.api.get(selectedId)
  let withFeatures = data
  if (resource === 'classes') {
    try {
      const subs = withFeatures.subclasses ?? []
      const withSubFeatures = await Promise.all(
        subs.map(async (sub) => {
          const detail = await api.classes.subclasses.get(selectedId, sub.id)
          return { ...sub, ...detail }
        })
      )
      withFeatures = { ...withFeatures, subclasses: withSubFeatures }
    } catch {
      /* не критично для просмотра */
    }
  }
  if (resource === 'races') {
    try {
      const subs = withFeatures.subraces ?? []
      const withSubFeatures = await Promise.all(
        subs.map(async (sub) => {
          const detail = await api.races.subraces.get(selectedId, sub.id)
          return { ...sub, ...detail }
        })
      )
      withFeatures = { ...withFeatures, subraces: withSubFeatures }
    } catch {
      /* не критично для просмотра */
    }
  }
  return withFeatures
}

export function CatalogListPage() {
  const { resource, id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const cfg = catalog[resource]

  const pageParam = Number(searchParams.get('page')) || 1

  const selectedId = id ? Number(id) : null

  // Поиск и фильтры применяются только по кнопке «Найти» / выбору фильтра.
  const [queryInput, setQueryInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [filters, setFilters] = useState({})
  const [showFilters, setShowFilters] = useState(false)
  const [subSel, setSubSel] = useState({ parentId: null, id: null })
  const selectedSubId = subSel.parentId === selectedId ? subSel.id : null

  useEffect(() => {
    setQueryInput('')
    setAppliedSearch('')
    setFilters({})
    setSubSel({ parentId: null, id: null })
    if (searchParams.get('page')) {
      const next = new URLSearchParams(searchParams)
      next.delete('page')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource])

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
  const total = pageData?.total ?? 0

  const setPage = (p) => {
    window.scrollTo({ top: 0 })
    const next = new URLSearchParams(searchParams)
    if (p <= 1) next.delete('page')
    else next.set('page', String(p))
    setSearchParams(next)
  }

  const applySearch = () => {
    setAppliedSearch(queryInput)
    setPage(1)
  }

  const applyFilters = (next) => {
    setFilters(next)
    setShowFilters(false)
    setPage(1)
  }

  const detailQ = useQuery({
    queryKey: ['catalog', resource, selectedId],
    queryFn: () => fetchDetail(resource, selectedId),
    enabled: !!selectedId,
  })

  const activeCount = Object.keys(filters).length + (appliedSearch.trim() ? 1 : 0)
  const hasQuery = Boolean(appliedSearch.trim()) || Object.keys(filters).length > 0

  return (
    <div>
      <PageHeader
        title={cfg.label}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="flex gap-2">
              <input
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                placeholder="Поиск: имя, описание..."
                className="input-search w-full sm:w-64"
              />
              <button
                type="button"
                onClick={applySearch}
                className="shrink-0 rounded border border-stone-700 bg-stone-800/70 px-3 py-2.5 text-sm font-medium text-stone-200 transition hover:bg-stone-800"
                title="Искать на сервере"
              >
                ⌕
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(true)}
                className="shrink-0 rounded border border-stone-700 bg-stone-800/70 px-4 py-2.5 text-sm font-medium text-stone-200 transition hover:bg-stone-800"
              >
                Фильтр{activeCount > 0 ? ` (${activeCount})` : ''}
              </button>
            </div>
          </div>
        }
      />

      {(listQ.error ?? detailQ.error) && (
        <ErrorBox
          error={listQ.error ?? detailQ.error}
          onRetry={() => {
            listQ.refetch()
            detailQ.refetch()
          }}
        />
      )}
      {items === null && !listQ.error && <Spinner />}
      {items !== null && items.length === 0 && (
        <EmptyState
          text={
            hasQuery
              ? 'Ничего не найдено по запросу'
              : 'Справочник пуст. Попросите ГМ наполнить его через npm run seed'
          }
        />
      )}

      {items !== null &&
        items.length > 0 &&
        (selectedId ? (
          <div className="catalog-layout">
            <aside className="max-h-[calc(100vh-220px)] overflow-y-auto pr-1 lg:sticky lg:top-24">
              <Link
                to={pageParam > 1 ? `/catalog/${resource}?page=${pageParam}` : `/catalog/${resource}`}
                className="mb-2 my-[5px] block link-back"
              >
                ← Ко всем записям
              </Link>
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
                      className={`card-hover my-[3px] w-full fantasy-panel rounded-lg p-3 transition ${
                        isActive
                          ? 'border-ember/80 bg-stone-900'
                          : 'hover:border-ember/50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          navigate({
                            pathname: `/catalog/${resource}/${it.id}`,
                            search: searchParams.toString(),
                          })
                        }
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`font-display text-sm font-bold ${isActive ? 'text-ember' : 'text-stone-100'}`}>
                            {it.name}
                          </p>
                        </div>
                        {it.description && (
                          <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap text-xs text-stone-400">{it.description}</p>
                        )}
                        {summaryBadges(it).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {summaryBadges(it).map((b, i) => (
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
                            <div className="mt-3 border-t border-stone-700/70 pt-2">
                              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                                {resource === 'races' ? 'Подрасы' : 'Подклассы'}
                              </p>
                              <div className="flex flex-col gap-1">
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
                                      {sub.name}
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
              <Pagination page={pageParam} total={total} size={PAGE_SIZE} onPage={setPage} />
            </aside>

            <section className="min-w-0">
              {detailQ.data ? (
                <DetailPanel
                  key={`${resource}-${selectedId}`}
                  resource={resource}
                  item={detailQ.data}
                  selectedSubId={selectedSubId}
                />
              ) : (
                <Card className="p-10 text-center">
                  <Spinner />
                </Card>
              )}
            </section>
          </div>
        ) : (
          <>
            <div className="catalog-grid">
              {items.map((it) => (
                <TileCard key={it.id} item={it} resource={resource} />
              ))}
            </div>
            <Pagination page={pageParam} total={total} size={PAGE_SIZE} onPage={setPage} />
          </>
        ))}

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
