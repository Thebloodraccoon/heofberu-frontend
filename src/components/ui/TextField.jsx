import { useState } from 'react'
import { Button, Input } from './primitives.jsx'
import SaveStatus from './SaveStatus.jsx'
import useSaveStatus from './useSaveStatus.js'

// Однострочное текстовое поле с собственным сохранением: «Изменить» → правка →
// «Сохранить» шлёт PATCH только этого поля (onSave), не трогая остальную форму.
// Статус сохранения показывается рядом с полем.
export function TextField({ label, value, onSave, placeholder, type = 'text' }) {
  const { statuses, run, clear } = useSaveStatus()
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [saving, setSaving] = useState(false)
  const busy = saving || statuses.field?.state === 'saving'

  const startEdit = () => {
    clear('field')
    setDraft(value ?? '')
    setEdit(true)
  }

  const cancel = () => {
    if (busy) return
    clear('field')
    setDraft(value ?? '')
    setEdit(false)
  }

  const save = async () => {
    if (busy) return
    setSaving(true)
    await run('field', async () => {
      await onSave(draft)
      setEdit(false)
    })
    setSaving(false)
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
            onChange={(e) => { clear('field'); setDraft(e.target.value) }}
            placeholder={placeholder}
            disabled={busy}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                save()
              }
              if (e.key === 'Escape') cancel()
            }}
          />
          <div className="mt-2 flex items-center gap-2">
            <Button type="button" size="sm" onClick={save} disabled={busy}>
              {busy ? <SaveStatus compact status={{ state: 'saving' }} /> : 'Сохранить'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={cancel} disabled={busy}>
              Отмена
            </Button>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2 text-sm text-stone-200">
          {value || <span className="text-stone-500">—</span>}
        </div>
      )}
      <SaveStatus status={statuses.field} />
    </div>
  )
}

export default TextField
