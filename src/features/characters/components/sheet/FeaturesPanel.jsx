import { useState } from 'react'
import { charactersApi as api } from '@/features/characters/api.js'
import { Button, Field, Select } from '@/components/ui'

function FeatSection({ title, items, editing, renderName, onRemove }) {
  return (
    <div className="space-y-2">
      <p className="sheet-section-label">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-stone-500">Ничего не добавлено</p>
      ) : (
        <ul className="space-y-2">
          {items.map((cf) => (
            <li key={cf.id} className="flex items-start justify-between gap-3 rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-100">{renderName(cf)}</p>
              </div>
              {editing && (
                <button type="button" className="sheet-btn shrink-0" onClick={() => onRemove(cf)}>
                  Убрать
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function FeaturesPanel({ character, lookups, editing, onChanged, onError }) {
  const feats = character.feats ?? []
  const features = character.features ?? []
  const [featId, setFeatId] = useState('')
  const [featureId, setFeatureId] = useState('')
  const findFeat = (idv) => lookups.feats.find((x) => x.id === idv)?.name
  const findFeature = (idv) => lookups.features.find((x) => x.id === idv)?.name

  const addFeat = async () => {
    if (!featId) return
    try {
      await api.characters.feats.add(character.id, { feat_id: Number(featId) })
      setFeatId('')
      await onChanged()
    } catch (e) {
      onError(e)
    }
  }

  const addFeature = async () => {
    if (!featureId) return
    try {
      await api.characters.features.add(character.id, { feature_id: Number(featureId) })
      setFeatureId('')
      await onChanged()
    } catch (e) {
      onError(e)
    }
  }

  const removeFeat = async (cfId) => {
    try {
      await api.characters.feats.remove(character.id, cfId)
      await onChanged()
    } catch (e) {
      onError(e)
    }
  }

  const removeFeature = async (cfId) => {
    try {
      await api.characters.features.remove(character.id, cfId)
      await onChanged()
    } catch (e) {
      onError(e)
    }
  }

  return (
    <div className="space-y-5">
      <FeatSection
        title="Черты"
        items={feats.map((cf) => ({ ...cf, is_feat: true }))}
        editing={editing}
        renderName={(cf) => findFeat(cf.feat_id) || `Черта #${cf.feat_id}`}
        onRemove={(cf) => (cf.is_feat ? removeFeat(cf.id) : removeFeature(cf.id))}
      />
      <FeatSection
        title="Свойства"
        items={features.map((cf) => ({ ...cf, is_feat: false }))}
        editing={editing}
        renderName={(cf) => findFeature(cf.feature_id) || `Свойство #${cf.feature_id}`}
        onRemove={(cf) => (cf.is_feat ? removeFeat(cf.id) : removeFeature(cf.id))}
      />

      {editing && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-end gap-2">
            <Field label="Добавить черту">
              <Select value={featId} onChange={(e) => setFeatId(e.target.value)}>
                <option value="">Выберите...</option>
                {lookups.feats.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            </Field>
            <Button onClick={addFeat}>+</Button>
          </div>
          <div className="flex items-end gap-2">
            <Field label="Добавить свойство">
              <Select value={featureId} onChange={(e) => setFeatureId(e.target.value)}>
                <option value="">Выберите...</option>
                {lookups.features.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            </Field>
            <Button onClick={addFeature}>+</Button>
          </div>
        </div>
      )}
    </div>
  )
}
