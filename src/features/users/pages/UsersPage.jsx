import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorBox,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
} from '@/components/ui'
import Pagination from '@/components/ui/Pagination.jsx'
import { useToasts } from '@/components/ToastProvider.jsx'
import { useAuth } from '@/features/auth/useAuth.js'
import { useCreateUser, useDeleteUser, useFlushCache, useUpdateUser, useUsersPage } from '@/features/users/queries.js'

const ROLE_LABELS = { player: 'Игрок', gm: 'Гейм-мастер', found_father: 'Основатель' }
const ROLE_TONES = { found_father: 'good', gm: 'accent' }
// В UI основатель повышает максимум до ГМ; основателей назначает только
// супер-админ на бэке. Удалять себя и предустановленного админа бэк не даёт.
const ASSIGNABLE_ROLES = ['player', 'gm']

const EMPTY_FORM = { username: '', email: '', password: '', role: 'player' }
const PAGE_SIZE = 20

function CreateUserForm({ onDone }) {
  const createUser = useCreateUser()
  const [form, setForm] = useState(EMPTY_FORM)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    createUser.mutate(form, { onSuccess: onDone })
  }

  return (
    <Card className="mb-6 p-5">
      <h2 className="mb-4 text-base font-semibold text-stone-100">Новый пользователь</h2>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Имя пользователя *"><Input required value={form.username} onChange={set('username')} /></Field>
        <Field label="Email *"><Input type="email" required value={form.email} onChange={set('email')} /></Field>
        <Field label="Пароль *"><Input type="password" required value={form.password} onChange={set('password')} /></Field>
        <Field label="Роль">
          <Select value={form.role} onChange={set('role')}>
            {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </Select>
        </Field>
        {createUser.error && <ErrorBox className="sm:col-span-2 lg:col-span-4" error={createUser.error} />}
        <div className="sm:col-span-2 lg:col-span-4">
          <Button type="submit" disabled={createUser.isPending}>{createUser.isPending ? 'Создаём...' : 'Создать'}</Button>
        </div>
      </form>
    </Card>
  )
}

function RoleCell({ user }) {
  const updateUser = useUpdateUser()
  const { push } = useToasts()

  if (!ASSIGNABLE_ROLES.includes(user.role)) {
    return <Badge tone={ROLE_TONES[user.role] ?? 'default'}>{ROLE_LABELS[user.role] ?? user.role}</Badge>
  }

  const change = (e) => {
    const role = e.target.value
    if (role === user.role) return
    updateUser.mutate(
      { id: user.id, role },
      {
        onSuccess: () => push(`${user.username}: ${ROLE_LABELS[role]}`, 'Роль изменена', 'success'),
        onError: (err) => push('Не удалось сменить роль', err?.message, 'error'),
      },
    )
  }

  return (
    <Select value={user.role} onChange={change} disabled={updateUser.isPending} aria-label={`Роль ${user.username}`} className="w-40">
      {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
    </Select>
  )
}

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('ru-RU') : '—')

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [confirmFlush, setConfirmFlush] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const flushCache = useFlushCache()
  const deleteUser = useDeleteUser()
  const { user: me } = useAuth()
  const { push } = useToasts()

  const params = { page, size: PAGE_SIZE, ...(search.trim() && { search: search.trim() }), ...(role && { role }) }
  const { data, isLoading, error, refetch } = useUsersPage(params)
  const users = data?.items ?? []

  const filter = (setter) => (e) => {
    setter(e.target.value)
    setPage(1)
  }

  const flush = () =>
    flushCache.mutate(undefined, {
      onSuccess: () => {
        setConfirmFlush(false)
        push('Кеш сброшен', undefined, 'success')
      },
    })

  const remove = () =>
    deleteUser.mutate(toDelete.id, {
      onSuccess: () => {
        push(`${toDelete.username} удалён`, undefined, 'success')
        setToDelete(null)
      },
    })

  const closeDelete = () => {
    deleteUser.reset()
    setToDelete(null)
  }

  return (
    <div>
      <PageHeader
        title="Админ-панель"
        subtitle="Пользователи, роли и обслуживание"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmFlush(true)}>Сбросить кеш</Button>
            <Button onClick={() => setShowCreate((v) => !v)}>
              {showCreate ? 'Отмена' : '+ Создать пользователя'}
            </Button>
          </>
        }
      />

      {showCreate && <CreateUserForm onDone={() => setShowCreate(false)} />}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Поиск" className="min-w-56 flex-1">
          <Input type="search" value={search} onChange={filter(setSearch)} placeholder="Имя или email" />
        </Field>
        <Field label="Роль" className="w-48">
          <Select value={role} onChange={filter(setRole)}>
            <option value="">Все роли</option>
            {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        {data && <p className="pb-2 text-sm text-stone-500">Всего: {data.total}</p>}
      </div>

      {error && <ErrorBox error={error} onRetry={refetch} />}
      {!error && isLoading && (
        <Card>
          <div aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-stone-800/60 px-4 py-3 last:border-0">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </Card>
      )}
      {!error && !isLoading && users.length === 0 && <EmptyState text="Никого не нашли" />}
      {users.length > 0 && (
        <Card>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-700/70 text-xs uppercase tracking-wide text-stone-500">
                <th className="px-4 py-3">Имя</th>
                <th className="px-4 py-3 max-md:hidden">Email</th>
                <th className="px-4 py-3">Роль</th>
                <th className="px-4 py-3 max-lg:hidden">Создан</th>
                <th className="px-4 py-3 max-lg:hidden">Последний вход</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-stone-800/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-stone-200">{u.username}</td>
                  <td className="px-4 py-3 text-stone-400 max-md:hidden">{u.email}</td>
                  <td className="px-4 py-3"><RoleCell user={u} /></td>
                  <td className="px-4 py-3 text-stone-500 max-lg:hidden">{fmtDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-stone-500 max-lg:hidden">{fmtDate(u.last_login)}</td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== me?.id && (
                      <Button type="button" variant="danger" size="sm" onClick={() => setToDelete(u)}>Удалить</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Pagination page={page} total={data?.total} size={PAGE_SIZE} onPage={setPage} />

      {toDelete && (
        <ConfirmDialog
          title="Удалить пользователя?"
          message={`Аккаунт ${toDelete.username} (${toDelete.email}) будет удалён безвозвратно.`}
          busy={deleteUser.isPending}
          error={deleteUser.error}
          onCancel={closeDelete}
          onConfirm={remove}
        />
      )}

      {confirmFlush && (
        <ConfirmDialog
          title="Сбросить кеш?"
          message="Все закешированные данные будут удалены. Сессии пользователей не затрагиваются."
          confirmText="Сбросить"
          busyText="Сбрасываем..."
          busy={flushCache.isPending}
          error={flushCache.error}
          onCancel={() => setConfirmFlush(false)}
          onConfirm={flush}
        />
      )}
    </div>
  )
}
