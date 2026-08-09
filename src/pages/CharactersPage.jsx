import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/endpoints.js'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBox,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
} from '../components/ui.jsx'

const stats = [
  ['strength', 'Сила'],
  ['dexterity', 'Ловкость'],
  ['constitution', 'Телосложение'],
  ['intelligence', 'Интеллект'],
  ['wisdom', 'Мудрость'],
  ['charisma', 'Харизма'],
]

export default function CharactersPage() {
  const [characters, setCharacters] = useState(null)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const [races, setRaces] = useState([])
  const [classes, setClasses] = useState([])
  const [backgrounds, setBackgrounds] = useState([])

  const [form, setForm] = useState({
    name: '',
    class_id: '',
    race_id: '',
    background_id: '',
    level: 1,
    max_hp: 10,
    current_hp: 10,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  })
  const [saving, setSaving] = useState(false)

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

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        name: form.name,
        class_id: Number(form.class_id),
        level: Number(form.level) || 1,
        max_hp: Number(form.max_hp) || 0,
        current_hp: Number(form.current_hp) || 0,
      }
      for (const [k] of stats) body[k] = Number(form[k]) || 10
      if (form.race_id) body.race_id = Number(form.race_id)
      if (form.background_id) body.background_id = Number(form.background_id)
      await api.characters.create(body)
      setForm((f) => ({ ...f, name: '' }))
      setShowCreate(false)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Персонажи"
        subtitle="Ваши герои и их состояния"
        actions={
          <Button onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? 'Отмена' : '+ Новый персонаж'}
          </Button>
        }
      />

      {showCreate && (
        <Card className="mb-6 p-5">
          <h2 className="mb-4 text-base font-semibold text-stone-100">Создать персонажа</h2>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Имя *">
              <Input required value={form.name} onChange={set('name')} />
            </Field>
            <Field label="Класс *">
              <Select required value={form.class_id} onChange={set('class_id')}>
                <option value="">Выберите класс</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Раса">
              <Select value={form.race_id} onChange={set('race_id')}>
                <option value="">Без расы</option>
                {races.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Предыстория">
              <Select value={form.background_id} onChange={set('background_id')}>
                <option value="">Без предыстории</option>
                {backgrounds.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Уровень">
              <Input type="number" min="1" value={form.level} onChange={set('level')} />
            </Field>
            <Field label="Макс. HP">
              <Input type="number" min="0" value={form.max_hp} onChange={set('max_hp')} />
            </Field>
            {stats.map(([key, label]) => (
              <Field key={key} label={label}>
                <Input type="number" min="1" value={form[key]} onChange={set(key)} />
              </Field>
            ))}
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={saving}>
                {saving ? 'Создаём...' : 'Создать'}
              </Button>
            </div>
          </form>
        </Card>
      )}

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
            return (
              <Link
                key={c.id}
                to={`/characters/${c.id}`}
                className="group fantasy-panel rounded-lg p-4 transition hover:border-ember/70"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display font-semibold text-stone-100 group-hover:text-ember">{c.name}</p>
                  <Badge tone="accent">Ур. {c.level}</Badge>
                </div>
                <p className="mt-1 text-sm text-stone-400">
                  {[cls?.name, race?.name, bg?.name].filter(Boolean).join(' · ') || 'Без класса'}
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
