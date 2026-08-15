import { useEffect, useState } from 'react'
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

const ROLE_LABELS = { player: 'Игрок', gm: 'Гейм-мастер', found_father: 'Основатель' }

export default function UsersPage() {
  const [users, setUsers] = useState(null)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'player' })
  const [saving, setSaving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    const run = async () => {
      try {
        const page = await api.users.list({ size: 100 })
        if (!active) return
        setError(null)
        setUsers(page.items ?? [])
      } catch (e) {
        if (active) setError(e)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [reloadKey])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.users.create(form)
      setForm({ username: '', email: '', password: '', role: 'player' })
      setShowCreate(false)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (userId) => {
    setError(null)
    try {
      await api.users.remove(userId)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setError(err)
    }
  }

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
              <Button type="submit" disabled={saving}>{saving ? 'Создаём...' : 'Создать'}</Button>
            </div>
          </form>
        </Card>
      )}

      {error && <ErrorBox error={error} onRetry={() => setReloadKey((k) => k + 1)} />}
      {!error && !users && <Spinner />}
      {!error && users && users.length === 0 && <EmptyState text="Пользователей пока нет" />}
      {users && users.length > 0 && (
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
