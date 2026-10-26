import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import Drawer from '@/components/ui/Drawer.jsx'
import { Button, RichText } from '@/components/ui'
import SearchToolbar from '@/components/ui/SearchToolbar.jsx'
import { useEffect, useRef, useState } from 'react'
import CatalogFilterSummary from '@/features/catalog/components/CatalogFilterSummary.jsx'
import FilterModal from '@/features/catalog/components/browse/FilterModal.jsx'
import { SectionTitle, TrashIcon } from './editorShared.jsx'

const SEARCH_THRESHOLD = 8

// Блок множественного выбора из справочника: показывает только выбранные
// значения (чипы с крестиком), а кнопка «+ Добавить» раскрывает список ещё
// не выбранных вариантов — клик по варианту добавляет его. drawerActions —
// доп. кнопки над списком в выезжающей панели (например, «Добавить» свойство);
// headerActions — доп. кнопки в шапке блока рядом с «Изменить» (например, «Редактор свойств»);
// subheader — строка под шапкой (например, «Выбирает: − 2 + из 5» у навыков класса).
// В панели поиск и кнопки остаются наверху, прокручивается только список.
// chosenAsRows — выбранное строками «название + описание (option.description, Markdown)»
// с корзиной, как список умений; в панели выбора описание видно под каждым вариантом.
// В панели — поиск с «Найти»; parentFilterLabel («Класс», «Раса») включает «Фильтры»
// по родителю варианта (option.parentId / parentName — подклассы, подрасы).
export default function OptionsPicker({ drawer = false, label, hint, empty, options, selected, onToggle, onClear, drawerActions = null, headerActions = null, subheader = null, chosenAsRows = false, parentFilterLabel }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [filterValue, setFilterValue] = useState({})
  const [filtersOpen, setFiltersOpen] = useState(false)
  const rootRef = useRef(null)

  const parentOptions = parentFilterLabel
    ? [...new Map(options.filter((o) => o.parentId != null).map((o) => [o.parentId, o.parentName ?? String(o.parentId)])).entries()]
      .map(([value, name]) => ({ value, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'))
    : []
  const filters = parentOptions.length ? [{ name: 'parentId', label: parentFilterLabel, options: parentOptions }] : []
  const parents = filterValue.parentId ?? []
  const s = search.trim().toLowerCase()
  const drawerVisible = options.filter((option) =>
    (!s || String(option.label).toLowerCase().includes(s)) && (!parents.length || parents.includes(option.parentId)))

  useEffect(() => {
    if (!open || drawer) return undefined
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, drawer])

  const chosen = options.filter((o) => selected.includes(o.value))
  const available = options.filter((o) => !selected.includes(o.value))
  const q = query.trim().toLowerCase()
  const visible = q ? available.filter((o) => String(o.label).toLowerCase().includes(q)) : available

  const add = (value) => {
    onToggle(value)
    if (available.length <= 1) setOpen(false)
  }

  return (
    <div ref={rootRef}>
      <SectionTitle
        button={
          <div className="flex items-center gap-3">
            {headerActions}
            {chosen.length > 0 && onClear && (
              <button type="button" onClick={onClear} className="text-xs font-medium text-stone-400 hover:text-ember">
                Очистить
              </button>
            )}
            <button
              type="button"
              className="catalog-add-button"
              onClick={() => {
                setQuery('')
                setSearch('')
                setFilterValue({})
                setOpen((v) => !v)
              }}
              disabled={(options.length === 0 && !drawerActions) || (!drawer && available.length === 0)}
              aria-expanded={open}
            >
              {!drawer && <LoreIcon name="plus" />}
              {drawer ? 'Изменить' : 'Добавить'}
            </button>
          </div>
        }
      >
        {label}
      </SectionTitle>
      {subheader && <div className="mb-2">{subheader}</div>}

      {options.length === 0 && !drawerActions ? (
        <p className="text-sm text-stone-500">{empty}</p>
      ) : chosen.length === 0 ? (
        <p className="text-sm text-stone-500">{hint ?? 'Ничего не выбрано'}</p>
      ) : chosenAsRows ? (
        <ul className="space-y-2">
          {chosen.map((o) => (
            <li key={o.value} className="flex items-start gap-2 rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-100">{o.label}</p>
                {o.description ? <RichText value={o.description} className="mt-1 text-sm text-stone-400" /> : <p className="mt-1 text-xs text-stone-500">Описания нет</p>}
              </div>
              <button type="button" onClick={() => onToggle(o.value)} className="catalog-delete-button" title={`Убрать: ${o.label}`} aria-label={`Убрать: ${o.label}`}>
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {chosen.map((o) => drawer ? (
            <button key={o.value} type="button" className="catalog-filter-chip" onClick={() => onToggle(o.value)} aria-label={`Убрать: ${o.label}`}>
              {o.label} <LoreIcon name="close" />
            </button>
          ) : (
            <span
              key={o.value}
              className="inline-flex items-center gap-1 rounded bg-ember/15 py-1 pl-2.5 pr-1 text-xs font-medium text-ember"
            >
              {o.label}
              <button
                type="button"
                onClick={() => onToggle(o.value)}
                aria-label={`Убрать: ${o.label}`}
                className="flex size-4 items-center justify-center rounded text-ember/80 transition hover:bg-ember/25 hover:text-ember"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {open && drawer && <Drawer title={label} closeLabel={`Закрыть: ${label}`} bodyClassName="grant-picker-body" onClose={() => setOpen(false)} footer={<Button type="button" onClick={() => setOpen(false)}>Готово</Button>}>
        <div className="mb-4 flex items-center gap-2">
          <SearchToolbar
            className="min-w-0 flex-1"
            query={query}
            onQueryChange={setQuery}
            onSearch={() => setSearch(query)}
            onFilters={filters.length ? () => setFiltersOpen(true) : undefined}
            filtersOpen={filtersOpen}
            filterCount={parents.length}
            label={`Поиск: ${label}`}
          />
          {drawerActions && <div className="shrink-0">{drawerActions}</div>}
        </div>
        <CatalogFilterSummary definitions={filters} value={filterValue} onChange={setFilterValue} />
        {filtersOpen && <FilterModal filters={filters} value={filterValue} onChange={setFilterValue} onClose={() => setFiltersOpen(false)} />}
        <div className="grant-picker-list space-y-2 pr-1">{drawerVisible.map((option) => option.description ? (
          // С описанием: название — кнопка выбора, описание читается под ним (клик по нему тоже выбирает).
          <div key={option.value} className={`editor-record-card ${selected.includes(option.value) ? 'is-active' : ''}`}>
            <button type="button" className="w-full text-left" aria-pressed={selected.includes(option.value)} onClick={() => onToggle(option.value)}>
              {option.label}
            </button>
            <div className="mt-1 cursor-pointer text-xs text-stone-400" onClick={() => onToggle(option.value)}>
              <RichText value={option.description} />
            </div>
          </div>
        ) : <button type="button" key={option.value} className={`editor-record-card ${selected.includes(option.value) ? 'is-active' : ''}`} aria-pressed={selected.includes(option.value)} onClick={() => onToggle(option.value)}>
          {option.label}
        </button>)}
        {options.length > 0 && drawerVisible.length === 0 && <p className="text-sm text-stone-500">Ничего не найдено</p>}
        </div>
      </Drawer>}
      {open && !drawer && (
        <div className="mt-2 rounded border border-stone-700/70 bg-stone-900/80 p-2">
          {available.length > SEARCH_THRESHOLD && (
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск…"
              aria-label={`Поиск: ${label}`}
              className="mb-2 w-full rounded border border-stone-700 bg-stone-800/70 px-3 py-1.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-ember focus:outline-none"
            />
          )}
          {visible.length === 0 ? (
            <p className="px-1 py-1 text-sm text-stone-500">Ничего не найдено</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {visible.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => add(o.value)}
                  className="rounded bg-stone-800 px-2.5 py-1 text-xs font-medium text-stone-300 transition hover:bg-stone-700 hover:text-stone-100"
                >
                  + {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
