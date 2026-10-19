import SheetDrawer from '@/components/sheet/SheetDrawer.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi as api } from '@/features/characters/api.js'
import { useCharacterConditions } from '@/features/characters/queries.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { conditionLabels, label } from '@/lib/i18n/index.js'
import { Button, EmptyState, Field, Input, Select } from '@/components/ui'
import { CONDITIONS, EXHAUSTION_LEVELS } from './constants.js'

const SOURCE_MAX = 50

export default function ConditionsPanel({ character, onError }) {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [condition, setCondition] = useState('')
  const [source, setSource] = useState('')
  const [exhaustionLevel, setExhaustionLevel] = useState('')
  const { data: conditions = [] } = useCharacterConditions(character.id)
  const availableConditions = CONDITIONS.filter((c) => !conditions.some((a) => a.condition === c))

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.characters.conditions(Number(character.id)) })

  const add = async () => {
    if (!condition || conditions.some((c) => c.condition === condition)) return
    if (condition === 'EXHAUSTION' && !exhaustionLevel) return
    try {
      await api.conditions.add(character.id, {
        condition,
        source: source || undefined,
        exhaustion_level: condition === 'EXHAUSTION' ? Number(exhaustionLevel) : undefined,
      })
      setCondition('')
      setSource('')
      setExhaustionLevel('')
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
        <Button onClick={() => setFormOpen(true)}><LoreIcon name="plus" /> Добавить</Button>
      </div>

      {conditions.length === 0 ? (
        <EmptyState text="Нет активных состояний" />
      ) : (
        <ul className="space-y-2">
          {conditions.map((c) => (
            <li
              key={c.condition}
              className="character-record-card flex flex-wrap items-center justify-between gap-3"
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
                  className="catalog-delete-button"
                  title="Снять состояние"
                  onClick={() => remove(c.condition)}
                >
                  <LoreIcon name="close" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {formOpen && (
        <SheetDrawer title="Новое состояние" onClose={() => setFormOpen(false)} footer={<>
              <Button variant="ghost" onClick={() => setFormOpen(false)}>Отмена</Button>
              <Button
                onClick={add}
                disabled={
                  !condition ||
                  !availableConditions.includes(condition) ||
                  (condition === 'EXHAUSTION' && !exhaustionLevel)
                }
              >
                Добавить
              </Button>
            </>}>
          <div className="mt-4 grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <Field label="Состояние">
              <Select
                value={condition}
                onChange={(e) => {
                  setCondition(e.target.value)
                  setExhaustionLevel('')
                }}
              >
                <option value="">Выберите...</option>
                {availableConditions.map((c) => (
                  <option key={c} value={c}>{conditionLabels[c] ?? label(c)}</option>
                ))}
              </Select>
            </Field>
            {condition === 'EXHAUSTION' && (
              <Field label="Уровень истощения">
                <Select value={exhaustionLevel} onChange={(e) => setExhaustionLevel(e.target.value)}>
                  <option value="">Выберите уровень...</option>
                  {EXHAUSTION_LEVELS.map((v) => (
                    <option key={v} value={v}>Уровень {v}</option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Источник (необязательно)">
              <Input
                value={source}
                onChange={(e) => setSource(e.target.value.slice(0, SOURCE_MAX))}
                placeholder="Например: заклинание"
                maxLength={SOURCE_MAX}
              />
            </Field>

          </div>
        </SheetDrawer>
      )}
    </div>
  )
}
