import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../useAuth.js'
import { Button, Card, ErrorBox, Field, Input } from '@/components/ui'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher.jsx'

export default function LoginPage() {
  const { login, busy } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)

  const from = location.state?.from?.pathname || '/characters'

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await login(form.email, form.password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="fixed right-4 top-4 z-50">
        <ThemeSwitcher />
      </div>
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full border-2 border-stone-600 bg-stone-900 font-display text-2xl font-black text-stone-100 shadow-[inset_0_0_0_2px_rgba(0,0,0,0.35)]">
            H
          </span>
          <h1 className="font-display text-xl font-bold text-stone-100">Вход в Heofberu</h1>
          <p className="mt-1 text-sm text-stone-400">Система управления мирами D&D</p>
        </div>
        {error && <div className="mb-4"><ErrorBox error={error} /></div>}
        <form onSubmit={submit} className="flex flex-col gap-4">
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
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Button type="submit" disabled={busy} className="mt-2">
            {busy ? 'Входим...' : 'Войти'}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-stone-400">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-ember hover:underline">
            Зарегистрироваться
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-stone-500">
          Или{' '}
          <Link to="/catalog/races" className="text-ember hover:underline">
            посмотрите справочники
          </Link>{' '}
          без входа
        </p>
      </Card>
    </div>
  )
}
