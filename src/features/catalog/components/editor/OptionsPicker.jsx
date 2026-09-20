import { useEffect, useRef, useState } from 'react'
import { SectionTitle } from './editorShared.jsx'

const SEARCH_THRESHOLD = 8

// Блок множественного выбора из справочника: показывает только выбранные
// значения (чипы с крестиком), а кнопка «+ Добавить» раскрывает список ещё
// не выбранных вариантов — клик по варианту добавляет его.
export default function OptionsPicker({ label, hint, empty, options, selected, onToggle, onClear }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
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
  }, [open])

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
              onClick={() => {
                setQuery('')
                setOpen((v) => !v)
              }}
              disabled={options.length === 0 || available.length === 0}
              aria-expanded={open}
              className="rounded border border-stone-700 bg-stone-800/70 px-2.5 py-1 text-xs font-medium text-stone-200 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Добавить
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
          {chosen.map((o) => (
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

      {open && (
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
