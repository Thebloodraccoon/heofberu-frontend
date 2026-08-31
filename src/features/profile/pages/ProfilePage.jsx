import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth.js'
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  Input,
  PageHeader,
  Skeleton,
  SkeletonCard,
  TextArea,
} from '@/components/ui'
import { useUpdateMe, useUserCount } from '@/features/users/queries.js'

export default function ProfilePage() {
  const { user, isGM, isFounder, loadUser } = useAuth()
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
        <SkeletonCard className="min-h-[16rem]" />
        <SkeletonCard className="min-h-[12rem]" />
        {isGM && <SkeletonCard className="min-h-[8rem]" />}
      </div>
    )
  }

  const roleLabel = isFounder ? 'Основатель' : isGM ? 'Гейм-мастер' : 'Игрок'
  const roleTone = isFounder ? 'good' : isGM ? 'accent' : 'default'

  return (
    <div className="max-w-4xl">
      <PageHeader title="Профиль" subtitle="Учётная запись и личный кабинет" />

      {countError && <div className="mb-5"><ErrorBox error={countError} /></div>}

      <ProfileCard user={user} roleLabel={roleLabel} roleTone={roleTone} onSaved={loadUser} />

      {isGM && (
        <div className="mt-6">
          <GmPanel userCount={userCount} />
        </div>
      )}
    </div>
  )
}

function ProfileCard({ user, roleLabel, roleTone, onSaved }) {
  const updateMe = useUpdateMe()
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState(() => fromUser(user))
  const [error, setError] = useState(null)

  // Когда извне (после loadUser) приходит обновлённый пользователь, а мы не в
  // режиме редактирования — пересинхронизируем форму.
  const [src, setSrc] = useState(user)
  if (user !== src) {
    setSrc(user)
    if (!edit) setForm(fromUser(user))
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const startEdit = () => {
    setForm(fromUser(user))
    setError(null)
    setEdit(true)
  }

  const cancel = () => {
    setForm(fromUser(user))
    setError(null)
    setEdit(false)
  }

  const save = () => {
    setError(null)
    updateMe.mutate(form, {
      onSuccess: () => {
        setEdit(false)
        onSaved()
      },
      onError: setError,
    })
  }

  const initials = (user.username || 'U').slice(0, 2).toUpperCase()

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-5">
          <span className="avatar-lg">{initials}</span>
          <div className="min-w-0">
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

        <div className="flex shrink-0 gap-2">
          {edit ? (
            <>
              <Button variant="ghost" size="sm" onClick={cancel} disabled={updateMe.isPending}>
                Отмена
              </Button>
              <Button size="sm" onClick={save} disabled={updateMe.isPending}>
                {updateMe.isPending ? 'Сохраняем…' : 'Сохранить'}
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={startEdit}>
              ✎ Редактировать
            </Button>
          )}
        </div>
      </div>

      {error && <div className="mt-4"><ErrorBox error={error} /></div>}
      {!error && updateMe.isSuccess && !edit && (
        <p className="mt-4 rounded border border-emerald-800/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
          Изменения сохранены
        </p>
      )}

      <div className="mt-6 space-y-6">
        <section>
          <h3 className="heading-sub">О себе</h3>
          {edit ? (
            <div className="mt-3">
              <TextArea
                rows={4}
                value={form.bio}
                onChange={set('bio')}
                placeholder="Коротко о себе и своих героях..."
              />
            </div>
          ) : (
            <p className="mt-2 whitespace-pre-wrap text-body">
              {user.bio || <span className="text-muted">Пока не заполнено</span>}
            </p>
          )}
        </section>

        <section>
          <h3 className="heading-sub">Контакты</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <DetailField label="Телефон">
              {EditOr(
                edit,
                <Input value={form.phone} onChange={set('phone')} placeholder="+380 90 000-00-00" />,
                <ReadonlyBox value={user.phone} placeholder="не указано" />,
              )}
            </DetailField>
            <DetailField label="Discord">
              {EditOr(
                edit,
                <Input value={form.discord} onChange={set('discord')} placeholder="username#0000" />,
                <ReadonlyBox value={user.discord} placeholder="не указано" />,
              )}
            </DetailField>
            <DetailField label="Telegram">
              {EditOr(
                edit,
                <Input value={form.telegram} onChange={set('telegram')} placeholder="@username" />,
                <ReadonlyBox value={user.telegram} placeholder="не указано" />,
              )}
            </DetailField>
          </div>
        </section>
      </div>
    </Card>
  )
}

function EditOr(edit, editNode, viewNode) {
  return edit ? editNode : viewNode
}

function DetailField({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-label">{label}</span>
      {children}
    </label>
  )
}

function ReadonlyBox({ value, placeholder }) {
  return (
    <div className="flex w-full items-center rounded border border-stone-700 bg-stone-800/40 px-3 py-2 text-sm text-stone-200">
      <span className="min-w-0 flex-1 truncate" title={value || undefined}>
        {value || <span className="text-muted">{placeholder}</span>}
      </span>
    </div>
  )
}

function fromUser(user) {
  return {
    username: user.username || '',
    email: user.email || '',
    bio: user.bio || '',
    phone: user.phone || '',
    discord: user.discord || '',
    telegram: user.telegram || '',
  }
}

function GmPanel({ userCount }) {
  return (
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
  )
}
