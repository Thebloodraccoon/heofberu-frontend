import { useState } from 'react'
import { Button, Field, Input, Modal, TextArea } from '@/components/ui'

function blankFeature() {
  return { name: '', description: '', level: null }
}

export default function FeatureModal({ title, subtitle, value = null, showLevel = false, levelRequired = false, levelHint, onSave, onClose }) {
  const [edit, setEdit] = useState(() => ({ ...blankFeature(), ...(value ?? {}) }))
  const [levelError, setLevelError] = useState(false)

  const LEVEL_MIN = 1
  const LEVEL_MAX = 20

  const setField = (key) => (e) =>
    setEdit((d) => ({
      ...d,
      [key]:
        key === 'level'
          ? e.target.value === ''
            ? null
            : Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, Number(e.target.value)))
          : e.target.value,
    }))

  const save = () => {
    if (showLevel && levelRequired && edit.level == null) {
      setLevelError(true)
      return
    }
    onSave(edit)
  }

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
          <Button type="button" onClick={save}>
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
            <Field label={levelRequired ? 'Уровень получения (обязательно)' : 'Уровень получения'}>
              <Input
                type="number"
                min={LEVEL_MIN}
                max={LEVEL_MAX}
                value={edit.level ?? ''}
                onChange={(e) => {
                  setLevelError(false)
                  setField('level')(e)
                }}
                placeholder={levelRequired ? 'Обязательно' : 'Пусто = сразу'}
              />
            </Field>
          )}
        </div>
        {showLevel && levelRequired && levelError && (
          <p className="mt-1 text-xs text-red-400">Укажите уровень, с которого умение доступно.</p>
        )}
        {showLevel && levelHint && <p className="text-xs text-stone-500">{levelHint}</p>}

        <Field label="Описание">
          <TextArea value={edit.description} onChange={setField('description')} rows={4} />
        </Field>
    </Modal>
  )
}
