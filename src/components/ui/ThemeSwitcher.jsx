import { useEffect, useRef, useState } from 'react'
import { THEMES, applyTheme, getTheme } from '@/lib/theme.js'

export default function ThemeSwitcher({ align = 'right' }) {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(getTheme)
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const select = (id) => {
    applyTheme(id)
    setCurrent(id)
    setOpen(false)
  }

  const activeTheme = THEMES.find((t) => t.id === current) ?? THEMES[0]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Выбор темы"
        className="flex items-center gap-1.5 rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
      >
        <span
          className="inline-block size-3 rounded-full border border-stone-950/40"
          style={{ backgroundColor: activeTheme.accent }}
        />
        <span className="hidden sm:inline">Тема</span>
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 w-56 rounded-lg border border-stone-700 bg-stone-900 p-2 shadow-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            Цветовая гамма
          </p>
          {THEMES.map((t) => {
            const active = t.id === current
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => select(t.id)}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition ${
                  active ? 'bg-stone-800 text-stone-100' : 'text-stone-300 hover:bg-stone-800/60'
                }`}
              >
                <span className="flex -space-x-1">
                  <span
                    className="inline-block size-4 rounded-full border border-stone-950/40"
                    style={{ backgroundColor: t.accent }}
                  />
                  <span
                    className="inline-block size-4 rounded-full border border-stone-950/40"
                    style={{ backgroundColor: t.text }}
                  />
                  <span
                    className="inline-block size-4 rounded-full border border-stone-950/40"
                    style={{ backgroundColor: t.bg }}
                  />
                </span>
                <span className="flex-1">{t.name}</span>
                {active && <span className="text-ember">✦</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
