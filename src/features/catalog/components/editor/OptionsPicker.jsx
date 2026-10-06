import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import Drawer from '@/components/ui/Drawer.jsx'
import { Button, Input } from '@/components/ui'
import { useEffect, useRef, useState } from 'react'
import { SectionTitle } from './editorShared.jsx'

const SEARCH_THRESHOLD = 8

// Блок множественного выбора из справочника: показывает только выбранные
// значения (чипы с крестиком), а кнопка «+ Добавить» раскрывает список ещё
// не выбранных вариантов — клик по варианту добавляет его.
export default function OptionsPicker({ drawer = false, label, hint, empty, options, selected, onToggle, onClear }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)

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
                setOpen((v) => !v)
              }}
              disabled={options.length === 0 || (!drawer && available.length === 0)}
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

      {options.length === 0 ? (
        <p className="text-sm text-stone-500">{empty}</p>
      ) : chosen.length === 0 ? (
        <p className="text-sm text-stone-500">{hint ?? 'Ничего не выбрано'}</p>
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

      {open && drawer && <Drawer title={label} closeLabel={`Закрыть: ${label}`} onClose={() => setOpen(false)} footer={<Button type="button" onClick={() => setOpen(false)}>Готово</Button>}>
        <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск…" aria-label={`Поиск: ${label}`} className="w-full mb-4" />
        <div className="space-y-2">{options.filter((option) => !q || String(option.label).toLowerCase().includes(q)).map((option) => <button type="button" key={option.value} className={`editor-record-card ${selected.includes(option.value) ? 'is-active' : ''}`} aria-pressed={selected.includes(option.value)} onClick={() => onToggle(option.value)}>
          {option.label}
        </button>)}</div>
        {options.every((option) => q && !String(option.label).toLowerCase().includes(q)) && <p className="text-sm text-stone-500">Ничего не найдено</p>}
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
