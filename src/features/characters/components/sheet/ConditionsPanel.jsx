import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi as api } from '@/features/characters/api.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { conditionLabels, label } from '@/lib/i18n/index.js'
import { Button, EmptyState, Field, Input, Select } from '@/components/ui'
import { CONDITIONS } from './constants.js'

const SOURCE_MAX = 50

export default function ConditionsPanel({ character, onError }) {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [condition, setCondition] = useState('')
  const [source, setSource] = useState('')
  const conditions = character.conditions ?? []
  const availableConditions = CONDITIONS.filter((c) => !conditions.some((a) => a.condition === c))

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.characters.detail(Number(character.id)) })

  const add = async () => {
    if (!condition || conditions.some((c) => c.condition === condition)) return
    try {
      await api.conditions.add(character.id, {
        condition,
        source: source || undefined,
      })
      setCondition('')
      setSource('')
      setFormOpen(false)
      await refresh()
    } catch (e) {
      onError(e)
    }
  }

  const remove = async (cond) => {
    try {
      await api.conditions.remove(character.id, cond)
      await refresh()
    } catch (e) {
      onError(e)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="sheet-section-label sheet-section-label--flush self-center leading-none">Активные состояния</p>
        <button
          type="button"
          className="sheet-btn sheet-btn_primary"
          onClick={() => setFormOpen((o) => !o)}
        >
          + Добавить
        </button>
      </div>

      {conditions.length === 0 ? (
        <EmptyState text="Нет активных состояний" />
      ) : (
        <ul className="space-y-2">
          {conditions.map((c) => (
            <li
              key={c.condition}
              className="flex items-center justify-between gap-3 rounded-lg border border-stone-700/60 bg-stone-900/60 px-4 py-2.5"
            >
              <span className="text-sm font-medium text-stone-100">
                {conditionLabels[c.condition] ?? label(c.condition)}
                {c.exhaustion_level != null && (
                  <span className="ml-2 text-xs font-normal text-stone-400">Ур. {c.exhaustion_level}</span>
                )}
              </span>
              <span className="flex items-center gap-2">
                {c.source && <span className="text-xs text-stone-500">{c.source}</span>}
                <button
                  type="button"
                  className="rounded p-1.5 text-sm text-stone-400 transition hover:text-red-300"
                  title="Снять состояние"
                  onClick={() => remove(c.condition)}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {formOpen && (
        <div className="mt-3 rounded-lg border border-stone-700/60 bg-stone-900/60 p-4">
          <p className="sheet-section-label m-0 !mt-0 leading-none">Новое состояние</p>
          <div className="mt-4 grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <Field label="Состояние">
              <Select value={condition} onChange={(e) => setCondition(e.target.value)}>
                <option value="">Выберите...</option>
                {availableConditions.map((c) => (
                  <option key={c} value={c}>{conditionLabels[c] ?? label(c)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Источник (необязательно)">
              <Input
                value={source}
                onChange={(e) => setSource(e.target.value.slice(0, SOURCE_MAX))}
                placeholder="Например: заклинание"
                maxLength={SOURCE_MAX}
              />
            </Field>
            <div className="flex items-end gap-2 sm:col-span-2">
              <Button
                onClick={add}
                disabled={!condition || !availableConditions.includes(condition)}
              >
                Добавить
              </Button>
              <Button variant="ghost" onClick={() => setFormOpen(false)}>Отмена</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
