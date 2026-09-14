import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth.js'
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

const personalLinks = [
  { to: '/profile', label: 'Профиль' },
  { to: '/characters', label: 'Мои персонажи' },
]

const gmLinks = [
  { to: '/gm/editor', label: 'Редактор справочников' },
  { to: '/gm/characters', label: 'Персонажи игроков' },
  { to: '/users', label: 'Пользователи' },
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

function SidebarContent({ onClick }) {
  const { authenticated, isGM } = useAuth()
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

function DesktopNavItem({ label, to, children }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  const menuRef = useRef(null)
  const timer = useRef(null)

  const place = () => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    let left = rect.left
    const width = Math.max(rect.width, 176)
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8)
    setPos({ left, top: rect.bottom + 4, width })
  }

  const enter = () => {
    clearTimeout(timer.current)
    if (!open) {
      place()
      setOpen(true)
    }
  }

  const leave = () => {
    timer.current = setTimeout(() => setOpen(false), 100)
  }

  useEffect(() => {
    if (!open) return undefined
    const onScroll = () => {
      const rect = ref.current?.getBoundingClientRect()
      if (!rect) return
      if (rect.top < 0) {
        setOpen(false)
        return
      }
      place()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  useEffect(() => () => clearTimeout(timer.current), [])

  useEffect(() => {
    if (!open) return
    const menuWidth = menuRef.current?.getBoundingClientRect().width
    if (!menuWidth) return
    setPos((p) => {
      if (!p) return p
      const left = Math.max(8, Math.min(p.left, window.innerWidth - menuWidth - 8))
      return left === p.left ? p : { ...p, left }
    })
  }, [open])

  if (to) {
    return (
      <NavLink
        to={to}
        end={to === '/'}
        className={({ isActive }) =>
          `rounded px-3 py-2 text-sm font-medium transition ${
            isActive ? 'bg-stone-800 text-stone-100' : 'text-stone-300 hover:bg-stone-800/60 hover:text-stone-100'
          }`
        }
      >
        {label}
      </NavLink>
    )
  }

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={enter}
      onMouseLeave={leave}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded px-3 py-2 text-sm font-medium text-stone-300 transition hover:bg-stone-800/60 hover:text-stone-100"
      >
        {label}
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            onMouseEnter={enter}
            onMouseLeave={leave}
            style={{ left: pos.left, top: pos.top, minWidth: pos.width }}
            className="fixed z-[100] whitespace-nowrap rounded-lg border border-stone-700/50 bg-stone-900 py-1 shadow-2xl shadow-black/50"
          >
            {children.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/catalog/races'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2 text-sm transition ${
                    isActive
                      ? 'bg-stone-800 text-stone-100'
                      : 'text-stone-300 hover:bg-stone-800/60 hover:text-stone-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}

function DesktopNav() {
  const { authenticated, isGM } = useAuth()

  const groups = [
    { label: 'Главная', to: '/' },
    { label: 'Руководство', to: '/guide' },
    { label: 'Справочники', children: catalogLinks },
    authenticated && { label: 'Личное', children: personalLinks },
    authenticated && isGM && { label: 'Для ГМ', children: gmLinks },
  ].filter(Boolean)

  return (
    <nav className="hidden backdrop-blur lg:flex">
      <div className="mx-auto border-b border-l border-r  border-stone-800 bg-stone-950/85 flex h-11 w-full max-w-[80rem] items-center justify-center gap-1 borde
r-x border-stone-800/80 px-5 sm:px-8">
        {groups.map((g) => (
          <DesktopNavItem key={g.label} {...g} />
        ))}
      </div>
    </nav>
  )
}

export default function Layout() {
  const { authenticated, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const close = () => setSidebarOpen(false)

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
              <>
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    navigate('/')
                  }}
                  className="hidden h-10 items-center gap-1.5 rounded border border-stone-700 px-2 text-xs text-stone-300 transition hover:bg-stone-800 md:inline-flex"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4"
                    aria-hidden="true"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="M16 17l5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>
                  Выйти
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="hidden h-10 items-center rounded border border-stone-700 px-2 text-xs text-stone-300 transition hover:bg-stone-800 md:inline-flex"
              >
                Войти
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 items-center rounded border border-stone-700 px-2 text-sm text-stone-300 transition hover:bg-stone-800 lg:hidden"
            aria-label="Открыть меню"
          >
            ☰
          </button>
        </nav>
      </header>

      <DesktopNav />

      <div className="mx-auto flex w-full max-w-[80rem] flex-1 flex-col border-x border-stone-800/80 bg-stone-950/90 shadow-[0_0_30px_rgba(0,0,0,0.75)]">
        <main className="flex-1 px-5 py-5 sm:px-8 sm:py-8">
          <Outlet />
        </main>

        <footer className="border-t border-stone-800/80 px-5 py-6 text-center text-xs text-stone-500 sm:px-7">
          &copy; {new Date().getFullYear()} Heofberu. Все права защищены.
        </footer>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-stone-950 lg:hidden">
          <header className="flex h-16 shrink-0 items-center gap-3 border-b border-stone-800 px-5">
            <Link
              to="/"
              onClick={close}
              className="flex items-center gap-2 text-sm font-medium text-stone-300 transition hover:text-stone-100"
            >
              <Crest size="size-8" />
              <span className="text-base font-bold tracking-wide text-stone-100">Heofberu</span>
            </Link>

            <div className="ml-auto flex items-center gap-2">
              <ThemeSwitcher />
              {authenticated ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      logout()
                      navigate('/')
                      close()
                    }}
                    className="flex h-10 items-center gap-1.5 rounded border border-stone-700 px-2 text-xs text-stone-300 transition hover:bg-stone-800"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-4"
                      aria-hidden="true"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <path d="M16 17l5-5-5-5" />
                      <path d="M21 12H9" />
                    </svg>
                    Выйти
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={close}
                  className="flex h-10 items-center rounded border border-stone-700 px-2 text-xs text-stone-300 transition hover:bg-stone-800"
                >
                  Войти
                </Link>
              )}
            </div>

            <button
              type="button"
              onClick={close}
              className="flex h-10 items-center rounded border border-stone-700 px-2 text-sm text-stone-300 transition hover:bg-stone-800"
              aria-label="Закрыть меню"
            >
              ✕
            </button>
          </header>

          <nav className="flex-1 overflow-y-auto p-4">
            <SidebarContent onClick={close} />
          </nav>
        </div>
      )}
    </div>
  )
}
