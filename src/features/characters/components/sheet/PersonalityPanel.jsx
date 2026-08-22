import { useState } from 'react'
import { useUiSet } from '@/lib/uiState.js'

const FIELDS = [
  ['personality_traits', 'Черты характера', true],
  ['ideals', 'Идеалы', true],
  ['bonds', 'Привязанности', true],
  ['flaws', 'Слабости', true],
  ['backstory', 'Предыстория', false],
]

const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
)

function Field({ title, value, open, onToggle, onSave }) {
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
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        <span className={`text-stone-500 transition ${open ? 'rotate-90' : ''}`}>›</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-100">{title}</span>
        {!edit && (
          <button
            type="button"
            className="rounded p-1 text-stone-400 transition hover:text-ember"
            title="Изменить"
            onClick={(e) => {
              e.stopPropagation()
              if (!open) onToggle()
              startEdit()
            }}
          >
            <PencilIcon />
          </button>
        )}
      </button>
      {open && (
        <div className="border-t border-stone-800 px-4 py-3">
        {edit ? (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              className="w-full resize-y rounded border border-stone-700 bg-stone-800/70 px-3 py-2 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-ember"
            />
            <div className="mt-2 flex items-center gap-2">
              <button type="button" className="sheet-btn sheet-btn_primary" onClick={save}>Сохранить</button>
              <button type="button" className="sheet-btn" onClick={() => setEdit(false)}>Отмена</button>
            </div>
          </>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-stone-300">{value || '—'}</p>
        )}
        </div>
      )}
    </div>
  )
}

export default function PersonalityPanel({ character, onSave }) {
  const [openKeys, toggleKey] = useUiSet(
    `personality:${character.id}`,
    FIELDS.filter(([, , open]) => open).map(([field]) => field),
  )

  return (
    <div className="space-y-2">
      {FIELDS.map(([field, title]) => (
        <Field
          key={field}
          title={title}
          value={character[field]}
          open={openKeys.includes(field)}
          onToggle={() => toggleKey(field)}
          onSave={onSave(field)}
        />
      ))}
    </div>
  )
}
