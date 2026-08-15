import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/endpoints.js'
import {
  Badge,
  Button,
  EmptyState,
  ErrorBox,
  PageHeader,
  Spinner,
} from '../components/ui.jsx'

export default function CharactersPage() {
  const navigate = useNavigate()
  const [characters, setCharacters] = useState(null)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [races, setRaces] = useState([])
  const [classes, setClasses] = useState([])
  const [backgrounds, setBackgrounds] = useState([])

  useEffect(() => {
    let active = true
    const run = async () => {
      try {
        const page = await api.characters.list({ size: 100 })
        if (!active) return
        setError(null)
        setCharacters(page.items ?? [])
      } catch (e) {
        if (active) setError(e)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [reloadKey])

  useEffect(() => {
    let active = true
    api.races.list({ size: 100 }).then((p) => { if (active) setRaces(p.items ?? []) }).catch(() => {})
    api.classes.list({ size: 100 }).then((p) => { if (active) setClasses(p.items ?? []) }).catch(() => {})
    api.backgrounds.list({ size: 100 }).then((p) => { if (active) setBackgrounds(p.items ?? []) }).catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return (
    <div>
      <PageHeader
        title="Персонажи"
        subtitle="Ваши герои и их состояния"
        actions={<Button onClick={() => navigate('/characters/new')}>+ Новый персонаж</Button>}
      />

      {error && <ErrorBox error={error} onRetry={() => setReloadKey((k) => k + 1)} />}
      {!error && !characters && <Spinner />}
      {!error && characters && characters.length === 0 && (
        <EmptyState text="Персонажей пока нет — создайте первого" />
      )}
      {characters && characters.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((c) => {
            const cls = classes.find((x) => x.id === c.class_id)
            const race = races.find((x) => x.id === c.race_id)
            const bg = backgrounds.find((x) => x.id === c.background_id)
            const subcls = cls?.subclasses?.find((x) => String(x.id) === String(c.subclass_id))
            return (
              <Link
                key={c.id}
                to={`/characters/${c.id}`}
                className="group card-hover fantasy-panel rounded-lg p-4 transition hover:border-ember/70"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display font-semibold text-stone-100 group-hover:text-ember">{c.name}</p>
                  <Badge tone="accent">Ур. {c.level}</Badge>
                </div>
                <p className="mt-1 text-sm text-stone-400">
                  {[cls?.name, subcls?.name, race?.name, bg?.name].filter(Boolean).join(' · ') || 'Без класса'}
                </p>
                <p className="mt-3 text-sm">
                  <span className="text-stone-400">HP </span>
                  <span className="font-semibold text-stone-200">
                    {c.current_hp} / {c.max_hp}
                  </span>
                  {c.temp_hp > 0 && <span className="ml-1 text-emerald-300">(+{c.temp_hp})</span>}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
