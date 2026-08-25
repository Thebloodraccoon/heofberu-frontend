import { useState } from 'react'

const FIELDS = [
  ['personality_traits', 'Черты характера'],
  ['ideals', 'Идеалы'],
  ['bonds', 'Привязанности'],
  ['flaws', 'Слабости'],
]

const FIELD_MAX = 500

const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
)

function Field({ title, value, onSave }) {
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  const startEdit = () => {
    setDraft(value ?? '')
    setEdit(true)
  }

  const save = async () => {
    await onSave(draft)
    setEdit(false)
  }

  return (
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/60">
      <div className="flex items-center justify-between gap-2 px-4 pt-2.5">
        <span className="text-sm font-medium text-stone-100">{title}</span>
        {!edit && (
          <button
            type="button"
            className="rounded p-1 text-stone-400 transition hover:text-ember"
            title="Изменить"
            onClick={startEdit}
          >
            <PencilIcon />
          </button>
        )}
      </div>
      {edit ? (
        <div className="px-4 py-2.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, FIELD_MAX))}
            rows={3}
            maxLength={FIELD_MAX}
            className="w-full resize-y rounded border border-stone-700 bg-stone-800/70 px-3 py-2 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-ember"
          />
          <div className="mt-2 flex items-center gap-2">
            <button type="button" className="sheet-btn sheet-btn_primary" onClick={save}>Сохранить</button>
            <button type="button" className="sheet-btn" onClick={() => setEdit(false)}>Отмена</button>
            <span className="ml-auto text-xs text-stone-500">
              {draft.length}/{FIELD_MAX}
            </span>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap px-4 pb-3 text-sm text-stone-300">{value || '—'}</p>
      )}
    </div>
  )
}

export default function PersonalityPanel({ character, onSave }) {
  return (
    <div className="space-y-2">
      {FIELDS.map(([field, title]) => (
        <Field key={field} title={title} value={character[field]} onSave={onSave(field)} />
      ))}
    </div>
  )
}
