import { useState } from 'react'
import { Button, ErrorBox } from './primitives.jsx'
import { RichText } from './RichText.jsx'
import { RichTextEditor } from './RichTextEditor.jsx'
import { useToasts } from '@/components/ToastProvider.jsx'

// Текстовое/rich-text поле с собственным сохранением: «Изменить» → правки →
// «Сохранить» шлёт PATCH только этого поля (onSave), не трогая остальную форму.
// Подтверждение сохранения показывается всплывашкой (см. StatusToasts), а не
// инлайн-бейджем. Используется вместо общей кнопки формы там, где поля
// независимы друг от друга (описания в ГМ-редакторе).
export function RichTextField({ label, value, onSave, rows = 4, placeholder }) {
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
      <div className="editable-field-header mb-1.5 flex items-center justify-between gap-2">
        <span className="text-label">{label}</span>
        {!edit && (
          <button type="button" onClick={startEdit} className="btn-edit-inline">
            Изменить
          </button>
        )}
      </div>
      {edit ? (
        <>
          <RichTextEditor value={draft} onChange={(e) => setDraft(e.target.value)} rows={rows} placeholder={placeholder} autoFocus />
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
        <RichText value={value} className="rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2" />
      )}
    </div>
  )
}

export default RichTextField
