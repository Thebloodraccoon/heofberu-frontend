import { useState } from 'react'
import { charactersApi as api } from '@/features/characters/api.js'
import { conditionLabels, label } from '@/lib/i18n/index.js'
import { Button, EmptyState, Field, Input, Modal, Select } from '@/components/ui'
import { CONDITIONS } from './constants.js'

export default function ConditionsModal({ character, onClose, onChanged, onError }) {
  const [condition, setCondition] = useState('')
  const [exhaustion, setExhaustion] = useState('')
  const [source, setSource] = useState('')
  const conditions = character.conditions ?? []

  const add = async () => {
    if (!condition) return
    try {
      await api.characters.conditions.add(character.id, {
        condition,
        exhaustion_level: exhaustion ? Number(exhaustion) : null,
        source: source || undefined,
      })
      setExhaustion('')
      setSource('')
      await onChanged()
    } catch (e) {
      onError(e)
    }
  }

  const remove = async (cond) => {
    try {
      await api.characters.conditions.remove(character.id, cond)
      await onChanged()
    } catch (e) {
      onError(e)
    }
  }

  return (
    <Modal title="Состояния" onClose={onClose} size="md">
        {conditions.length === 0 ? (
          <EmptyState text="Нет активных состояний" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {conditions.map((c) => (
              <span key={c.condition} className="sheet-chip sheet-chip_on">
                <span className="sheet-chip__dot" />
                {conditionLabels[c.condition] ?? label(c.condition)}
                {c.exhaustion_level != null && <span className="text-stone-400">Ур. {c.exhaustion_level}</span>}
                {c.source && <span className="text-stone-400">{c.source}</span>}
                <button type="button" className="ml-0.5 text-stone-400 hover:text-red-300" onClick={() => remove(c.condition)} title="Снять состояние">×</button>
              </span>
            ))}
          </div>
        )}
        <div className="mt-5 grid gap-3 border-t border-stone-700/70 pt-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Состояние">
              <Select value={condition} onChange={(e) => setCondition(e.target.value)}>
                <option value="">Выберите...</option>
                {CONDITIONS.map((c) => <option key={c} value={c}>{conditionLabels[c] ?? label(c)}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Уровень истощения">
            <Input type="number" min="1" max="6" value={exhaustion} onChange={(e) => setExhaustion(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button onClick={add} className="w-full">Добавить</Button>
          </div>
          <Field label="Источник">
            <Input value={source} onChange={(e) => setSource(e.target.value)} />
          </Field>
        </div>
    </Modal>
  )
}
