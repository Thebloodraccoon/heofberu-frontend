import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import ThemeSwitcher from './ThemeSwitcher.jsx'

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

function Crest({ size = 'size-9', text = 'text-base' }) {
  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full border border-stone-600 bg-stone-900 font-display font-black text-stone-100 shadow-[inset_0_0_0_2px_rgba(0,0,0,0.35)] ${text}`}
    >
      H
    </span>
  )
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
    <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
      <span aria-hidden className="mr-1.5 text-[0.7em] text-ember/70">✦</span>
      {children}
    </p>
  )
}

const SIDEBAR_KEY = 'heofberu.sidebar.collapsed'

export default function Layout() {
  const { authenticated, user, isGM, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === '1')
  const navigate = useNavigate()

  const close = () => setSidebarOpen(false)

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-stone-950">
      <div className="mx-auto flex min-h-screen w-full max-w-[90rem] flex-col border-x border-stone-800/80 bg-stone-950/90 shadow-[0_0_70px_rgba(0,0,0,0.75)]">
        <header className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950/85 backdrop-blur">
          <nav className="flex h-16 w-full items-center gap-3 px-4 sm:px-6">
            <Link to="/" className="flex items-center gap-2 text-sm font-medium text-stone-300 transition hover:text-stone-100">
              <Crest size="size-8 text-sm" />
              <span className="hidden text-base font-bold tracking-wide text-stone-100 sm:block">Heofberu</span>
            </Link>

            <div className="ml-auto flex items-center gap-2">
              <ThemeSwitcher />
              {authenticated ? (
                <>
                  <span className="hidden text-sm text-stone-300 md:block">{user?.username}</span>
                  <button
                    type="button"
                    onClick={() => {
                      logout()
                      navigate('/')
                    }}
                    className="hidden rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800 md:inline-block"
                  >
                    Выйти
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
                >
                  Войти
                </Link>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded border border-stone-700 px-2 py-1 text-sm text-stone-300 transition hover:bg-stone-800 lg:hidden"
              aria-label="Открыть меню"
            >
              ☰
            </button>
          </nav>
        </header>

        <div className="flex flex-1">
          {collapsed ? (
            <aside className="hidden shrink-0 flex-col self-start border-r border-stone-800 bg-stone-950/95 p-2 lg:flex">
              <button
                type="button"
                onClick={toggleCollapsed}
                className="flex items-center gap-1 whitespace-nowrap rounded border border-stone-700 px-2.5 py-1.5 text-xs text-stone-300 transition hover:border-ember hover:text-ember"
                aria-label="Развернуть меню"
                title="Развернуть меню"
              >
                ▸ Меню
              </button>
            </aside>
          ) : (
            <aside className="hidden w-[16.75rem] shrink-0 flex-col self-start border-r border-stone-800 bg-stone-950/95 p-3 lg:sticky lg:top-16 lg:flex lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
              <div className="mb-2 flex items-center justify-between border-b border-stone-800 pb-2 pl-1">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  <span aria-hidden className="mr-1.5 text-[0.7em] text-ember/70">✦</span>
                  Меню
                </span>
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
              <nav className="flex flex-col gap-0.5">
                <SidebarLink to="/" end label="Главная" onClick={close} />

                <SectionTitle>Справочники</SectionTitle>
                {catalogLinks.map((l) => (
                  <SidebarLink key={l.to} to={l.to} end={l.to === '/catalog/races'} label={l.label} onClick={close} />
                ))}

                {authenticated && (
                  <>
                    <SectionTitle>Личное</SectionTitle>
                    <SidebarLink to="/profile" label="Профиль" onClick={close} />
                    <SidebarLink to="/characters" label="Персонажи" onClick={close} />
                  </>
                )}

                {authenticated && isGM && (
                  <>
                    <SectionTitle>ГМ</SectionTitle>
                    <SidebarLink to="/gm/editor" label="Редактор справочников" onClick={close} />
                    <SidebarLink to="/users" label="Пользователи" onClick={close} />
                  </>
                )}
              </nav>
            </aside>
          )}

          <div className="flex min-w-0 flex-1 flex-col">
            <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-7">
              <Outlet />
            </main>
          </div>
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 lg:hidden" onClick={close}>
            <aside className="flex h-full w-[16.75rem] flex-col border-r border-stone-800 bg-stone-950 p-3" onClick={(e) => e.stopPropagation()}>
              <div className="mb-2 flex items-center justify-between border-b border-stone-800 pb-2">
                <span className="text-sm font-semibold text-stone-100">Меню</span>
                <button
                  type="button"
                  onClick={close}
                  className="rounded px-2 text-sm text-stone-400 hover:text-stone-100"
                >
                  ✕
                </button>
              </div>
              <nav className="flex flex-col gap-0.5">
                <SidebarLink to="/" end label="Главная" onClick={close} />

                <SectionTitle>Справочники</SectionTitle>
                {catalogLinks.map((l) => (
                  <SidebarLink key={l.to} to={l.to} end={l.to === '/catalog/races'} label={l.label} onClick={close} />
                ))}

                {authenticated && (
                  <>
                    <SectionTitle>Личное</SectionTitle>
                    <SidebarLink to="/profile" label="Мой профиль" onClick={close} />
                    <SidebarLink to="/characters" label="Мои персонажи" onClick={close} />
                  </>
                )}

                {authenticated && isGM && (
                  <>
                    <SectionTitle>ГМ</SectionTitle>
                    <SidebarLink to="/gm/editor" label="Редактор справочников" onClick={close} />
                    <SidebarLink to="/users" label="Пользователи" onClick={close} />
                  </>
                )}
              </nav>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
