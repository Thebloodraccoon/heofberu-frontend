import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { catalog } from '../catalog.js'
import { abilityLabels, diceTypeLabels, fieldLabel, label, ruLevel } from '../labels.js'
import { Badge, Card, EmptyState, ErrorBox, PageHeader, Spinner } from '../components/ui.jsx'
import ClassDetailCard from '../components/ClassDetailCard.jsx'

const skipFields = new Set(['id', 'created_by_id', 'updated_at', 'image_path', 'description', 'higher_levels'])

function spellLevel(value) {
  if (!value) return ''
  if (value === 'CANTRIP') return 'Заговор'
  const num = value.split('_')[1]
  return num ? `${num} уровень` : value
}

function renderValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
  if (Array.isArray(value)) {
    if (value.length === 0) return '—'
    const names = value.map((item) => {
      if (item && typeof item === 'object') return item.name ?? item.spell_level ?? item.ability ?? label(item)
      return label(item)
    })
    return names.join(', ')
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([k, v]) => `${fieldLabel(k)}: ${renderValue(v)}`)
      .join('; ')
  }
  return label(value)
}

function summaryBadges(item) {
  const badges = []
  if (item.level) badges.push({ text: spellLevel(item.level), tone: 'accent' })
  if (item.school) badges.push({ text: label(item.school), tone: 'default' })
  if (item.rarity && item.rarity !== 'NONE') badges.push({ text: label(item.rarity), tone: 'default' })
  if (item.item_type) badges.push({ text: label(item.item_type), tone: 'default' })
  if (item.size) badges.push({ text: label(item.size), tone: 'default' })
  if (item.hit_dice) badges.push({ text: `Кость хитов ${diceTypeLabels[item.hit_dice] ?? item.hit_dice}`, tone: 'default' })
  if (item.source_type) badges.push({ text: label(item.source_type), tone: 'default' })
  if (item.ability) badges.push({ text: label(item.ability), tone: 'default' })
  return badges
}

function filterLabel(field, value) {
  if (field === 'level') return spellLevel(value)
  return label(value)
}

function FilterModal({ fields, options, value, onChange, onClose }) {
  const toggle = (field, v) => {
    const cur = value[field] ?? []
    onChange({ ...value, [field]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4" onClick={onClose}>
      <div
        className="mx-auto mt-8 w-full max-w-md rounded-lg bg-stone-900 p-5 shadow-2xl ring-1 ring-stone-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-100">Фильтр</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-stone-700 px-2 py-1 text-sm text-stone-300 transition hover:bg-stone-800"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          {fields.length === 0 && <p className="text-sm text-stone-500">Фильтров нет</p>}
          {fields.map((field) => (
            <section key={field}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
                {fieldLabel(field)}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(options[field] ?? []).map((v) => {
                  const active = (value[field] ?? []).includes(v)
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => toggle(field, v)}
                      className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                        active ? 'bg-ember text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                      }`}
                    >
                      {filterLabel(field, v)}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-stone-500">Фильтры применяются автоматически!</p>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mt-6 border-t border-stone-700/70 pt-4">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">{title}</h2>
      {children}
    </div>
  )
}

function FeatureCards({ features }) {
  if (!features || features.length === 0) {
    return <p className="text-sm text-stone-500">Особенностей не указано</p>
  }
  return (
    <ul className="space-y-3">
      {features.map((f) => (
        <li key={f.id} className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-stone-100">{f.name}</p>
            {f.level != null && <Badge tone="accent">{ruLevel(f.level)}</Badge>}
            {f.is_homebrew && <Badge>Homebrew</Badge>}
          </div>
          {f.description && <p className="mt-1 text-sm leading-relaxed text-stone-300">{f.description}</p>}
        </li>
      ))}
    </ul>
  )
}

function RaceDetailCard({ race }) {
  return (
    <Card className="p-6">
      <div className="mb-3 flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-2xl font-bold text-stone-100">{race.name}</h1>
        {race.is_homebrew && <Badge tone="accent">Homebrew</Badge>}
      </div>

      <div className="mb-6 flex flex-wrap justify-center gap-1.5">
        <Badge>Размер: {label(race.size)}</Badge>
        <Badge>Скорость: {race.speed} фт.</Badge>
      </div>

      {race.description && (
        <p className="border-l-2 border-ember/50 pl-4 text-base leading-relaxed text-stone-200">
          {race.description}
        </p>
      )}

      {race.ability_bonuses && race.ability_bonuses.length > 0 && (
        <Section title="Бонусы характеристик">
          <div className="flex flex-wrap gap-1.5">
            {race.ability_bonuses.map((b, i) => (
              <span key={i} className="rounded bg-stone-800 px-2.5 py-1 text-xs text-stone-200">
                {abilityLabels[b.ability] ?? b.ability} +{b.bonus}
              </span>
            ))}
          </div>
        </Section>
      )}

      {race.granted_skills && race.granted_skills.length > 0 && (
        <Section title="Навыки расы">
          <div className="flex flex-wrap gap-1.5">
            {race.granted_skills.map((s) => (
              <Badge key={s.id}>{s.name}</Badge>
            ))}
          </div>
        </Section>
      )}

      <Section title="Расовые особенности">
        <FeatureCards features={race.features} />
      </Section>
    </Card>
  )
}

function GenericDetail({ item }) {
  const rows = Object.entries(item).filter(([k]) => !skipFields.has(k) && !k.endsWith('_id'))

  return (
    <Card className="p-6">
      <div className="mb-3 flex flex-col items-center gap-3 text-center">
        <h1 className="font-display text-2xl font-bold text-stone-100">{item.name}</h1>
        {item.is_homebrew && <Badge tone="accent">Homebrew</Badge>}
      </div>
      <div className="mb-6 flex flex-wrap justify-center gap-1.5">
        {summaryBadges(item).map((b, i) => (
          <Badge key={i} tone={b.tone}>{b.text}</Badge>
        ))}
      </div>

      {item.description && (
        <p className="mb-6 border-l-2 border-ember/50 pl-4 text-base leading-relaxed text-stone-200">
          {item.description}
        </p>
      )}

      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {rows.map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
              {fieldLabel(key)}
            </dt>
            <dd className="mt-0.5 text-sm text-stone-200">{renderValue(value)}</dd>
          </div>
        ))}
      </dl>

      {item.higher_levels && (
        <div className="mt-6 border-t border-stone-700/70 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            На более высоких уровнях
          </p>
          <p className="mt-0.5 text-sm text-stone-300">{item.higher_levels}</p>
        </div>
      )}
    </Card>
  )
}

function TileCard({ item, resource }) {
  return (
    <Link
      to={`/catalog/${resource}/${item.id}`}
      className="group fantasy-panel rounded-lg p-5 transition hover:border-ember/70"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-base font-bold text-stone-100 group-hover:text-ember">
          {item.name}
        </p>
        {item.is_homebrew && <Badge tone="accent">Homebrew</Badge>}
      </div>
      {item.description && (
        <p className="mt-2 line-clamp-2 text-sm text-stone-400">{item.description}</p>
      )}
      {summaryBadges(item).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {summaryBadges(item).map((b, i) => (
            <Badge key={i} tone={b.tone}>{b.text}</Badge>
          ))}
        </div>
      )}
    </Link>
  )
}

function DetailPanel({ resource, item }) {
  if (resource === 'races') return <RaceDetailCard race={item} />
  if (resource === 'classes') return <ClassDetailCard cls={item} />
  return <GenericDetail item={item} />
}

export function CatalogListPage() {
  const { resource, id } = useParams()
  const navigate = useNavigate()
  const cfg = catalog[resource]
  const filterFields = useMemo(() => cfg.filters ?? [], [cfg])

  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({})
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    let active = true
    const run = async () => {
      try {
        const page = await cfg.api.list({ size: 100 })
        if (!active) return
        setError(null)
        setItems(page.items ?? [])
      } catch (e) {
        if (active) setError(e)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [cfg, reloadKey])

  const filterOptions = useMemo(() => {
    if (!items) return {}
    const opts = {}
    for (const field of filterFields) {
      const values = new Set()
      for (const it of items) {
        const v = it[field]
        if (v != null && v !== '') values.add(String(v))
      }
      opts[field] = Array.from(values).sort()
    }
    return opts
  }, [items, filterFields])

  const filtered = useMemo(() => {
    if (!items) return null
    return items.filter((it) => {
      for (const field of filterFields) {
        const sel = filters[field]
        if (sel && sel.length > 0 && !sel.includes(String(it[field]))) return false
      }
      const q = query.trim().toLowerCase()
      if (!q) return true
      return Object.values(it)
        .filter((v) => typeof v === 'string')
        .some((v) => v.toLowerCase().includes(q))
    })
  }, [items, filters, query, filterFields])

  const selectedId = id ? Number(id) : null
  const selected = selectedId ? (items ?? []).find((it) => Number(it.id) === selectedId) ?? null : null

  const activeCount = Object.values(filters).reduce((n, arr) => n + (arr?.length ?? 0), 0)

  return (
    <div>
      <PageHeader
        title={cfg.label}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск: имя, описание..."
              className="w-full rounded border border-stone-700 bg-stone-800/70 px-4 py-2.5 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-ember sm:w-64"
            />
            {filterFields.length > 0 && (
              <button
                type="button"
                onClick={() => setShowFilters(true)}
                className="shrink-0 rounded border border-stone-700 bg-stone-800/70 px-4 py-2.5 text-sm font-medium text-stone-200 transition hover:bg-stone-800"
              >
                Фильтр{activeCount > 0 ? ` (${activeCount})` : ''}
              </button>
            )}
          </div>
        }
      />

      {error && <ErrorBox error={error} onRetry={() => setReloadKey((k) => k + 1)} />}
      {!error && !items && <Spinner />}
      {!error && items && items.length === 0 && (
        <EmptyState text="Справочник пуст. Попросите ГМ наполнить его через npm run seed" />
      )}
      {!error && items && items.length > 0 && filtered.length === 0 && (
        <EmptyState text="Ничего не найдено по запросу" />
      )}

      {!error && filtered && filtered.length > 0 && (
        selectedId ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
            <aside className="max-h-[calc(100vh-220px)] overflow-y-auto pr-1 lg:sticky lg:top-24">
              <Link
                to={`/catalog/${resource}`}
                className="mb-2 block text-xs text-ember hover:underline"
              >
                ← Все записи плитками
              </Link>
              <div className="flex flex-col gap-2">
                {filtered.map((it) => {
                  const isActive = Number(it.id) === selectedId
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => navigate(`/catalog/${resource}/${it.id}`)}
                      className={`w-full text-left fantasy-panel rounded-lg p-4 transition ${
                        isActive ? 'border-ember/80 bg-stone-900' : 'hover:border-ember/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-display text-sm font-bold ${isActive ? 'text-ember' : 'text-stone-100'}`}>
                          {it.name}
                        </p>
                        {it.is_homebrew && <Badge tone="accent">Homebrew</Badge>}
                      </div>
                      {it.description && (
                        <p className="mt-1.5 line-clamp-2 text-xs text-stone-400">{it.description}</p>
                      )}
                      {summaryBadges(it).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {summaryBadges(it).map((b, i) => (
                            <Badge key={i} tone={b.tone}>{b.text}</Badge>
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </aside>

            <section className="min-w-0">
              {selected ? (
                <DetailPanel
                  key={`${resource}-${selectedId}`}
                  resource={resource}
                  item={selected}
                />
              ) : (
                <Card className="p-10 text-center">
                  <p className="text-sm text-stone-500">Запись не найдена</p>
                </Card>
              )}
            </section>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((it) => (
              <TileCard key={it.id} item={it} resource={resource} />
            ))}
          </div>
        )
      )}

      {showFilters && (
        <FilterModal
          fields={filterFields}
          options={filterOptions}
          value={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  )
}
