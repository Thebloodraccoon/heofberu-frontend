import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
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
  { to: '/gm/articles', label: 'Редактор статей и тегов' },
  { to: '/gm/editor', label: 'Редактор справочников' },
  { to: '/gm/characters', label: 'Персонажи игроков' },
]

const founderLinks = [{ to: '/users', label: 'Админ-панель' }]

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
  const { authenticated, isGM, isFounder } = useAuth()
  return (
    <nav className="flex flex-col gap-0.5">
      <SidebarLink to="/" end label="Главная" onClick={onClick} />
      <SidebarLink to="/guide" label="Руководство" onClick={onClick} />
      <SidebarLink to="/lore" label="Лор" onClick={onClick} />

      <SectionTitle>Справочники</SectionTitle>
      {catalogLinks.map((l) => (
        <SidebarLink key={l.to} to={l.to} label={l.label} onClick={onClick} />
      ))}

      {authenticated && (
        <>
          <SectionTitle>Личное</SectionTitle>
          {personalLinks.map((link) => <SidebarLink key={link.to} {...link} onClick={onClick} />)}
        </>
      )}

      {authenticated && isGM && (
        <>
          <SectionTitle>ГМ</SectionTitle>
          {gmLinks.map((link) => <SidebarLink key={link.to} {...link} onClick={onClick} />)}
        </>
      )}

      {authenticated && isFounder && (
        <>
          <SectionTitle>Админ</SectionTitle>
          {founderLinks.map((link) => <SidebarLink key={link.to} {...link} onClick={onClick} />)}
        </>
      )}
    </nav>
  )
}

function DesktopNavItem({ label, to, children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const triggerRef = useRef(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (to) {
    return (
      <NavLink to={to} end={to === '/'} className={({ isActive }) =>
        `rounded px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-stone-800 text-stone-100' : 'text-stone-300 hover:bg-stone-800/60 hover:text-stone-100'}`
      }>
        {label}
      </NavLink>
    )
  }

  return (
    <div
      ref={ref}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="rounded px-3 py-2 text-sm font-medium text-stone-300 transition hover:bg-stone-800/60 hover:text-stone-100"
      >
        {label}
      </button>
      {open && (
        <div id={panelId} className="absolute left-0 top-full z-50 mt-1 min-w-44 whitespace-nowrap rounded-lg border border-stone-700/50 bg-stone-900 p-1 shadow-md shadow-black/20">
          {children.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `block rounded px-4 py-2 text-sm transition ${isActive ? 'bg-stone-800 text-stone-100' : 'text-stone-300 hover:bg-stone-800/60 hover:text-stone-100'}`}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

function DesktopNav() {
  const { authenticated, isGM, isFounder } = useAuth()

  const groups = [
    { label: 'Главная', to: '/' },
    { label: 'Руководство', to: '/guide' },
    { label: 'Лор', to: '/lore' },
    { label: 'Справочники', children: catalogLinks },
    authenticated && { label: 'Личное', children: personalLinks },
    authenticated && isGM && { label: 'Для ГМ', children: gmLinks },
    authenticated && isFounder && { label: 'Админ', children: founderLinks },
  ].filter(Boolean)

  return (
    <nav className="relative z-30 hidden backdrop-blur lg:flex">
      <div className="mx-auto flex h-11 w-full max-w-[80rem] items-center justify-center gap-1 border-x border-b border-stone-800/80 bg-stone-950/85 px-5 sm:px-8">
        {groups.map((g) => (
          <DesktopNavItem key={g.label} {...g} />
        ))}
      </div>
    </nav>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  const authPage = ['/login', '/register', '/forgot-password', '/reset-password'].includes(pathname.replace(/\/+$/, ''))
  const { authenticated, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const menuButtonRef = useRef(null)
  const closeButtonRef = useRef(null)
  const sidebarRef = useRef(null)
  const navigate = useNavigate()

  const close = () => {
    setSidebarOpen(false)
    menuButtonRef.current?.focus()
  }

  useEffect(() => {
    if (!sidebarOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close()
      if (event.key !== 'Tab') return
      const controls = sidebarRef.current?.querySelectorAll('a[href], button:not([disabled])')
      if (!controls?.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    const desktop = window.matchMedia('(min-width: 1024px)')
    const onBreakpoint = (event) => {
      if (event.matches) setSidebarOpen(false)
    }
    desktop.addEventListener('change', onBreakpoint)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      desktop.removeEventListener('change', onBreakpoint)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [sidebarOpen])

  return (
    <div className="flex min-h-dvh w-full flex-col bg-stone-950">
      {/* Высота этой липкой шапки продублирована в --app-header-h (index.css). */}
      <div className="sticky top-0 z-40 bg-stone-950/85 backdrop-blur">
        <header className="border-b border-stone-800">
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
              ref={menuButtonRef}
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 items-center rounded border border-stone-700 px-2 text-sm text-stone-300 transition hover:bg-stone-800 lg:hidden"
              aria-label="Открыть меню"
              aria-expanded={sidebarOpen}
              aria-controls="mobile-navigation"
            >
              ☰
            </button>
          </nav>
        </header>

        <DesktopNav />
      </div>

      <div className="mx-auto flex w-full max-w-[80rem] flex-1 flex-col border-x border-stone-800/80 bg-stone-950/90">
        <main className={`flex-1 px-5 py-5 sm:px-8 sm:py-8 ${authPage ? 'flex flex-col' : ''}`}>
          <Outlet />
        </main>

        <footer className="border-t border-stone-800/80 px-5 py-6 text-center text-xs text-stone-500 sm:px-7">
          &copy; {new Date().getFullYear()} Heofberu. Все права защищены.
        </footer>
      </div>

      {sidebarOpen && (
        <div ref={sidebarRef} id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Меню навигации" className="fixed inset-0 z-50 flex flex-col bg-stone-950 lg:hidden">
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
              ref={closeButtonRef}
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
