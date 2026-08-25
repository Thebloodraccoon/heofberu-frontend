import { Link } from 'react-router-dom'
import { catalog } from '@/features/catalog/catalog.js'
import { useAuth } from '@/features/auth/useAuth.js'

export default function LandingPage() {
  const { authenticated } = useAuth()

  return (
    <div>
      <section className="py-6 text-center sm:py-10">
        <span className="avatar-hero">H</span>
        <h1 className="mt-6 heading-hero">
          Heofberu
        </h1>
        <div className="ornate-rule mx-auto mt-4 max-w-md">
          <span aria-hidden className="text-sm">✦</span>
        </div>
        <p className="mx-auto mt-4 max-w-2xl text-body">
          Летопись миров D&D: персонажи, расы, классы, заклинания и артефакты — всё в одном месте.
          Справочники открыты каждому путнику, а летописи персонажей — только их владельцам.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            to="/guide"
            className="rounded border border-gold/40 px-5 py-2.5 text-sm font-medium text-gold-light transition hover:bg-stone-800"
          >
            Руководство по миру
          </Link>
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
        <h2 className="text-center heading-section">Справочники</h2>
        <div className="ornate-rule mx-auto mt-3 max-w-md">
          <span aria-hidden className="text-sm">✦</span>
        </div>
        <div className="catalog-grid mt-8">
          {Object.entries(catalog).map(([key, cfg]) => (
            <Link
              key={key}
              to={`/catalog/${key}`}
              className="catalog-tile"
            >
              <span className="catalog-tile-icon">
                {cfg.icon}
              </span>
              <p className="catalog-tile-title">
                {cfg.label}
              </p>
              <p className="catalog-tile-desc">{cfg.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
