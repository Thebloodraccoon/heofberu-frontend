import { useState } from 'react'
import { api } from '../api/endpoints.js'
import { featurePayload, subclassPayload } from '../editor.js'
import { ruLevel } from '../labels.js'
import FeatureModal from './FeaturesModal.jsx'
import { Badge, Button, ErrorBox, Field, Input, TextArea } from './ui.jsx'

const SUBFEATURE_LEVEL_HINT =
  'Уровень, с которого умение доступно. Оставьте пустым — доступно сразу.'

function blankSubclass() {
  return {
    name: '',
    archetype_group_name: '',
    unlock_level: '3',
    description: '',
    is_homebrew: false,
  }
}

export default function SubclassEditor({ classId, detail, features, busy = false, error = null, onRefresh, onDelete }) {
  const [draft, setDraft] = useState(() => ({ ...blankSubclass(), ...(detail ?? {}) }))
  const [featureModal, setFeatureModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)

  const setField = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }))
  const toggleHomebrew = (e) => setDraft((d) => ({ ...d, is_homebrew: e.target.checked }))

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
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-sm font-bold text-stone-100">{detail.name}</p>
          <Badge tone="accent">Разблокировка: {ruLevel(detail.unlock_level)}</Badge>
          {detail.is_homebrew && <Badge>Homebrew</Badge>}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="rounded border border-red-800 px-2 py-0.5 text-[11px] text-red-300 transition hover:bg-red-950/50"
        >
          Удалить подкласс
        </button>
      </div>

      {busy ? (
        <p className="text-sm text-stone-500">Загружаем подкласс...</p>
      ) : (
        <div className="space-y-3">
          {saveError && <ErrorBox error={saveError} onRetry={() => {}} />}
          {error && <ErrorBox error={error} onRetry={() => {}} />}
          <div className="grid gap-3 sm:grid-cols-3">
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
            <Field label="Уровень получения">
              <Input type="number" min={1} max={20} value={draft.unlock_level} onChange={setField('unlock_level')} />
            </Field>
          </div>

          <Field label="Описание">
            <TextArea value={draft.description} onChange={setField('description')} rows={2} />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded border border-stone-700 bg-stone-800/70 px-3 py-2">
              <input
                type="checkbox"
                checked={!!draft.is_homebrew}
                onChange={toggleHomebrew}
                className="size-4 accent-ember"
              />
              <span className="text-sm text-stone-200">Homebrew</span>
            </label>
            <Button type="button" disabled={saving} onClick={save}>
              {saving ? 'Сохраняем...' : 'Обновить подкласс'}
            </Button>
            {saved && <span className="text-xs text-emerald-400">Подкласс обновлён</span>}
          </div>

          <div className="border-t border-stone-700/70 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">Умения подкласса</p>
              <button
                type="button"
                onClick={() => setFeatureModal({ index: null })}
                className="rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
              >
                + Добавить умение
              </button>
            </div>
            {features.length === 0 ? (
              <p className="text-sm text-stone-500">Умений нет</p>
            ) : (
              <div className="space-y-2">
                {features.map((f, i) => (
                  <div key={f.id ?? i} className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-stone-100">{f.name || 'Без названия'}</p>
                          {f.level != null && <Badge tone="accent">{ruLevel(f.level)}</Badge>}
                          {f.is_homebrew && <Badge>Homebrew</Badge>}
                        </div>
                        {f.description && (
                          <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-sm text-stone-400">{f.description}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => setFeatureModal({ index: i })}
                          className="rounded border border-stone-700 px-2 py-0.5 text-[11px] text-stone-300 transition hover:bg-stone-800"
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFeature(f)}
                          className="rounded border border-red-800 px-2 py-0.5 text-[11px] text-red-300 transition hover:bg-red-950/50"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            levelHint={SUBFEATURE_LEVEL_HINT}
            onSave={saveFeature}
            onClose={() => setFeatureModal(null)}
          />
        )
      })()}
    </div>
  )
}
