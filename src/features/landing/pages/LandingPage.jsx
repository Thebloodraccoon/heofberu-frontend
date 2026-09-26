import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { catalog } from '@/features/catalog/catalog.js'
import { useAuth } from '@/features/auth/useAuth.js'
import { articlePath } from '@/features/articles/api.js'
import { useLatestArticles } from '@/features/articles/queries.js'
import { Badge, Skeleton } from '@/components/ui'
import { articleTypeLabels } from '@/lib/i18n'

const LATEST_LIMIT = 4

export default function LandingPage() {
  const { authenticated } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const latestQ = useLatestArticles({ limit: LATEST_LIMIT }, { enabled: authenticated })

  const submitSearch = (e) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/lore?q=${encodeURIComponent(q)}` : '/lore')
  }

  return (
    <div>
      {/* HERO */}
      <section className="hero">
        <div className="hero-emblem">
          <img src="/logo-intro.png" alt="Эмблема Heofberu" />
        </div>

        <h1 className="heading-hero">Heofberu</h1>
        <p className="hero-eyebrow">Mater Caeli · Uterus Mundi</p>

        <div className="ornate-rule mx-auto mt-6 max-w-[22rem]">
          <span aria-hidden className="text-sm">✦</span>
        </div>

        <p className="text-body mx-auto mt-5 max-w-xl">
          Хеофберу — мир, порождённый собственной историей: расы, классы, заклинания и артефакты,
          рождённые из космогонии, катастроф и памяти минувших эпох. Своды знаний открыты каждому
          путнику, а летописи персонажей — только их владельцам.
        </p>

        <div className="hero-actions">
          {authenticated ? (
            <>
              <Link to="/characters" className="btn btn-primary">
                Мои персонажи
              </Link>
              <Link to="/profile" className="btn btn-outline">
                Мой профиль
              </Link>
            </>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary">
                Начать путешествие
              </Link>
              <Link to="/login" className="btn btn-outline">
                Войти
              </Link>
            </>
          )}
        </div>
      </section>

      {/* WORLD TEASER */}
      <section className="world-panel mt-12 sm:mt-14">
        <div>
          <p className="kicker">Историогенетическое фэнтези</p>
          <h3>Мир, порождённый собственной историей</h3>
          <p>
            Космология, магия, разумные виды, языки, религии, хозяйство и политические институты
            Хеофберу не заданы в готовом виде — они возникают, изменяются и исчезают под воздействием
            внутренних причин на протяжении многих эпох. Прошлое здесь не фон, а активная сила,
            определяющая устройство настоящего.
          </p>
          <div className="cta">
            <Link to="/guide" className="btn btn-outline-gold">
              Читать руководство →
            </Link>
          </div>
        </div>
        <div>
          <p className="quote">
            «Чем древнее традиция, тем менее она должна быть цельной и однозначной.»
            <small>Из руководства по миру</small>
          </p>
        </div>
      </section>

      {/* LORE */}
      {authenticated && (
        <section className="mt-12 sm:mt-14">
          <div className="text-center">
            <h2 className="heading-section">Лор</h2>
            <p className="subtitle mt-1">Статьи о мире Хеофберу — ищите или читайте последние записи</p>
            <div className="ornate-rule mx-auto mt-3 max-w-[22rem]">
              <span aria-hidden className="text-sm">✦</span>
            </div>
          </div>

          <form onSubmit={submitSearch} className="mx-auto mt-6 flex max-w-lg gap-2">
            <input
              className="input-base input-search flex-1"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по статьям…"
            />
            <button type="submit" className="btn btn-outline-gold">
              Искать
            </button>
          </form>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {latestQ.isLoading &&
              Array.from({ length: LATEST_LIMIT }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            {(latestQ.data ?? []).map((a) => (
              <Link
                key={a.id}
                to={articlePath(a)}
                className="block rounded-lg border border-stone-800 bg-stone-900/60 p-4 transition hover:border-ember/60 hover:bg-stone-900"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium text-stone-100">{a.title}</h3>
                  <Badge>{articleTypeLabels[a.article_type] ?? a.article_type}</Badge>
                </div>
                {a.excerpt && <p className="mt-1.5 line-clamp-2 text-sm text-stone-400">{a.excerpt}</p>}
              </Link>
            ))}
            {latestQ.data?.length === 0 && <p className="text-stone-500">Статей пока нет.</p>}
          </div>

          <div className="cta mt-6 text-center">
            <Link to="/lore" className="btn btn-outline-gold">
              Все статьи →
            </Link>
          </div>
        </section>
      )}

      {/* CATALOG */}
      <section className="mt-12 sm:mt-14">
        <div className="text-center">
          <h2 className="heading-section">Справочники</h2>
          <p className="subtitle mt-1">Своды знаний о мире Хеофберу — открыты каждому путнику</p>
          <div className="ornate-rule mx-auto mt-3 max-w-[22rem]">
            <span aria-hidden className="text-sm">✦</span>
          </div>
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
