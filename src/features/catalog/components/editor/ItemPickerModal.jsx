import { useEffect, useMemo, useState } from 'react'
import { Button, ErrorBox, Input, Modal, Spinner } from '@/components/ui'
import { itemRarityLabels, itemTypeLabels, label } from '@/lib/i18n/index.js'
import { useCatalogPage } from '@/features/catalog/queries.js'
import FilterModal from '@/features/catalog/components/browse/FilterModal.jsx'
import Pagination from '@/features/catalog/components/browse/Pagination.jsx'

const enumOptions = (labels) => Object.entries(labels).map(([value, label]) => ({ value, label }))

export const ITEM_FILTERS = [
  { name: 'item_type', label: 'Тип предмета', options: enumOptions(itemTypeLabels) },
  { name: 'rarity', label: 'Редкость', options: enumOptions(itemRarityLabels) },
]

const PAGE_SIZE = 50

export default function ItemPickerModal({ title = 'Стартовое снаряжение', items = [], value = [], onSave, onClose }) {
  // Поиск и фильтры применяются по кнопке / закрытию фильтра и уходят на сервер,
  // как в каталоге: страница запрашивается с search/item_type/rarity.
  const [queryInput, setQueryInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [filters, setFilters] = useState({})
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(() => {
    const map = {}
    for (const it of value ?? []) {
      if (it.item_id != null) map[String(it.item_id)] = { item_id: it.item_id, quantity: it.quantity ?? 1 }
    }
    return map
  })

  const listParams = useMemo(() => {
    const params = { page, size: PAGE_SIZE }
    if (appliedSearch.trim()) params.search = appliedSearch.trim()
    if (Array.isArray(filters.item_type) && filters.item_type.length > 0) params.item_type = filters.item_type
    if (Array.isArray(filters.rarity) && filters.rarity.length > 0) params.rarity = filters.rarity
    return params
  }, [page, appliedSearch, filters])

  const listQ = useCatalogPage('items', listParams)
  const pageData = listQ.data ?? null
  const pageItems = pageData?.items ?? []
  const total = pageData?.total ?? 0

  // Кэш имён уже увиденных предметов, чтобы выбранное отображалось,
  // даже если предмет не попал в текущую страницу выдачи.
  const [known, setKnown] = useState(() => {
    const map = {}
    for (const it of items) map[String(it.id)] = it
    return map
  })
  useEffect(() => {
    setKnown((prev) => {
      let changed = false
      const next = { ...prev }
      for (const it of pageItems) {
        const key = String(it.id)
        if (!next[key]) {
          next[key] = it
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [pageItems])

  // Слева показываем только ещё не выбранные предметы текущей страницы.
  const available = useMemo(
    () => pageItems.filter((it) => !selected[String(it.id)]),
    [pageItems, selected]
  )

  const applySearch = () => {
    setAppliedSearch(queryInput)
    setPage(1)
  }

  const applyFilters = (next) => {
    setFilters(next)
    setPage(1)
  }

  const add = (it) =>
    setSelected((s) => ({ ...s, [String(it.id)]: { item_id: it.id, quantity: 1 } }))

  const removeSelected = (id) =>
    setSelected((s) => {
      const next = { ...s }
      delete next[id]
      return next
    })

  const setQuantity = (id, v) =>
    setSelected((s) => ({ ...s, [id]: { ...s[id], quantity: Number(v) || 1 } }))

  const selectedList = Object.values(selected)

  const hasActiveFilters = Object.keys(filters).length > 0

  return (
    <Modal
      title={title}
      subtitle="Выберите предметы и укажите количество"
      onClose={onClose}
      size="4xl"
      scroll
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-sm text-stone-400">Выбрано: {selectedList.length}</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button type="button" onClick={() => onSave(selectedList)}>
              Сохранить
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Левая колонка: поиск и доступные предметы */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">Доступные предметы</p>
          <div className="mb-3 flex gap-2">
            <Input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              placeholder="Поиск: имя, описание..."
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
              className={`shrink-0 rounded border px-3 py-2.5 text-sm font-medium transition ${
                hasActiveFilters
                  ? 'border-ember/80 bg-ember/10 text-ember hover:bg-ember/20'
                  : 'border-stone-700 bg-stone-800/70 text-stone-200 hover:bg-stone-800'
              }`}
            >
              Фильтр
            </button>
          </div>

          {(listQ.error) && <ErrorBox error={listQ.error} onRetry={() => listQ.refetch()} />}
          {!listQ.data && !listQ.error && <Spinner />}

          <div id="item-picker-list" className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {available.length === 0 ? (
              <p className="text-sm text-stone-500">Предметов не найдено</p>
            ) : (
              available.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => add(it)}
                  className="w-full cursor-pointer rounded-lg border border-stone-700/60 bg-stone-900/60 p-3 text-left transition hover:border-ember/50"
                >
                  <span className="block font-semibold text-stone-100">{it.name}</span>
                  <span className="block text-xs text-stone-400">
                    {[it.item_type ? label(it.item_type) : null, it.rarity && it.rarity !== 'NONE' ? label(it.rarity) : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
              ))
            )}
          </div>
          <Pagination
            page={page}
            total={total}
            size={PAGE_SIZE}
            onPage={(p) => {
              setPage(p)
              document.getElementById('item-picker-list')?.scrollIntoView({ block: 'start' })
            }}
          />
        </section>

        {/* Правая колонка: выбранное снаряжение и его управление */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">Выбранное снаряжение</p>
          {selectedList.length === 0 ? (
            <p className="text-sm text-stone-500">Ничего не выбрано</p>
          ) : (
            <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(50vh+2.75rem)]">
              {selectedList.map(({ item_id, quantity }) => {
                const id = String(item_id)
                const it = known[id]
                return (
                  <div key={id} className="rounded-lg border border-ember/60 bg-ember/5 p-2.5">
                    <div className="flex items-center gap-3">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ember">
                        {it?.name ?? `Предмет #${item_id}`}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          value={quantity}
                          onChange={(e) => setQuantity(id, e.target.value)}
                          className="w-20 rounded border border-stone-700 bg-stone-800/70 px-2 py-1 text-center text-sm text-stone-100 outline-none focus:border-ember"
                        />
                        <span className="text-xs text-stone-400">шт.</span>
                        <button
                          type="button"
                          onClick={() => removeSelected(id)}
                          className="rounded border border-red-800 px-2 py-0.5 text-xs text-red-300 transition hover:bg-red-950/50"
                        >
                          Убрать
                        </button>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {showFilters && (
        <FilterModal
          filters={ITEM_FILTERS}
          value={filters}
          onChange={applyFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </Modal>
  )
}
