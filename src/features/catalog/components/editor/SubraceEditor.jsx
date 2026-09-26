import { useEffect, useRef, useState } from 'react'
import { catalogApi as api } from '@/features/catalog/api.js'
import { featurePayload, persistFeatureEffects } from '@/features/catalog/config/editors/index.js'
import { abilityLabels } from '@/lib/i18n/index.js'
import FeatureModal from './FeaturesModal.jsx'
import FeaturesEditorBlock from './FeaturesEditorBlock.jsx'
import ImageUploadBlock from './ImageUploadBlock.jsx'
import TagInput from '@/features/articles/components/TagInput.jsx'
import { ErrorBox, RichTextField, Select, TextField } from '@/components/ui'
import { useToasts } from '@/components/ToastProvider.jsx'
import { BlurNumberInput, SectionTitle, TrashIcon } from './editorShared.jsx'

export default function SubraceEditor({ raceId, detail, features, busy = false, error = null, onRefresh }) {
  const { push: pushStatus } = useToasts()
  const [bonuses, setBonuses] = useState(() => detail?.ability_bonuses ?? [])
  const [tags, setTags] = useState(() => (detail?.tags ?? []).map((t) => ({ id: t.id, name: t.name })))
  const [imageUrl, setImageUrl] = useState(detail?.image_url ?? null)
  const [imageBusy, setImageBusy] = useState(false)
  const [imageError, setImageError] = useState(null)
  const [featureModal, setFeatureModal] = useState(null)
  const [saveError, setSaveError] = useState(null)

  // Название и описание сохраняются сами по себе (клик «Изменить» → правка →
  // «Сохранить»), без общей кнопки формы — см. TextField/RichTextField.
  const saveField = (key) => async (value) => {
    await api.races.subraces.update(raceId, detail.id, { [key]: value })
    await onRefresh()
  }

  const savingRef = useRef(false)
  const pendingSaveRef = useRef(false)
  const bonusesRef = useRef(bonuses)
  useEffect(() => {
    bonusesRef.current = bonuses
  }, [bonuses])

  const saveBonuses = async () => {
    if (savingRef.current) {
      // Уже сохраняем — эта правка уйдёт следующим прогоном сразу после текущего.
      pendingSaveRef.current = true
      return
    }
    savingRef.current = true
    setSaveError(null)
    pushStatus('Сохраняем…', 'Бонусы характеристик', 'saving')
    try {
      await api.races.subraces.abilityBonuses(raceId, detail.id, { ability_bonuses: bonusesRef.current })
      pushStatus('Сохранено', 'Бонусы характеристик')
      await onRefresh()
    } catch (err) {
      setSaveError(err)
    } finally {
      savingRef.current = false
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false
        saveBonuses()
      }
    }
  }

  // Автосохранение бонусов: правки копятся 700мс, затем уходят без отдельной
  // кнопки. Первый рендер (значения из detail) не считается правкой.
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const id = setTimeout(() => {
      saveBonuses()
    }, 700)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bonuses])

  const savingTagsRef = useRef(false)
  const pendingTagsSaveRef = useRef(false)
  const tagsRef = useRef(tags)
  useEffect(() => {
    tagsRef.current = tags
  }, [tags])

  const saveTags = async () => {
    if (savingTagsRef.current) {
      pendingTagsSaveRef.current = true
      return
    }
    savingTagsRef.current = true
    setSaveError(null)
    pushStatus('Сохраняем…', 'Теги', 'saving')
    try {
      await api.races.subraces.tags(raceId, detail.id, { tag_ids: tagsRef.current.map((t) => t.id) })
      pushStatus('Сохранено', 'Теги')
      await onRefresh()
    } catch (err) {
      setSaveError(err)
    } finally {
      savingTagsRef.current = false
      if (pendingTagsSaveRef.current) {
        pendingTagsSaveRef.current = false
        saveTags()
      }
    }
  }

  const isFirstTagsRender = useRef(true)
  useEffect(() => {
    if (isFirstTagsRender.current) {
      isFirstTagsRender.current = false
      return
    }
    const id = setTimeout(() => {
      saveTags()
    }, 700)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags])

  const setBonus = (i, key, val) =>
    setBonuses((rows) => rows.map((row, j) => (j === i ? { ...row, [key]: val } : row)))

  const addBonus = () =>
    setBonuses((rows) => {
      const used = new Set(rows.map((r) => r.ability))
      const free = Object.keys(abilityLabels).find((k) => !used.has(k))
      if (!free) return rows
      return [...rows, { ability: free, bonus: 1 }]
    })

  const removeBonus = (i) => setBonuses((rows) => rows.filter((_, j) => j !== i))

  const abilitiesUsedUp = Object.keys(abilityLabels).every((k) =>
    bonuses.some((r) => r.ability === k)
  )

  const saveFeature = async (next) => {
    setSaveError(null)
    const source = { type: 'SUBRACE', fk: 'subrace_id', sourceId: detail.id }
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
      const res = await api.races.subraces.image.upload(raceId, detail.id, file)
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
      await api.races.subraces.image.remove(raceId, detail.id)
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
        <p className="text-sm text-stone-500">Загружаем подрасу...</p>
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
            label="Название подрасы"
            value={detail.name}
            onSave={saveField('name')}
            placeholder="Например, Высший эльф"
          />

          <RichTextField label="Описание" value={detail.description} onSave={saveField('description')} rows={2} />

          <div>
            <SectionTitle
              button={
                <button
                  type="button"
                  onClick={addBonus}
                  disabled={abilitiesUsedUp}
                  className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800 disabled:pointer-events-none disabled:opacity-40"
                >
                  + Добавить
                </button>
              }
            >
              Бонусы характеристик
            </SectionTitle>
            {bonuses.length === 0 ? (
              <p className="text-sm text-stone-500">Бонусов нет</p>
            ) : (
              <>
                {abilitiesUsedUp && (
                  <p className="mb-2 text-xs text-stone-500">
                    Все доступные варианты использованы — каждый вариант не может повторяться.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {bonuses.map((row, i) => {
                    const used = new Set(bonuses.map((r) => r.ability))
                    return (
                      <div
                        key={i}
                        className="flex w-[calc(50%-0.5rem)] min-w-[260px] items-center gap-2"
                      >
                        <div className="w-48">
                          <Select
                            value={row.ability}
                            onChange={(e) => setBonus(i, 'ability', e.target.value)}
                            className="w-full"
                          >
                            {Object.entries(abilityLabels).map(([k, v]) => (
                              <option key={k} value={k} disabled={used.has(k) && k !== row.ability}>
                                {v}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <BlurNumberInput
                          min={-5}
                          max={5}
                          value={row.bonus}
                          onChange={(next) => setBonus(i, 'bonus', Number(next) || 0)}
                          className="input-narrow"
                        />
                        <button
                          type="button"
                          onClick={() => removeBonus(i)}
                          className="my-[5px] inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded border border-red-800 text-red-300 transition hover:bg-red-950/50"
                          title="Удалить"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          <TagInput value={tags} onChange={setTags} />

          <div className=" pt-3">
            <FeaturesEditorBlock
              block={{
                label: 'Особенности подрасы',
                addLabel: '+ Добавить',
                empty: 'Особенностей нет',
                noun: 'особенность',
              }}
              items={features}
              error={error}
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
            title={featureModal.index == null ? 'Добавить особенность' : `Изменить: ${row?.name || 'особенность'}`}
            subtitle={detail.name}
            value={row}
            onSave={saveFeature}
            onClose={() => setFeatureModal(null)}
          />
        )
      })()}
    </div>
  )
}
