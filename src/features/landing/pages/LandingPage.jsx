import { Link } from 'react-router-dom'
import { catalog } from '@/features/catalog/catalog.js'
import { useAuth } from '@/features/auth/useAuth.js'

export default function LandingPage() {
  const { authenticated } = useAuth()

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
