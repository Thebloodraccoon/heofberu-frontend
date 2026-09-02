import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '../api.js'
import { Button, Card, ErrorBox, Field, Input } from '@/components/ui'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [form, setForm] = useState({ new_password: '', confirm_password: '' })
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (form.new_password !== form.confirm_password) {
      setError({ message: 'Пароли не совпадают' })
      return
    }
    setBusy(true)
    try {
      await authApi.resetPassword({
        token,
        new_password: form.new_password,
        confirm_password: form.confirm_password,
      })
      setDone(true)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-2 pb-10">
        <Card className="w-full max-w-sm p-6 text-center">
          <h1 className="heading-section">Ссылка недействительна</h1>
          <p className="subtitle mt-2">
            Отсутствует токен восстановления. Запросите новую ссылку на{' '}
            <Link to="/forgot-password" className="link-ember">
              восстановление пароля
            </Link>
            .
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 pt-2 pb-10">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <span className="avatar-md mx-auto mb-3">H</span>
          <h1 className="heading-section">Новый пароль</h1>
          <p className="subtitle">Введите пароль дважды</p>
        </div>
        {error && (
          <div className="mb-4">
            <ErrorBox error={error} />
          </div>
        )}
        {done ? (
          <div className="space-y-4 text-center">
            <p className="text-body">
              Пароль успешно изменён. Теперь вы можете войти с новым паролем.
            </p>
            <Link to="/login" className="link-ember">
              Войти
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Новый пароль">
              <Input
                type="password"
                required
                autoComplete="new-password"
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
              />
            </Field>
            <Field label="Повторите пароль">
              <Input
                type="password"
                required
                autoComplete="new-password"
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
              />
            </Field>
            <Button type="submit" disabled={busy} className="mt-2">
              {busy ? 'Сохраняем...' : 'Задать пароль'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
