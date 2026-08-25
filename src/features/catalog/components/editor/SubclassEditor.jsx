import { useState } from 'react'
import { catalogApi as api } from '@/features/catalog/api.js'
import { featurePayload, subclassPayload } from '@/features/catalog/config/editors/index.js'
import FeatureModal from './FeaturesModal.jsx'
import FeaturesEditorBlock from './FeaturesEditorBlock.jsx'
import { Button, ErrorBox, Field, Input, TextArea } from '@/components/ui'

const SUBFEATURE_LEVEL_HINT =
  'Уровень, с которого умение доступно. Обязательно для заполнения.'

function blankSubclass() {
  return {
    name: '',
    archetype_group_name: '',
    description: '',
  }
}

export default function SubclassEditor({ classId, detail, features, busy = false, error = null, onRefresh }) {
  const [draft, setDraft] = useState(() => ({ ...blankSubclass(), ...(detail ?? {}) }))
  const [featureModal, setFeatureModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)

  const setField = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      await api.classes.subclasses.update(classId, detail.id, subclassPayload(draft))
      setSaved(true)
      await onRefresh()
    } catch (err) {
      setSaveError(err)
    } finally {
      setSaving(false)
    }
  }

  const saveFeature = async (next) => {
    setSaveError(null)
    const body = featurePayload(next)
    try {
      if (featureModal.index == null) {
        await api.classes.subclasses.features.add(classId, detail.id, body)
      } else {
        await api.classes.subclasses.features.update(classId, detail.id, next.id, body)
      }
      setFeatureModal(null)
      await onRefresh()
    } catch (err) {
      setSaveError(err)
    }
  }

  const removeFeature = async (f) => {
    setSaveError(null)
    try {
      await api.classes.subclasses.features.remove(classId, detail.id, f.id)
      await onRefresh()
    } catch (err) {
      setSaveError(err)
    }
  }

  return (
    <div>
      {busy ? (
        <p className="text-sm text-stone-500">Загружаем подкласс...</p>
      ) : (
        <div className="space-y-3">
          {saveError && <ErrorBox error={saveError} onRetry={() => {}} />}
          {error && <ErrorBox error={error} onRetry={() => {}} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Название подкласса">
              <Input value={draft.name} onChange={setField('name')} placeholder="Например, Школа Воплощения" />
            </Field>
            <Field label="Название группы (архетипа)">
              <Input
                value={draft.archetype_group_name}
                onChange={setField('archetype_group_name')}
                placeholder="Например, Школа магии"
              />
            </Field>
          </div>

          <Field label="Описание">
            <TextArea value={draft.description} onChange={setField('description')} rows={2} />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" disabled={saving} onClick={save} className="my-[5px]">
              {saving ? 'Сохраняем...' : 'Обновить подкласс'}
            </Button>
            {saved && <span className="text-xs text-emerald-400">Подкласс обновлён</span>}
          </div>

          <div className="border-t border-stone-700/70 pt-3">
            <FeaturesEditorBlock
              block={{
                label: 'Умения подкласса',
                addLabel: '+ Добавить умение',
                empty: 'Умений нет',
                noun: 'умение',
              }}
              items={features}
              error={error}
              showLevel
              onAdd={() => setFeatureModal({ index: null })}
              onEdit={(i) => setFeatureModal({ index: i })}
              onRemove={removeFeature}
              onRetry={onRefresh}
            />
          </div>
        </div>
      )}

      {featureModal && (() => {
        const row = featureModal.index == null ? null : features[featureModal.index]
        return (
          <FeatureModal
            title={
              featureModal.index == null
                ? 'Добавить умение'
                : `Изменить: ${row?.name || 'умение'}`
            }
            subtitle={detail.name}
            value={row}
            showLevel
            levelRequired
            levelHint={SUBFEATURE_LEVEL_HINT}
            onSave={saveFeature}
            onClose={() => setFeatureModal(null)}
          />
        )
      })()}
    </div>
  )
}
