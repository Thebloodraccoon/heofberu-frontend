import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { catalog } from '@/features/catalog/catalog.js'
import { useAuth } from '@/features/auth/useAuth.js'
import { useLatestArticles } from '@/features/articles/queries.js'
import { Skeleton } from '@/components/ui'
import ArticleRow from '@/features/articles/components/ArticleRow.jsx'
import { usePublicCampaignsPage } from '@/features/campaigns/queries.js'
import PresetNotice from '@/features/campaigns/components/PresetNotice.jsx'

const LATEST_LIMIT = 4
const CAMPAIGNS_LIMIT = 3

export default function LandingPage() {
  const { authenticated } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [campaignQuery, setCampaignQuery] = useState('')
  const latestQ = useLatestArticles({ limit: LATEST_LIMIT })
  const campaignsQ = usePublicCampaignsPage({ page: 1, size: CAMPAIGNS_LIMIT })
  const campaigns = campaignsQ.data?.items ?? []

  const submitSearch = (e) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/lore?q=${encodeURIComponent(q)}` : '/lore')
  }

  const submitCampaignSearch = (e) => {
    e.preventDefault()
    const q = campaignQuery.trim()
    navigate(q ? `/public-campaigns?q=${encodeURIComponent(q)}` : '/public-campaigns')
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

        <div className="ornate-rule mx-auto mt-6 max-w-[22rem]" />

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
        <div className="world-panel-copy">
          <p className="kicker">Историогенетическое фэнтези</p>
          <h3>Мир, порождённый собственной историей</h3>
          <p>
            Космология, магия, разумные виды, языки, религии, хозяйство и политические институты
            Хеофберу не заданы в готовом виде — они возникают, изменяются и исчезают под воздействием
            внутренних причин на протяжении многих эпох. Прошлое здесь не фон, а активная сила,
            определяющая устройство настоящего.
          </p>
        </div>
        <div className="world-panel-quote">
          <p className="quote">
            «Чем древнее традиция, тем менее она должна быть цельной и однозначной.»
            <small>Из руководства по миру</small>
          </p>
        </div>
        <div className="cta">
          <Link to="/guide" className="btn btn-outline-gold">
            Читать руководство →
          </Link>
        </div>
      </section>

      {/* LORE */}
      <section className="mt-12 sm:mt-14">
        <div className="text-center">
          <h2 className="heading-section">Лор</h2>
          <p className="subtitle mt-1">Статьи о мире Хеофберу — ищите или читайте последние записи</p>
          <div className="ornate-rule mx-auto mt-3 max-w-[22rem]" />
        </div>

        <form onSubmit={submitSearch} className="mx-auto mt-6 flex max-w-xl flex-wrap gap-2">
          <input
            className="input-base input-search min-w-[12rem] flex-1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по статьям…"
          />
          <button type="submit" className="btn btn-outline-gold">
            Искать
          </button>
          <Link to="/lore" className="btn btn-outline-gold">
            Все статьи →
          </Link>
        </form>

        <div className="mt-6">
          {latestQ.isLoading &&
            Array.from({ length: LATEST_LIMIT }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          {(latestQ.data ?? []).map((a) => (
            <ArticleRow key={a.id} article={a} heading="h3" />
          ))}
          {latestQ.data?.length === 0 && <p className="text-stone-500">Статей пока нет.</p>}
        </div>
      </section>

      {/* CAMPAIGNS */}
      <section className="mt-12 sm:mt-14">
        <div className="text-center">
          <h2 className="heading-section">Кампании</h2>
          <p className="subtitle mt-1">Готовые завязки приключений — выберите историю, а ГМ соберёт по ней свой стол</p>
          <div className="ornate-rule mx-auto mt-3 max-w-[22rem]" />
        </div>

        <form onSubmit={submitCampaignSearch} className="mx-auto mt-6 flex max-w-xl flex-wrap gap-2">
          <input
            className="input-base input-search min-w-[12rem] flex-1"
            value={campaignQuery}
            onChange={(e) => setCampaignQuery(e.target.value)}
            placeholder="Поиск по кампаниям…"
          />
          <button type="submit" className="btn btn-outline-gold">
            Искать
          </button>
          <Link to="/public-campaigns" className="btn btn-outline-gold">
            Все кампании →
          </Link>
        </form>

        {campaignsQ.isLoading && (
          <div className="adventure-board">
            {Array.from({ length: CAMPAIGNS_LIMIT }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        )}
        {campaigns.length > 0 && (
          <ul className="adventure-board">
            {campaigns.map((preset) => <PresetNotice key={preset.id} preset={preset} heading="h3" />)}
          </ul>
        )}
        {campaignsQ.data && campaigns.length === 0 && <p className="mt-6 text-stone-500">Кампаний пока нет.</p>}
      </section>

      {/* CATALOG */}
      <section className="mt-12 sm:mt-14">
        <div className="text-center">
          <h2 className="heading-section">Справочники</h2>
          <p className="subtitle mt-1">Своды знаний о мире Хеофберу — открыты каждому путнику</p>
          <div className="ornate-rule mx-auto mt-3 max-w-[22rem]" />
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
