import { useState } from 'react'
import { Button, ErrorBox, Input } from './primitives.jsx'
import { useToasts } from '@/components/ToastProvider.jsx'

// Однострочное текстовое поле с собственным сохранением: «Изменить» → правка →
// «Сохранить» шлёт PATCH только этого поля (onSave), не трогая остальную форму.
// Подтверждение сохранения показывается всплывашкой (см. StatusToasts), а не
// инлайн-бейджем. Простой (не rich-text) аналог RichTextField — для названий и т.п.
export function TextField({ label, value, onSave, placeholder, type = 'text' }) {
  const { push } = useToasts()
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const startEdit = () => {
    setDraft(value ?? '')
    setError(null)
    setEdit(true)
  }

  const cancel = () => {
    setDraft(value ?? '')
    setError(null)
    setEdit(false)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    push('Сохраняем…', label, 'saving')
    try {
      await onSave(draft)
      setEdit(false)
      push('Сохранено', label)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-label">{label}</span>
        {!edit && (
          <button type="button" onClick={startEdit} className="btn-edit-inline">
            Изменить
          </button>
        )}
      </div>
      {edit ? (
        <>
          <Input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                save()
              }
              if (e.key === 'Escape') cancel()
            }}
          />
          {error && <ErrorBox error={error} className="mt-2" />}
          <div className="mt-2 flex items-center gap-2">
            <Button type="button" size="sm" onClick={save} disabled={saving}>
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={cancel} disabled={saving}>
              Отмена
            </Button>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2 text-sm text-stone-200">
          {value || <span className="text-stone-500">—</span>}
        </div>
      )}
    </div>
  )
}

export default TextField
