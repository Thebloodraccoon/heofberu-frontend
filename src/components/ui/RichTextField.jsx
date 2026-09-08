import { useState } from 'react'
import { Button, ErrorBox } from './primitives.jsx'
import { RichText } from './RichText.jsx'
import { RichTextEditor } from './RichTextEditor.jsx'

// Текстовое/rich-text поле с собственным сохранением: «Изменить» → правки →
// «Сохранить» шлёт PATCH только этого поля (onSave), не трогая остальную форму.
// Используется вместо общей кнопки формы там, где поля независимы друг от друга
// (описания в ГМ-редакторе).
export function RichTextField({ label, value, onSave, rows = 4, placeholder }) {
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const startEdit = () => {
    setDraft(value ?? '')
    setError(null)
    setSaved(false)
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
    try {
      await onSave(draft)
      setEdit(false)
      setSaved(true)
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
        {saved && !edit && <span className="badge-saved">Сохранено</span>}
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
