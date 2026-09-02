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
    <div className="flex min-h-screen items-center justify-center px-4 pt-2 pb-10">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <span className="avatar-md mx-auto mb-3">H</span>
          <h1 className="heading-section">Регистрация</h1>
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
        <p className="mt-5 text-center text-hint">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="link-ember">
            Войти
          </Link>
        </p>
      </Card>
    </div>
  )
}
