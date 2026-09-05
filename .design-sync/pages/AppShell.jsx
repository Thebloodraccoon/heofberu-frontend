// Design-sync reference composition — NOT the real app page (that's
// src/components/layout/Layout.jsx, which reads useAuth()/<Outlet/> and
// can't render outside a live router+auth tree). This file reproduces its
// exact header + sidebar + mobile-menu markup/logic, self-contained, so
// Claude Design has a faithful reference for the app's global chrome at
// every breakpoint. See .design-sync/NOTES.md and conventions.md.
import { useEffect, useRef, useState } from 'react'
import { MemoryRouter, Link, NavLink } from 'react-router-dom'
import { AuthContext } from '@/features/auth/AuthContext.js'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher.jsx'

const catalogLinks = [
  { to: '/catalog/races', label: 'Расы' },
  { to: '/catalog/classes', label: 'Классы' },
  { to: '/catalog/skills', label: 'Навыки' },
  { to: '/catalog/spells', label: 'Заклинания' },
  { to: '/catalog/backgrounds', label: 'Предыстории' },
  { to: '/catalog/feats', label: 'Черты' },
  { to: '/catalog/items', label: 'Предметы' },
  { to: '/catalog/features', label: 'Особенности' },
]

function Crest({ size = 'size-9' }) {
  return <img src="/logo.svg" alt="Heofberu" className={`${size} h-auto object-contain`} draggable="false" />
}

function SidebarLink({ to, end, label, onClick, className = '' }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `block rounded-r border-l-2 px-3 py-1.5 text-sm transition ${
          isActive
            ? 'border-ember bg-stone-800 font-medium text-stone-100'
            : 'border-transparent text-stone-300 hover:bg-stone-800/60 hover:text-stone-100'
        } ${className}`
      }
    >
      {label}
    </NavLink>
  )
}

function SectionTitle({ children }) {
  return (
    <p className="text-label-sm px-3 pb-1 pt-4">
      <span aria-hidden className="mr-1.5 text-[0.7em] text-ember/70">✦</span>
      {children}
    </p>
  )
}

function SidebarContent({ onClick, authenticated, isGM }) {
  return (
    <nav className="flex flex-col gap-0.5">
      <SidebarLink to="/" end label="Главная" onClick={onClick} />
      <SidebarLink to="/guide" label="Руководство" onClick={onClick} />

      <SectionTitle>Справочники</SectionTitle>
      {catalogLinks.map((l) => (
        <SidebarLink key={l.to} to={l.to} end={l.to === '/catalog/races'} label={l.label} onClick={onClick} />
      ))}

      {authenticated && (
        <>
          <SectionTitle>Личное</SectionTitle>
          <SidebarLink to="/profile" label="Профиль" onClick={onClick} />
          <SidebarLink to="/characters" label="Мои персонажи" onClick={onClick} />
        </>
      )}

      {authenticated && isGM && (
        <>
          <SectionTitle>ГМ</SectionTitle>
          <SidebarLink to="/gm/editor" label="Редактор справочников" onClick={onClick} />
          <SidebarLink to="/gm/characters" label="Персонажи игроков" onClick={onClick} />
          <SidebarLink to="/users" label="Пользователи" onClick={onClick} />
        </>
      )}
    </nav>
  )
}

function Shell({ authenticated, isGM, initialCollapsed, initialSidebarOpen, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen)
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const sidebarRef = useRef(null)

  useEffect(() => {
    const onDocClick = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) setCollapsed(true)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  const close = () => setSidebarOpen(false)
  const toggleCollapsed = () => setCollapsed((prev) => !prev)

  return (
    <div className="flex min-h-screen w-full flex-col bg-stone-950">
      <header className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950/85 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-[80rem] items-center gap-3 px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-stone-300 transition hover:text-stone-100">
            <Crest size="size-8" />
            <span className="text-base font-bold tracking-wide text-stone-100">Heofberu</span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden md:inline-flex">
              <ThemeSwitcher />
            </span>
            {authenticated ? (
              <button
                type="button"
                className="hidden h-[30px] items-center gap-1.5 rounded border border-stone-700 px-2 text-xs text-stone-300 transition hover:bg-stone-800 md:inline-flex"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
                Выйти
              </button>
            ) : (
              <Link to="/login" className="hidden h-[30px] items-center rounded border border-stone-700 px-2 text-xs text-stone-300 transition hover:bg-stone-800 md:inline-flex">
                Войти
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-[30px] items-center rounded border border-stone-700 px-2 text-sm text-stone-300 transition hover:bg-stone-800 lg:hidden"
            aria-label="Открыть меню"
          >
            ☰
          </button>
        </nav>
      </header>

      {collapsed ? (
        <aside ref={sidebarRef} className="hidden shrink-0 flex-col border-r border-stone-800 bg-stone-950/95 p-2 lg:fixed lg:left-0 lg:top-16 lg:z-30 lg:flex lg:h-[calc(100vh-4rem)]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleCollapsed()
            }}
            className="flex items-center gap-1 whitespace-nowrap rounded border border-stone-700 px-2.5 py-1.5 text-xs text-stone-300 transition hover:border-ember hover:text-ember"
            aria-label="Развернуть меню"
            title="Развернуть меню"
          >
            Меню
          </button>
        </aside>
      ) : (
        <aside ref={sidebarRef} className="hidden w-[16.75rem] shrink-0 flex-col border-r border-stone-800 bg-stone-950/95 p-3 lg:fixed lg:left-0 lg:top-16 lg:z-30 lg:flex lg:h-[calc(100vh-4rem)] lg:overflow-y-auto">
          <div className="mb-2 flex items-center justify-between border-b border-stone-800 pb-2 pl-1">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Меню</span>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="flex items-center gap-1 whitespace-nowrap rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:border-ember hover:text-ember"
              aria-label="Свернуть меню"
              title="Свернуть меню"
            >
              « Свернуть
            </button>
          </div>
          <SidebarContent onClick={close} authenticated={authenticated} isGM={isGM} />
        </aside>
      )}

      <div className="mx-auto flex w-full max-w-[80rem] flex-1 flex-col border-x border-stone-800/80 bg-stone-950/90 shadow-[0_0_30px_rgba(0,0,0,0.75)]">
        <main className="flex-1 px-5 py-5 sm:px-8 sm:py-8">{children}</main>
        <footer className="border-t border-stone-800/80 px-5 py-6 text-center text-xs text-stone-500 sm:px-7">
          &copy; {new Date().getFullYear()} Heofberu. Все права защищены.
        </footer>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-stone-950 lg:hidden">
          <header className="flex h-16 shrink-0 items-center gap-3 border-b border-stone-800 px-5">
            <Link to="/" onClick={close} className="flex items-center gap-2 text-sm font-medium text-stone-300 transition hover:text-stone-100">
              <Crest size="size-8" />
              <span className="text-base font-bold tracking-wide text-stone-100">Heofberu</span>
            </Link>

            <div className="ml-auto flex items-center gap-2">
              <ThemeSwitcher />
              {authenticated ? (
                <button
                  type="button"
                  onClick={close}
                  className="flex h-[30px] items-center gap-1.5 rounded border border-stone-700 px-2 text-xs text-stone-300 transition hover:bg-stone-800"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="M16 17l5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>
                  Выйти
                </button>
              ) : (
                <Link to="/login" onClick={close} className="flex h-[30px] items-center rounded border border-stone-700 px-2 text-xs text-stone-300 transition hover:bg-stone-800">
                  Войти
                </Link>
              )}
            </div>

            <button
              type="button"
              onClick={close}
              className="flex h-[30px] items-center rounded border border-stone-700 px-2 text-sm text-stone-300 transition hover:bg-stone-800"
              aria-label="Закрыть меню"
            >
              ✕
            </button>
          </header>

          <nav className="flex-1 overflow-y-auto p-4">
            <SidebarContent onClick={close} authenticated={authenticated} isGM={isGM} />
          </nav>
        </div>
      )}
    </div>
  )
}

const AUTH_VALUE = { user: { username: 'Игрок' } }

/**
 * The app's global chrome: sticky header (logo, theme switcher, login/logout,
 * mobile hamburger) plus the left navigation. On desktop (`lg:` and up) the
 * nav is a fixed sidebar column — expandable or collapsed to an icon rail via
 * `initialCollapsed`. Below `lg:` the sidebar column disappears entirely and
 * the hamburger opens the SAME nav as a full-screen overlay instead
 * (`initialSidebarOpen` previews that state). `children` renders in the main
 * content area exactly where a page's <Outlet/> would.
 */
export function AppShell({ authenticated = true, isGM = false, initialCollapsed = false, initialSidebarOpen = false, children }) {
  return (
    <AuthContext.Provider value={AUTH_VALUE}>
      <MemoryRouter>
        <Shell authenticated={authenticated} isGM={isGM} initialCollapsed={initialCollapsed} initialSidebarOpen={initialSidebarOpen}>
          {children ?? (
            <div className="fantasy-panel rounded-lg p-6">
              <h1 className="heading-page">Пример страницы</h1>
              <p className="text-body mt-2">Содержимое страницы рендерится здесь.</p>
            </div>
          )}
        </Shell>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

/**
 * Same shell as `AppShell`, captured at a phone-width viewport instead of
 * desktop — below the `lg:` (1024px) breakpoint the fixed sidebar column
 * disappears completely and the header's ☰ button is what reaches the nav,
 * opening it as a full-screen overlay (`initialSidebarOpen`). Exists as a
 * separate component only because this design-sync's capture viewport is
 * per-component, not per-story, and the desktop/mobile layouts need
 * different widths to render correctly.
 */
export function AppShellMobile({ authenticated = true, isGM = false, initialSidebarOpen = false, children }) {
  return <AppShell authenticated={authenticated} isGM={isGM} initialSidebarOpen={initialSidebarOpen}>{children}</AppShell>
}
