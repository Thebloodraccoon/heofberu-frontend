import { useState } from 'react'
import { Button, Field, Input, TextArea } from './ui.jsx'

function blankFeature() {
  return { name: '', description: '', level: null }
}

export default function FeatureModal({ title, subtitle, value = null, showLevel = false, levelHint, onSave, onClose }) {
  const [edit, setEdit] = useState(() => ({ ...blankFeature(), ...(value ?? {}) }))

  const setField = (key) => (e) =>
    setEdit((d) => ({
      ...d,
      [key]: key === 'level' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value,
    }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-xl flex-col rounded-lg bg-stone-900 shadow-2xl ring-1 ring-stone-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-700/70 p-5">
          <div>
            <h2 className="font-display text-xl font-bold text-stone-100">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-stone-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-stone-700 px-2 py-1 text-sm text-stone-300 transition hover:bg-stone-800"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Название">
              <Input value={edit.name} onChange={setField('name')} placeholder="Например, Тёмное зрение" autoFocus />
            </Field>
            {showLevel && (
              <Field label="Уровень получения">
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={edit.level ?? ''}
                  onChange={setField('level')}
                  placeholder="Пусто = сразу"
                />
              </Field>
            )}
          </div>
          {showLevel && levelHint && <p className="text-xs text-stone-500">{levelHint}</p>}

          <Field label="Описание">
            <TextArea value={edit.description} onChange={setField('description')} rows={4} />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-stone-700/70 p-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" onClick={() => onSave(edit)}>
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  )
}
