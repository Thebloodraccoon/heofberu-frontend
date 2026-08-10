import { useEffect, useState } from 'react'
import { api } from '../api/endpoints.js'
import FeatureModal from './FeaturesModal.jsx'
import { ruLevel } from '../labels.js'
import { Badge, Button, ErrorBox, Field, Input, Spinner, TextArea } from './ui.jsx'

const blankSubclass = () => ({
  name: '',
  archetype_group_name: '',
  unlock_level: '3',
  description: '',
  is_homebrew: false,
  features: [],
})

const fullToEntry = (s) => ({
  id: s.id,
  name: s.name,
  archetype_group_name: s.archetype_group_name ?? '',
  unlock_level: s.unlock_level != null ? String(s.unlock_level) : '3',
  description: s.description ?? '',
  is_homebrew: !!s.is_homebrew,
  features: (s.features ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description ?? '',
    level: f.level ?? null,
    is_homebrew: !!f.is_homebrew,
  })),
})

export default function SubclassModal({ title, subtitle, classId, value = null, onSave, onClose }) {
  const needsLoad = value?.id != null && !Array.isArray(value?.features)
  const [loading, setLoading] = useState(needsLoad)
  const [loadError, setLoadError] = useState(null)
  const [edit, setEdit] = useState(() =>
    needsLoad ? blankSubclass() : { ...blankSubclass(), ...(value ?? {}) }
  )
  const [featureModal, setFeatureModal] = useState(null)

  useEffect(() => {
    if (!needsLoad) return undefined
    let active = true
    api.classes.subclasses
      .get(classId, value.id)
      .then((full) => {
        if (!active) return
        setEdit(fullToEntry(full))
        setLoading(false)
      })
      .catch((e) => {
        if (!active) return
        setLoadError(e)
        setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setField = (key) => (e) => setEdit((d) => ({ ...d, [key]: e.target.value }))
  const toggleHomebrew = (e) => setEdit((d) => ({ ...d, is_homebrew: e.target.checked }))

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

        {loading ? (
          <div className="flex-1 p-5">
            <Spinner label="Загружаем подкласс..." />
          </div>
        ) : (
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {loadError && <ErrorBox error={loadError} onRetry={() => {}} />}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Название подкласса">
                <Input value={edit.name} onChange={setField('name')} placeholder="Например, Школа Воплощения" autoFocus />
              </Field>
              <Field label="Название группы (архетипа)">
                <Input
                  value={edit.archetype_group_name}
                  onChange={setField('archetype_group_name')}
                  placeholder="Например, Школа магии"
                />
              </Field>
              <Field label="Уровень получения">
                <Input type="number" min={1} max={20} value={edit.unlock_level} onChange={setField('unlock_level')} />
              </Field>
            </div>

            <Field label="Описание">
              <TextArea value={edit.description} onChange={setField('description')} rows={3} />
            </Field>

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
              {edit.features.length === 0 ? (
                <p className="text-sm text-stone-500">Умений нет</p>
              ) : (
                <div className="space-y-2">
                  {edit.features.map((f, i) => (
                    <div key={i} className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-stone-100">{f.name || 'Без названия'}</p>
                            {f.level != null && <Badge tone="accent">{ruLevel(f.level)}</Badge>}
                            {f.is_homebrew && <Badge>Homebrew</Badge>}
                          </div>
                          {f.description && (
                            <p className="mt-0.5 line-clamp-2 text-sm text-stone-400">{f.description}</p>
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
                            onClick={() =>
                              setEdit((d) => ({ ...d, features: d.features.filter((_, idx) => idx !== i) }))
                            }
                            className="rounded border border-red-800 px-2 py-0.5 text-[11px] text-red-300 transition hover:bg-red-950/50"
                          >
                            Убрать
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label className="flex w-fit cursor-pointer items-center gap-2 rounded border border-stone-700 bg-stone-800/70 px-3 py-2">
              <input
                type="checkbox"
                checked={!!edit.is_homebrew}
                onChange={toggleHomebrew}
                className="size-4 accent-ember"
              />
              <span className="text-sm text-stone-200">Homebrew</span>
            </label>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-stone-700/70 p-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" disabled={loading} onClick={() => onSave(edit)}>
            Сохранить
          </Button>
        </div>
      </div>

      {featureModal && (() => {
        const row = featureModal.index == null ? null : edit.features[featureModal.index]
        return (
          <FeatureModal
            title={
              featureModal.index == null
                ? 'Добавить умение'
                : `Изменить: ${row?.name || 'умение'}`
            }
            subtitle={edit.name}
            value={row}
            showLevel
            levelHint="Уровень, с которого умение доступно. Оставьте пустым — доступно сразу."
            onSave={(next) => {
              setEdit((d) => {
                const list = d.features
                const updated =
                  featureModal.index == null
                    ? [...list, next]
                    : list.map((x, idx) => (idx === featureModal.index ? next : x))
                return { ...d, features: updated }
              })
              setFeatureModal(null)
            }}
            onClose={() => setFeatureModal(null)}
          />
        )
      })()}
    </div>
  )
}
