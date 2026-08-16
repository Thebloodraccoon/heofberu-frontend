import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../useAuth.js'
import { Button, Card, ErrorBox, Field, Input } from '@/components/ui'

export default function RegisterPage() {
  const { register, busy } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (form.password !== form.confirm) {
      setError({ message: 'Пароли не совпадают' })
      return
    }
    try {
      await register(form.username, form.email, form.password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full border-2 border-stone-600 bg-stone-900 font-display text-2xl font-black text-stone-100 shadow-[inset_0_0_0_2px_rgba(0,0,0,0.35)]">
            H
          </span>
          <h1 className="font-display text-xl font-bold text-stone-100">Регистрация</h1>
          <p className="mt-1 text-sm text-stone-400">Новый аккаунт игрока</p>
        </div>
        {error && <div className="mb-4"><ErrorBox error={error} /></div>}
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Имя пользователя">
            <Input
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Пароль">
            <Input
              type="password"
              required
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Field label="Повторите пароль">
            <Input
              type="password"
              required
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
          </Field>
          <Button type="submit" disabled={busy} className="mt-2">
            {busy ? 'Создаём...' : 'Зарегистрироваться'}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-stone-400">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-ember hover:underline">
            Войти
          </Link>
        </p>
      </Card>
    </div>
  )
}
