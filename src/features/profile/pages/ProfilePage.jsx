import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/useAuth.js'
import { Badge, Button, Input, RichText, RichTextEditor, Skeleton, SkeletonCard } from '@/components/ui'
import SaveStatus from '@/components/ui/SaveStatus.jsx'
import useSaveStatus from '@/components/ui/useSaveStatus.js'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { useUpdateMe } from '@/features/users/queries.js'
import '@/styles/profile.css'

export default function ProfilePage() {
  const { user, isGM, isFounder, loadUser } = useAuth()
  useEffect(() => { loadUser() }, [loadUser])

  if (!user) return <div className="profile-page" aria-busy="true">
    <Skeleton className="mb-6 h-10 w-64" />
    <div className="profile-layout"><SkeletonCard className="min-h-[16rem]" /><SkeletonCard className="min-h-[20rem]" /></div>
  </div>

  return <ProfileContent user={user} roleLabel={isFounder ? 'Основатель' : isGM ? 'Гейм-мастер' : 'Игрок'} roleTone={isFounder ? 'good' : isGM ? 'accent' : 'default'} onSaved={loadUser} />
}

function ProfileContent({ user, roleLabel, roleTone, onSaved }) {
  const updateMe = useUpdateMe()
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState(() => fromUser(user))
  const { statuses, run, clear } = useSaveStatus()
  const busy = updateMe.isPending || statuses.profile?.state === 'saving'
  const changed = Object.keys(form).some((key) => form[key] !== fromUser(user)[key])
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const startEdit = () => { setForm(fromUser(user)); clear('profile'); setEdit(true) }
  const cancel = () => { setForm(fromUser(user)); clear('profile'); setEdit(false) }
  const save = (event) => {
    event.preventDefault()
    if (!changed || busy) return
    run('profile', async () => {
      await updateMe.mutateAsync(form)
      setEdit(false)
      await onSaved()
    })
  }

  return <div className="profile-page">
    <header className="lore-header lore-list-header">
      <div>
        <p className="lore-eyebrow">Личный кабинет</p>
        <h1 className="heading-section">Учётная запись</h1>
        <div className="lore-intro-row">
          <p className="lore-intro">Ваш профиль и контакты.</p>
          {!edit && <Button variant="ghost" size="sm" onClick={startEdit}><LoreIcon name="edit" />Редактировать</Button>}
        </div>
      </div>
    </header>
    <div className="profile-layout">
      <aside className="profile-identity" aria-label="Сведения учётной записи">
        <span className="profile-avatar" aria-hidden="true">{(user.username || 'U').slice(0, 2).toUpperCase()}</span>
        <h2 className="heading-card profile-username">{user.username}</h2>
        <Badge tone={roleTone}>{roleLabel}</Badge>
        <dl className="profile-account-details">
          <div><dt>Email</dt><dd>{user.email || 'Не указан'}</dd></div>
          {user.created_at && <div><dt>Дата регистрации</dt><dd>{new Date(user.created_at).toLocaleDateString('ru-RU')}</dd></div>}
        </dl>
      </aside>
      <form className="profile-content" onSubmit={save} aria-label="Профиль">
        <section className="profile-section">
          <h2 className="heading-sub">О себе</h2>
          {edit ? <fieldset disabled={busy} className="mt-3"><legend className="sr-only">О себе</legend><RichTextEditor rows={6} value={form.bio} onChange={set('bio')} placeholder="Расскажите о себе и своих героях…" /></fieldset>
            : user.bio ? <RichText value={user.bio} className="mt-3 text-body" /> : <p className="mt-3 text-stone-500">Расскажите о себе и своих героях.</p>}
        </section>
        <section className="profile-section">
          <h2 className="heading-sub">Контакты</h2>
          {edit ? <fieldset disabled={busy} className="profile-contact-fields">
            <legend className="sr-only">Контакты</legend>
            {contactFields.map(({ key, label, placeholder }) => <label key={key} className="flex flex-col gap-1.5"><span className="text-label">{label}</span><Input type={key === 'phone' ? 'tel' : 'text'} value={form[key]} onChange={set(key)} placeholder={placeholder} /></label>)}
          </fieldset> : <dl className="profile-contacts">
            {contactFields.map(({ key, label }) => <div key={key}><ContactIcon kind={key} /><div><dt>{label}</dt><dd className={!user[key] ? 'text-stone-500' : ''}>{user[key] || 'Не указан'}</dd></div></div>)}
          </dl>}
        </section>
        <div className="profile-form-footer">
          <SaveStatus status={statuses.profile} />
          {edit && <div className="flex gap-2"><Button type="button" variant="ghost" disabled={busy} onClick={cancel}>Отмена</Button><Button type="submit" disabled={!changed || busy}>Сохранить</Button></div>}
        </div>
      </form>
    </div>
  </div>
}

const contactFields = [
  { key: 'phone', label: 'Телефон', placeholder: '+380 90 000-00-00' },
  { key: 'discord', label: 'Discord', placeholder: 'username' },
  { key: 'telegram', label: 'Telegram', placeholder: '@username' },
]

function ContactIcon({ kind }) {
  return <svg className="lore-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={kind === 'phone' ? 'M7 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-3l-5-2-2 2a14 14 0 0 1-7-7l2-2-2-5Z' : kind === 'telegram' ? 'm3 11 18-8-5 18-5-7-8-3Zm8 3 10-11' : 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H3l2.5-4A8.5 8.5 0 1 1 21 11.5ZM8 11h.01M12 11h.01M16 11h.01'} />
  </svg>
}

function fromUser(user) {
  return { username: user.username || '', email: user.email || '', bio: user.bio || '', phone: user.phone || '', discord: user.discord || '', telegram: user.telegram || '' }
}
