import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api.js'
import { Button, Card, ErrorBox, Field, Input } from '@/components/ui'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const redirect = `${window.location.origin}/reset-password`
      await authApi.forgotPassword({ email, redirect })
      setSent(true)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 pt-2 pb-10">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <span className="avatar-md mx-auto mb-3">H</span>
          <h1 className="heading-section">Восстановление пароля</h1>
        </div>
        {error && (
          <div className="mb-4">
            <ErrorBox error={error} />
          </div>
        )}
        {sent ? (
          <div className="text-center">
            <p className="text-body">
              Если аккаунт с таким email существует, на него отправлена ссылка для
              восстановления пароля. Проверьте почту.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Email">
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={busy} className="mt-2">
              {busy ? 'Отправляем...' : 'Отправить ссылку'}
            </Button>
          </form>
        )}
        <p className="mt-5 text-center text-hint">
          <Link to="/login" className="link-ember">
            Вернуться ко входу
          </Link>
        </p>
      </Card>
    </div>
  )
}
