import { useState } from 'react'
import { catalogApi as api } from '@/features/catalog/api.js'
import { featurePayload, persistFeatureEffects } from '@/features/catalog/config/editors/index.js'
import FeatureModal from './FeaturesModal.jsx'
import FeaturesEditorBlock from './FeaturesEditorBlock.jsx'
import ImageUploadBlock from './ImageUploadBlock.jsx'
import { ErrorBox, RichTextField, TextField } from '@/components/ui'

const SUBFEATURE_LEVEL_HINT =
  'Уровень, с которого умение доступно. Обязательно для заполнения.'

export default function SubclassEditor({ classId, detail, features, busy = false, error = null, onRefresh }) {
  const [imageUrl, setImageUrl] = useState(detail?.image_url ?? null)
  const [imageBusy, setImageBusy] = useState(false)
  const [imageError, setImageError] = useState(null)
  const [featureModal, setFeatureModal] = useState(null)
  const [saveError, setSaveError] = useState(null)

  // Название и описание сохраняются сами по себе (клик «Изменить» → правка →
  // «Сохранить»), без общей кнопки формы — см. TextField/RichTextField.
  const saveField = (key) => async (value) => {
    await api.classes.subclasses.update(classId, detail.id, { [key]: value })
    await onRefresh()
  }

  const saveFeature = async (next) => {
    setSaveError(null)
    const source = { type: 'SUBCLASS', fk: 'subclass_id', sourceId: detail.id }
    try {
      if (featureModal.index == null) {
        const created = await api.features.create(featurePayload(next, source))
        await persistFeatureEffects(created.id, next.effects)
      } else {
        await api.features.update(next.id, featurePayload(next))
        await persistFeatureEffects(next.id, next.effects)
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
      await api.features.remove(f.id)
      await onRefresh()
    } catch (err) {
      setSaveError(err)
    }
  }

  const uploadImage = async (file) => {
    setImageBusy(true)
    setImageError(null)
    try {
      const res = await api.classes.subclasses.image.upload(classId, detail.id, file)
      setImageUrl(res?.image_url ?? null)
      await onRefresh()
    } catch (err) {
      setImageError(err)
      throw err
    } finally {
      setImageBusy(false)
    }
  }

  const removeImage = async () => {
    setImageBusy(true)
    setImageError(null)
    try {
      await api.classes.subclasses.image.remove(classId, detail.id)
      setImageUrl(null)
      await onRefresh()
    } catch (err) {
      setImageError(err)
    } finally {
      setImageBusy(false)
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

          <ImageUploadBlock
            imageUrl={imageUrl}
            onUpload={uploadImage}
            onRemove={removeImage}
            busy={imageBusy}
            error={imageError}
          />

          <TextField
            label="Название подкласса"
            value={detail.name}
            onSave={saveField('name')}
            placeholder="Например, Школа Воплощения"
          />

          <RichTextField label="Описание" value={detail.description} onSave={saveField('description')} rows={2} />

          <div>
            <FeaturesEditorBlock
              block={{
                label: 'Умения подкласса',
                addLabel: '+ Добавить',
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
