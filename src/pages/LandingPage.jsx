import { Link } from 'react-router-dom'
import { catalog } from '../catalog.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function LandingPage() {
  const { authenticated } = useAuth()

  return (
    <div>
      <section className="py-6 text-center sm:py-10">
        <span className="mx-auto flex size-20 items-center justify-center rounded-full border-2 border-stone-600 bg-stone-900 font-display text-4xl font-black text-stone-100 shadow-[inset_0_0_0_2px_rgba(0,0,0,0.35)]">
          H
        </span>
        <h1 className="mt-6 font-display text-4xl font-bold tracking-wide text-stone-100">
          Heofberu
        </h1>
        <div className="ornate-rule mx-auto mt-4 max-w-md">
          <span aria-hidden className="text-sm">✦</span>
        </div>
        <p className="mx-auto mt-4 max-w-2xl text-stone-300">
          Летопись миров D&D: персонажи, расы, классы, заклинания и артефакты — всё в одном месте.
          Справочники открыты каждому путнику, а летописи персонажей — только их владельцам.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {authenticated ? (
            <>
              <Link
                to="/characters"
                className="rounded bg-ember px-5 py-2.5 text-sm font-medium text-white transition hover:bg-ember-dark"
              >
                Мои персонажи
              </Link>
              <Link
                to="/profile"
                className="rounded border border-stone-700 px-5 py-2.5 text-sm text-stone-300 transition hover:bg-stone-800"
              >
                Мой профиль
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/register"
                className="rounded bg-ember px-5 py-2.5 text-sm font-medium text-white transition hover:bg-ember-dark"
              >
                Начать путешествие
              </Link>
              <Link
                to="/login"
                className="rounded border border-stone-700 px-5 py-2.5 text-sm text-stone-300 transition hover:bg-stone-800"
              >
                Войти
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="mt-10 sm:mt-14">
        <h2 className="text-center font-display text-xl font-bold text-stone-100">Справочники</h2>
        <div className="ornate-rule mx-auto mt-3 max-w-md">
          <span aria-hidden className="text-sm">✦</span>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(catalog).map(([key, cfg]) => (
            <Link
              key={key}
              to={`/catalog/${key}`}
              className="group fantasy-panel rounded-lg p-6 transition hover:border-ember/70"
            >
              <span className="flex size-11 items-center justify-center rounded border border-stone-700 bg-stone-800/70 font-display text-lg font-bold text-ember">
                {cfg.icon}
              </span>
              <p className="mt-3 font-display text-lg font-bold text-stone-100 group-hover:text-ember">
                {cfg.label}
              </p>
              <p className="mt-1 text-sm text-stone-400">{cfg.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
