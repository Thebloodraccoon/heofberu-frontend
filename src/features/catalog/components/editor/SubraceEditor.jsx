import { useState } from 'react'
import { catalogApi as api } from '@/features/catalog/api.js'
import { featurePayload, subracePayload } from '@/features/catalog/config/editors/index.js'
import { abilityLabels } from '@/lib/i18n/index.js'
import FeatureModal from './FeaturesModal.jsx'
import FeaturesEditorBlock from './FeaturesEditorBlock.jsx'
import { Button, ErrorBox, Field, Input, Select, TextArea } from '@/components/ui'

function blankSubrace() {
  return {
    name: '',
    description: '',
    ability_bonuses: [],
  }
}

export default function SubraceEditor({ raceId, detail, features, busy = false, error = null, onRefresh }) {
  const [draft, setDraft] = useState(() => ({ ...blankSubrace(), ...(detail ?? {}) }))
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
      await api.races.subraces.update(raceId, detail.id, subracePayload(draft))
      await api.races.subraces.abilityBonuses(raceId, detail.id, { ability_bonuses: draft.ability_bonuses })
      setSaved(true)
      await onRefresh()
    } catch (err) {
      setSaveError(err)
    } finally {
      setSaving(false)
    }
  }

  const setBonus = (i, key, val) =>
    setDraft((d) => {
      const ability_bonuses = d.ability_bonuses.map((row, j) => (j === i ? { ...row, [key]: val } : row))
      return { ...d, ability_bonuses }
    })

  const addBonus = () =>
    setDraft((d) => ({ ...d, ability_bonuses: [...d.ability_bonuses, { ability: 'STR', bonus: 1 }] }))

  const removeBonus = (i) =>
    setDraft((d) => ({ ...d, ability_bonuses: d.ability_bonuses.filter((_, j) => j !== i) }))

  const saveFeature = async (next) => {
    setSaveError(null)
    const body = featurePayload(next)
    try {
      if (featureModal.index == null) {
        await api.races.subraces.features.add(raceId, detail.id, body)
      } else {
        await api.races.subraces.features.update(raceId, detail.id, next.id, body)
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
      await api.races.subraces.features.remove(raceId, detail.id, f.id)
      await onRefresh()
    } catch (err) {
      setSaveError(err)
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

          <Field label="Название подрасы">
            <Input value={draft.name} onChange={setField('name')} placeholder="Например, Высший эльф" />
          </Field>

          <Field label="Описание">
            <TextArea value={draft.description} onChange={setField('description')} rows={2} />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">Бонусы характеристик</p>
              <button
                type="button"
                onClick={addBonus}
                className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
              >
                + Добавить
              </button>
            </div>
            {draft.ability_bonuses.length === 0 ? (
              <p className="text-sm text-stone-500">Бонусов нет</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {draft.ability_bonuses.map((row, i) => (
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
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="w-20">
                      <Input
                        type="number"
                        min={-5}
                        max={5}
                        value={row.bonus}
                        onChange={(e) => setBonus(i, 'bonus', Number(e.target.value))}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBonus(i)}
                      className="my-[5px] rounded border border-red-800 px-2 py-1.5 text-[11px] text-red-300 transition hover:bg-red-950/50"
                    >
                      Удалить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" disabled={saving} onClick={save} className="my-[5px]">
              {saving ? 'Сохраняем...' : 'Обновить подрасу'}
            </Button>
            {saved && <span className="text-xs text-emerald-400">Подраса обновлена</span>}
          </div>

          <div className="border-t border-stone-700/70 pt-3">
            <FeaturesEditorBlock
              block={{
                label: 'Особенности подрасы',
                addLabel: '+ Добавить особенность',
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
