import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, ErrorBox, Input, Modal, Skeleton } from '@/components/ui'
import { label } from '@/lib/i18n/index.js'
import { useCatalogPage } from '@/features/catalog/queries.js'
import { catalogApi as api } from '@/features/catalog/api.js'
import FilterModal from '@/features/catalog/components/browse/FilterModal.jsx'
import Pagination from '@/features/catalog/components/browse/Pagination.jsx'
import { ITEM_FILTERS } from './itemFilters.js'

const PAGE_SIZE = 50

export default function ItemPickerModal({
  title = 'Стартовое снаряжение',
  items = [],
  value = [],
  choiceGroups = null,
  onSave,
  onClose,
}) {
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

  // Группы «выбери-себе-из-N» (только для классов). Если choiceGroups === null —
  // снаряжение простое, без групп.
  const doingChoice = choiceGroups != null
  const [groups, setGroups] = useState(() => (choiceGroups ?? []).map((g) => ({ ...g })))
  const [pickerTarget, setPickerTarget] = useState(null)

  const addGroup = () =>
    setGroups((g) => [...g, { id: null, pick_count: 1, sort_order: g.length, options: [] }])
  const removeGroup = (gi) => setGroups((g) => g.filter((_, j) => j !== gi))
  const setGroupField = (gi, key, val) =>
    setGroups((g) => g.map((gr, j) => (j === gi ? { ...gr, [key]: val } : gr)))
  const addOption = (gi, opt) =>
    setGroups((g) =>
      g.map((gr, j) => (j === gi ? { ...gr, options: [...(gr.options ?? []), { ...opt, sort_order: (gr.options ?? []).length }] } : gr)),
    )
  const setOptionField = (gi, oi, key, val) =>
    setGroups((g) =>
      g.map((gr, j) =>
        j === gi ? { ...gr, options: (gr.options ?? []).map((o, k) => (k === oi ? { ...o, [key]: val } : o)) } : gr,
      ),
    )
  const removeOption = (gi, oi) =>
    setGroups((g) =>
      g.map((gr, j) => (j === gi ? { ...gr, options: (gr.options ?? []).filter((_, k) => k !== oi) } : gr)),
    )

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

  // Догружаем имена выбранных предметов и вариантов групп по ID, если их нет
  // в кэше, чтобы показывать название, а не «Предмет #N».
  const selectedIds = useMemo(() => {
    const ids = new Set()
    for (const s of Object.values(selected)) {
      if (s.item_id != null) ids.add(String(s.item_id))
    }
    for (const g of groups) {
      for (const o of g.options ?? []) {
        if (o.item_id != null) ids.add(String(o.item_id))
      }
    }
    return [...ids]
  }, [selected, groups])
  const fetchedRef = useRef(new Set())
  useEffect(() => {
    const missing = selectedIds.filter((id) => !known[id] && !fetchedRef.current.has(id))
    if (missing.length === 0) return
    missing.forEach((id) => fetchedRef.current.add(id))
    for (const id of missing) {
      api.items
        .get(Number(id))
        .then((it) => it && setKnown((prev) => ({ ...prev, [id]: it })))
        .catch(() => {})
    }
  }, [selectedIds, known])

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

  // Единый выбор предмета из левого списка: в режиме добавления варианта
  // предмет уходит в активную группу, иначе — в выбранное снаряжение.
  const handlePickItem = (it) => {
    if (doingChoice && pickerTarget != null) {
      addOption(pickerTarget, { item_id: it.id, quantity: 1 })
    } else {
      add(it)
    }
  }

  const activeGroup = doingChoice && pickerTarget != null ? groups[pickerTarget] : null

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
          <span className="text-sm text-stone-400">
            {doingChoice
              ? `Предметов: ${selectedList.length} · Групп: ${groups.length}`
              : `Выбрано: ${selectedList.length}`}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button
              type="button"
              onClick={() =>
                doingChoice ? onSave({ items: selectedList, choice_groups: groups }) : onSave(selectedList)
              }
            >
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
          {doingChoice && pickerTarget != null && activeGroup && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-ember/60 bg-ember/10 p-2">
              <span className="min-w-0 flex-1 truncate text-xs text-ember">
                Добавляете вариант в группу «выберите {activeGroup.pick_count ?? 1}» — кликните предмет
              </span>
              <button
                type="button"
                onClick={() => setPickerTarget(null)}
                className="shrink-0 rounded border border-ember/70 px-1.5 py-0.5 text-xs text-ember transition hover:bg-ember/10"
              >
                Готово
              </button>
            </div>
          )}
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
          {!listQ.data && !listQ.error && (
            <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1" aria-busy="true">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="space-y-1.5 rounded-lg border border-stone-700/60 p-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3.5 w-1/2" />
                </div>
              ))}
            </div>
          )}

          <div id="item-picker-list" className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {available.length === 0 ? (
              <p className="text-sm text-stone-500">Предметов не найдено</p>
            ) : (
              available.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => handlePickItem(it)}
                  className={`w-full cursor-pointer rounded-lg border p-3 text-left transition ${
                    doingChoice && pickerTarget != null
                      ? 'border-ember/60 bg-ember/5 hover:border-ember'
                      : 'border-stone-700/60 bg-stone-900/60 hover:border-ember/50'
                  }`}
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

        {/* Правая колонка: выбираемое (группы) поверх выбранного снаряжения */}
        <section>
          {doingChoice && (
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">
                  Выбираемое снаряжение
                </p>
                <button
                  type="button"
                  onClick={addGroup}
                  className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
                >
                  + Добавить группу
                </button>
              </div>
              {groups.length === 0 ? (
                <p className="text-sm text-stone-500">Групп нет</p>
              ) : (
                <div className="max-h-[40vh] space-y-3 overflow-y-auto pr-1">
                  {groups.map((g, gi) => (
                    <div
                      key={gi}
                      className={`rounded-lg border p-2.5 ${
                        pickerTarget === gi ? 'border-ember/70 bg-ember/5' : 'border-stone-700/60 bg-stone-900/60'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-stone-400">
                          <span className="whitespace-nowrap">Выбрать:</span>
                          <select
                            value={String(g.pick_count ?? 1)}
                            onChange={(e) => setGroupField(gi, 'pick_count', Number(e.target.value))}
                            className="min-w-[70px] rounded border border-stone-700 bg-stone-800/70 px-1.5 py-1 text-xs text-stone-100 outline-none focus:border-ember"
                          >
                            {[1, 2, 3].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() => setPickerTarget(pickerTarget === gi ? null : gi)}
                          className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
                        >
                          {pickerTarget === gi ? 'Готово' : '+ Вариант'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeGroup(gi)}
                          className="my-[5px] ml-auto rounded border border-red-800 px-2 py-1 text-xs text-red-300 transition hover:bg-red-950/50"
                        >
                          Удалить группу
                        </button>
                      </div>
                      {(g.options ?? []).length === 0 ? (
                        <p className="mt-2 text-xs text-stone-500">Вариантов нет — нажмите «+ Вариант» и выберите предмет слева</p>
                      ) : (
                        <div className="mt-2 space-y-1.5">
                          {(g.options ?? []).map((o, oi) => {
                            const it = known[String(o.item_id)]
                            return (
                              <div key={oi} className="flex items-center gap-2 rounded border border-stone-800 bg-stone-900/60 px-2 py-1.5">
                                <span
                                  className="min-w-0 flex-1 truncate text-sm text-stone-200"
                                  title={it?.name ?? `Предмет #${o.item_id}`}
                                >
                                  {it?.name ?? `Предмет #${o.item_id}`}
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  value={o.quantity}
                                  onChange={(e) =>
                                    setOptionField(gi, oi, 'quantity', Math.max(1, Number(e.target.value) || 1))
                                  }
                                  className="w-14 rounded border border-stone-700 bg-stone-800/70 px-1 py-0.5 text-center text-sm text-stone-100 outline-none focus:border-ember"
                                />
                                <span className="text-xs text-stone-400">шт.</span>
                                <button
                                  type="button"
                                  onClick={() => removeOption(gi, oi)}
                                  className="rounded border border-red-800 px-1.5 py-0.5 text-xs text-red-300 transition hover:bg-red-950/50"
                                  title="Убрать"
                                >
                                  ✕
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">Выбранное снаряжение</p>
          {selectedList.length === 0 ? (
            <p className="text-sm text-stone-500">Ничего не выбрано</p>
          ) : (
            <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {selectedList.map(({ item_id, quantity }) => {
                const id = String(item_id)
                const it = known[id]
                return (
                  <div key={id} className="flex items-center gap-3 rounded-lg border border-ember/60 bg-ember/5 p-2.5">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ember" title={it?.name ?? `Предмет #${item_id}`}>
                      {it?.name ?? `Предмет #${item_id}`}
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(id, e.target.value)}
                      className="w-16 rounded border border-stone-700 bg-stone-800/70 px-1 py-1 text-center text-sm text-stone-100 outline-none focus:border-ember"
                    />
                    <span className="text-xs text-stone-400">шт.</span>
                    <button
                      type="button"
                      onClick={() => removeSelected(id)}
                      className="rounded border border-red-800 px-2 py-0.5 text-xs text-red-300 transition hover:bg-red-950/50"
                      title="Убрать"
                    >
                      ✕
                    </button>
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
