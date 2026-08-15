import { useState } from 'react'
import { Button, Field, Input, Modal, TextArea } from './ui.jsx'

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
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      size="lg"
      scroll
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" onClick={() => onSave(edit)}>
            Сохранить
          </Button>
        </>
      }
    >
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
    </Modal>
  )
}
