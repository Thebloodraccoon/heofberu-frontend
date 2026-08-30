import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth.js'
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  PageHeader,
  Skeleton,
  SkeletonCard,
  SkeletonCircle,
  TextArea,
} from '@/components/ui'
import { useCharacterCount } from '@/features/characters/queries.js'
import { useUpdateMe, useUserCount } from '@/features/users/queries.js'

export default function ProfilePage() {
  const { user, isGM, isFounder, loadUser } = useAuth()
  const { data: charCount } = useCharacterCount(!isGM)
  const { data: userCount, error: countError } = useUserCount(isGM)

  useEffect(() => {
    loadUser()
  }, [loadUser])

  if (!user) {
    return (
      <div className="max-w-4xl space-y-6" aria-busy="true">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="fantasy-panel space-y-3 rounded-lg p-6">
          <div className="flex flex-wrap items-center gap-5">
            <SkeletonCircle size="size-16" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="fantasy-panel space-y-3 rounded-lg p-6">
          <Skeleton className="h-5 w-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-24 w-full" />
          <div className="flex justify-end">
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  const initials = (user.username || 'U').slice(0, 2).toUpperCase()
  const roleLabel = isFounder ? 'Основатель' : isGM ? 'Гейм-мастер' : 'Игрок'
  const roleTone = isFounder ? 'good' : isGM ? 'accent' : 'default'

  return (
    <div className="max-w-4xl">
      <PageHeader title="Профиль" subtitle="Учётная запись и личный кабинет" />

      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-5">
          <span className="avatar-lg">{initials}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="heading-card">{user.username}</h2>
              <Badge tone={roleTone}>{roleLabel}</Badge>
            </div>
            <p className="subtitle">{user.email || 'email не указан'}</p>
            {user.created_at && (
              <p className="text-muted mt-1 text-xs">
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

      {countError && <div className="mt-5"><ErrorBox error={countError} /></div>}

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
  const updateMe = useUpdateMe()
  const [form, setForm] = useState({
    username: user.username || '',
    email: user.email || '',
    bio: user.bio || '',
    contact: user.contact || '',
    location: user.location || '',
  })
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

  const submit = (e) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    updateMe.mutate(form, {
      onSuccess: () => {
        setSaved(true)
        onSaved()
      },
      onError: setError,
    })
  }

  return (
    <Card className="p-6">
      <h3 className="heading-card">Личный кабинет</h3>
      <p className="subtitle">
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
            <Input value={form.location} onChange={set('location')} placeholder="Например, Николаев" />
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
          <Button type="submit" disabled={updateMe.isPending}>
            {updateMe.isPending ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function PlayerPanel({ charCount }) {
  return (
    <Card className="p-5">
      <h3 className="heading-sub">Панель игрока</h3>
      <p className="subtitle">
        Вы можете создавать и вести своих персонажей, следить за их состоянием в бою и изучать справочники.
      </p>
      <ul className="mt-4 space-y-2 text-body">
        <li>
          <Link to="/characters" className="link-ember">
            Мои персонажи
          </Link>
          {charCount != null && (
            <span className="ml-2 text-muted">({charCount})</span>
          )}
        </li>
        <li>
          <Link to="/catalog/spells" className="link-ember">
            Справочник заклинаний
          </Link>{' '}
          — изучайте заклинания и добавляйте их персонажу
        </li>
        <li>
          <Link to="/catalog/items" className="link-ember">
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
        <h3 className="heading-sub">Панель гейм-мастера</h3>
        <p className="subtitle">
          Вам доступно управление пользователями и наполнение справочников кампании.
        </p>
        <ul className="mt-4 space-y-2 text-body">
          <li>
            <Link to="/users" className="link-ember">
              Управление пользователями
            </Link>
            {userCount != null && <span className="ml-2 text-muted">({userCount})</span>}
          </li>
          <li>
            <Link to="/characters" className="link-ember">
              Персонажи
            </Link>{' '}
            — ведение героев кампании
          </li>
        </ul>
      </Card>
    </>
  )
}
