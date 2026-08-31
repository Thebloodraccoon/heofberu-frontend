import { useState } from 'react'
import { applyTheme, getTheme, isDarkTheme } from '@/lib/theme.js'

export default function ThemeSwitcher() {
  const [dark, setDark] = useState(isDarkTheme(getTheme()))

  const toggle = () => {
    const next = dark ? 'light' : 'parchment'
    applyTheme(next)
    setDark(!dark)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      title={dark ? 'Светлая тема' : 'Тёмная тема'}
      className="flex items-center gap-1.5 rounded border border-stone-700 px-2 py-1 text-stone-300 transition hover:bg-stone-800"
    >
      {dark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
      <span className="hidden sm:inline">{dark ? 'Светлая' : 'Тёмная'}</span>
    </button>
  )
}
