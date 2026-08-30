import { useState } from 'react'
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
  Skeleton,
} from '@/components/ui'
import { useCreateUser, useDeleteUser, useUsers } from '@/features/users/queries.js'

const ROLE_LABELS = { player: 'Игрок', gm: 'Гейм-мастер', found_father: 'Основатель' }

const EMPTY_FORM = { username: '', email: '', password: '', role: 'player' }

export default function UsersPage() {
  const { data: users, isLoading, error, refetch } = useUsers()
  const createUser = useCreateUser()
  const deleteUser = useDeleteUser()

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    createUser.mutate(form, {
      onSuccess: () => {
        setForm(EMPTY_FORM)
        setShowCreate(false)
      },
    })
  }

  const remove = (userId) => deleteUser.mutate(userId)

  return (
    <div>
      <PageHeader
        title="Пользователи"
        subtitle="Управление аккаунтами и ролями"
        actions={
          <Button onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? 'Отмена' : '+ Создать пользователя'}
          </Button>
        }
      />

      {showCreate && (
        <Card className="mb-6 p-5">
          <h2 className="mb-4 text-base font-semibold text-stone-100">Новый пользователь</h2>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Имя пользователя *"><Input required value={form.username} onChange={set('username')} /></Field>
            <Field label="Email *"><Input type="email" required value={form.email} onChange={set('email')} /></Field>
            <Field label="Пароль *"><Input type="password" required value={form.password} onChange={set('password')} /></Field>
            <Field label="Роль">
              <Select value={form.role} onChange={set('role')}>
                <option value="player">player</option>
                <option value="gm">gm</option>
              </Select>
            </Field>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={createUser.isPending}>{createUser.isPending ? 'Создаём...' : 'Создать'}</Button>
            </div>
          </form>
        </Card>
      )}

      {error && <ErrorBox error={error} onRetry={refetch} />}
      {!error && isLoading && (
        <Card>
          <div aria-busy="true">
            <div className="flex items-center gap-4 border-b border-stone-700/70 px-4 py-3">
              {['Имя', 'Email', 'Роль', 'Создан', ''].map((h) => (
                <Skeleton key={h} className="h-4 flex-1" />
              ))}
            </div>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-stone-800/60 px-4 py-3 last:border-0">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </Card>
      )}
      {!error && !isLoading && users?.length === 0 && <EmptyState text="Пользователей пока нет" />}
      {users?.length > 0 && (
        <Card>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-700/70 text-xs uppercase tracking-wide text-stone-500">
                <th className="px-4 py-3">Имя</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Роль</th>
                <th className="px-4 py-3">Создан</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-stone-800/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-stone-200">{u.username}</td>
                  <td className="px-4 py-3 text-stone-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={u.role === 'found_father' ? 'good' : u.role === 'gm' ? 'accent' : 'default'}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('ru-RU') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="danger" size="sm" onClick={() => remove(u.id)}>
                      Удалить
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
