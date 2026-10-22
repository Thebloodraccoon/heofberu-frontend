import { useState } from 'react'
import { Button, ErrorBox } from '@/components/ui'
import { normalizeScaling, sameScaling, scalingError, toScalingDraft } from '@/lib/utils/featureScaling.js'
import FeatureScalingEditor from './FeatureScalingEditor.jsx'

// Вкладка «Растёт с уровнем» конструктора черт и особенностей. Черновик живёт
// здесь, а не в форме редактора: автосохранение формы перечитывает запись и
// стёрло бы недописанную строку. При правке — своя кнопка «Сохранить строку»
// (onSave), при создании черновик уходит наверх (onDraftChange) и сохраняется
// вместе с записью. Родитель пересоздаёт блок (key) при смене записи.
export default function CatalogScalingBlock({ saved = null, minLevel = null, onSave, onDraftChange }) {
  const [draft, setDraft] = useState(() => toScalingDraft(saved))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const dirty = Boolean(onSave) && !sameScaling(draft, saved)

  const change = (next) => {
    setDraft(next)
    onDraftChange?.(next)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      setDraft(toScalingDraft(await onSave(normalizeScaling(draft))))
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && <ErrorBox error={error} />}
      <FeatureScalingEditor
        value={draft}
        onChange={change}
        minLevel={minLevel}
        actions={
          dirty && (
            <>
              <Button type="button" variant="ghost" size="sm" onClick={() => change(toScalingDraft(saved))}>
                Отменить
              </Button>
              <Button type="button" size="sm" onClick={save} disabled={saving || !!scalingError(draft, minLevel)}>
                {saving ? 'Сохраняем…' : 'Сохранить строку'}
              </Button>
            </>
          )
        }
      />
    </div>
  )
}
