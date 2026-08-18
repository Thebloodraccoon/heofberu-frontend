import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { catalogApi as api } from '@/features/catalog/api.js'
import { catalog } from '../catalog.js'
import { useCatalogList } from '@/features/catalog/queries.js'
import { Badge, Card, EmptyState, ErrorBox, PageHeader, Spinner } from '@/components/ui'
import FilterModal from '@/features/catalog/components/browse/FilterModal.jsx'
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
  const cfg = catalog[resource]
  const filterFields = useMemo(() => cfg.filters ?? [], [cfg])

  const selectedId = id ? Number(id) : null
  const listQ = useCatalogList(resource, cfg.listParams ?? {})
  const items = listQ.data ?? null
  const detailQ = useQuery({
    queryKey: ['catalog', resource, selectedId],
    queryFn: () => fetchDetail(resource, selectedId),
    enabled: !!selectedId,
  })

  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({})
  const [showFilters, setShowFilters] = useState(false)
  const [subSel, setSubSel] = useState({ parentId: null, id: null })
  const selectedSubId = subSel.parentId === selectedId ? subSel.id : null

  const filterOptions = useMemo(() => {
    if (!items) return {}
    const opts = {}
    for (const field of filterFields) {
      const values = new Set()
      for (const it of items) {
        const v = it[field]
        if (Array.isArray(v)) {
          for (const x of v) if (x != null && x !== '') values.add(String(x))
        } else if (v != null && v !== '') values.add(String(v))
      }
      opts[field] = Array.from(values).sort()
    }
    return opts
  }, [items, filterFields])

  const filtered = useMemo(() => {
    if (!items) return null
    return items.filter((it) => {
      for (const field of filterFields) {
        const sel = filters[field]
        if (!sel || sel.length === 0) continue
        const v = it[field]
        if (Array.isArray(v)) {
          if (!v.some((x) => sel.includes(String(x)))) return false
        } else if (!sel.includes(String(v))) return false
      }
      const q = query.trim().toLowerCase()
      if (!q) return true
      return Object.values(it)
        .filter((v) => typeof v === 'string')
        .some((v) => v.toLowerCase().includes(q))
    })
  }, [items, filters, query, filterFields])

  const error = listQ.error ?? detailQ.error
  const activeCount = Object.values(filters).reduce((n, arr) => n + (arr?.length ?? 0), 0)

  return (
    <div>
      <PageHeader
        title={cfg.label}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск: имя, описание..."
              className="input-search sm:w-64"
            />
            {filterFields.length > 0 && (
              <button
                type="button"
                onClick={() => setShowFilters(true)}
                className="shrink-0 rounded border border-stone-700 bg-stone-800/70 px-4 py-2.5 text-sm font-medium text-stone-200 transition hover:bg-stone-800"
              >
                Фильтр{activeCount > 0 ? ` (${activeCount})` : ''}
              </button>
            )}
          </div>
        }
      />

      {error && (
        <ErrorBox
          error={error}
          onRetry={() => {
            listQ.refetch()
            detailQ.refetch()
          }}
        />
      )}
      {items === null && !error && <Spinner />}
      {items !== null && items.length === 0 && (
        <EmptyState text="Справочник пуст. Попросите ГМ наполнить его через npm run seed" />
      )}
      {items !== null && items.length > 0 && filtered.length === 0 && (
        <EmptyState text="Ничего не найдено по запросу" />
      )}

      {items && filtered && filtered.length > 0 && (
        selectedId ? (
          <div className="catalog-layout">
            <aside className="max-h-[calc(100vh-220px)] overflow-y-auto pr-1 lg:sticky lg:top-24">
              <Link
                to={`/catalog/${resource}`}
                className="mb-2 my-[5px] block link-back"
              >
                ← Ко всем записям
              </Link>
              <div className="flex flex-col gap-1">
                {filtered.map((it) => {
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
                        onClick={() => navigate(`/catalog/${resource}/${it.id}`)}
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
          <div className="catalog-grid">
            {filtered.map((it) => (
              <TileCard key={it.id} item={it} resource={resource} />
            ))}
          </div>
        )
      )}

      {showFilters && (
        <FilterModal
          fields={filterFields}
          options={filterOptions}
          value={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  )
}

export default CatalogListPage
