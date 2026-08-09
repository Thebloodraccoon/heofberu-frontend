import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/endpoints.js'
import { useAuth } from '../context/AuthContext.jsx'
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  PageHeader,
  Spinner,
  TextArea,
} from '../components/ui.jsx'

export default function ProfilePage() {
  const { user, isGM, isFounder, loadUser } = useAuth()
  const [charCount, setCharCount] = useState(null)
  const [userCount, setUserCount] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    loadUser()
    if (!isGM) {
      api.characters
        .list({ size: 1 })
        .then((p) => {
          if (active) setCharCount(p.total ?? p.items?.length ?? 0)
        })
        .catch(() => {})
    } else {
      api.users
        .list({ size: 1 })
        .then((p) => {
          if (active) setUserCount(p.total ?? p.items?.length ?? 0)
        })
        .catch((e) => {
          if (active) setError(e)
        })
    }
    return () => {
      active = false
    }
  }, [loadUser, isGM])

  if (!user) return <Spinner />

  const initials = (user.username || 'U').slice(0, 2).toUpperCase()
  const roleLabel = isFounder ? 'Основатель' : isGM ? 'Гейм-мастер' : 'Игрок'
  const roleTone = isFounder ? 'good' : isGM ? 'accent' : 'default'

  return (
    <div className="max-w-4xl">
      <PageHeader title="Профиль" subtitle="Учётная запись и личный кабинет" />

      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-5">
          <span className="flex size-16 items-center justify-center rounded-full border-2 border-stone-600 bg-stone-900 font-display text-2xl font-black text-stone-100 shadow-[inset_0_0_0_2px_rgba(0,0,0,0.35)]">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-stone-100">{user.username}</h2>
              <Badge tone={roleTone}>{roleLabel}</Badge>
            </div>
            <p className="mt-1 text-sm text-stone-400">{user.email || 'email не указан'}</p>
            {user.created_at && (
              <p className="mt-1 text-xs text-stone-500">
                Регистрация: {new Date(user.created_at).toLocaleDateString('ru-RU')}
              </p>
            )}
          </div>
        </div>
        {(user.bio || user.location || user.contact) && (
          <div className="mt-5 space-y-2 border-t border-stone-800 pt-4 text-sm">
            {user.bio && <p className="whitespace-pre-wrap text-stone-300">{user.bio}</p>}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-stone-400">
              {user.location && <span>📍 {user.location}</span>}
              {user.contact && <span>✉ {user.contact}</span>}
            </div>
          </div>
        )}
      </Card>

      {error && <div className="mt-5"><ErrorBox error={error} /></div>}

      <div className="mt-6">
        <ProfileForm user={user} onSaved={loadUser} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {isGM ? (
          <GmPanel userCount={userCount} />
        ) : (
          <PlayerPanel charCount={charCount} />
        )}
      </div>
    </div>
  )
}

function ProfileForm({ user, onSaved }) {
  const [form, setForm] = useState({
    username: user.username || '',
    email: user.email || '',
    bio: user.bio || '',
    contact: user.contact || '',
    location: user.location || '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [prevUser, setPrevUser] = useState(user)

  if (user !== prevUser) {
    setPrevUser(user)
    setForm({
      username: user.username || '',
      email: user.email || '',
      bio: user.bio || '',
      contact: user.contact || '',
      location: user.location || '',
    })
  }

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value })
    setSaved(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setBusy(true)
    try {
      await api.users.updateMe(form)
      setSaved(true)
      onSaved()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-6">
      <h3 className="font-display text-lg font-bold text-stone-100">Личный кабинет</h3>
      <p className="mt-1 text-sm text-stone-400">
        Расскажите о себе и укажите контакты — эти данные отображаются в вашем профиле.
      </p>

      {error && <div className="mt-4"><ErrorBox error={error} /></div>}
      {saved && (
        <p className="mt-4 rounded border border-emerald-800/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
          Изменения сохранены
        </p>
      )}

      <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Имя пользователя">
            <Input required value={form.username} onChange={set('username')} />
          </Field>
          <Field label="Email">
            <Input type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Местоположение">
            <Input value={form.location} onChange={set('location')} placeholder="Например, Москва" />
          </Field>
          <Field label="Контакт">
            <Input
              value={form.contact}
              onChange={set('contact')}
              placeholder="Telegram / Discord / ник"
            />
          </Field>
        </div>
        <Field label="О себе (био)">
          <TextArea
            rows={4}
            value={form.bio}
            onChange={set('bio')}
            placeholder="Коротко о себе и своих героях..."
          />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={busy}>
            {busy ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function PlayerPanel({ charCount }) {
  return (
    <Card className="p-5">
      <h3 className="text-base font-semibold text-stone-100">Панель игрока</h3>
      <p className="mt-1 text-sm text-stone-400">
        Вы можете создавать и вести своих персонажей, следить за их состоянием в бою и изучать справочники.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-stone-300">
        <li>
          <Link to="/characters" className="text-ember hover:underline">
            Мои персонажи
          </Link>
          {charCount != null && (
            <span className="ml-2 text-stone-500">({charCount})</span>
          )}
        </li>
        <li>
          <Link to="/catalog/spells" className="text-ember hover:underline">
            Справочник заклинаний
          </Link>{' '}
          — изучайте заклинания и добавляйте их персонажу
        </li>
        <li>
          <Link to="/catalog/items" className="text-ember hover:underline">
            Справочник предметов
          </Link>{' '}
          — соберите свой инвентарь
        </li>
      </ul>
    </Card>
  )
}

function GmPanel({ userCount }) {
  return (
    <>
      <Card className="p-5">
        <h3 className="text-base font-semibold text-stone-100">Панель гейм-мастера</h3>
        <p className="mt-1 text-sm text-stone-400">
          Вам доступно управление пользователями и наполнение справочников кампании.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-stone-300">
          <li>
            <Link to="/users" className="text-ember hover:underline">
              Управление пользователями
            </Link>
            {userCount != null && <span className="ml-2 text-stone-500">({userCount})</span>}
          </li>
          <li>
            <Link to="/characters" className="text-ember hover:underline">
              Персонажи
            </Link>{' '}
            — ведение героев кампании
          </li>
        </ul>
      </Card>

      <Card className="p-5">
        <h3 className="text-base font-semibold text-stone-100">Наполнение справочника</h3>
        <p className="mt-1 text-sm text-stone-400">
          Справочники можно наполнить дефолтным контентом D&D из репозитория:
        </p>
        <pre className="mt-3 overflow-x-auto rounded bg-stone-950 p-3 text-xs text-stone-300">
          npm run seed -- GM_EMAIL GM_PASSWORD
        </pre>
        <p className="mt-2 text-xs text-stone-500">
          Загружаются расы, классы, навыки, предыстории, черты, заклинания и предметы. Уже существующие записи пропускаются.
        </p>
      </Card>
    </>
  )
}
