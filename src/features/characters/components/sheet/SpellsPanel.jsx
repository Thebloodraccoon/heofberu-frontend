import { useMemo, useState } from 'react'
import { charactersApi as api } from '@/features/characters/api.js'
import { label } from '@/lib/i18n/index.js'
import { Button, EmptyState, Field, Select } from '@/components/ui'
import { SPELL_LEVEL_ORDER } from './constants.js'

export default function SpellsPanel({ character, lookups, editing, onChangeSlot, onChanged, onError }) {
  const [spellId, setSpellId] = useState('')
  const spells = character.spells ?? []
  const slots = character.spell_slots ?? []

  const byLevel = useMemo(() => {
    const groups = {}
    for (const cs of character.spells ?? []) {
      const lv = cs.spell?.level ?? 'OTHER'
      if (!groups[lv]) groups[lv] = []
      groups[lv].push(cs)
    }
    return groups
  }, [character.spells])

  const add = async () => {
    if (!spellId) return
    try {
      await api.characters.spells.add(character.id, { spell_id: Number(spellId) })
      setSpellId('')
      await onChanged()
    } catch (e) {
      onError(e)
    }
  }

  const remove = async (sid) => {
    try {
      await api.characters.spells.remove(character.id, sid)
      await onChanged()
    } catch (e) {
      onError(e)
    }
  }

  return (
    <div className="space-y-5">
      {slots.length > 0 && (
        <div>
          <p className="sheet-section-label">Слоты заклинаний</p>
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <div key={slot.spell_level} className="sheet-boxed">
                <div className="sheet-boxed__box min-w-0 flex-col !gap-0.5 !px-3">
                  <span className="text-sm">{slot.used} / {slot.total}</span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      disabled={slot.used <= 0}
                      onClick={() => onChangeSlot(slot.spell_level, slot.used - 1)}
                      className="sheet-btn !px-1.5"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      disabled={slot.used >= slot.total}
                      onClick={() => onChangeSlot(slot.spell_level, slot.used + 1)}
                      className="sheet-btn !px-1.5"
                    >
                      +
                    </button>
                  </span>
                </div>
                <span className="sheet-boxed__label">{label(slot.spell_level)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="sheet-section-label">Заклинания</p>
        {spells.length === 0 && <EmptyState text="Заклинаний пока нет" />}
        <div className="space-y-4">
          {SPELL_LEVEL_ORDER.filter((lv) => byLevel[lv]).map((lv) => (
            <div key={lv}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
                {lv === 'CANTRIP' ? 'Заговоры' : label(lv)}
              </p>
              <ul className="space-y-2">
                {byLevel[lv].map((cs) => {
                  const sp = cs.spell || {}
                  return (
                    <li key={cs.spell_id} className="rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-100">{sp.name || `Заклинание #${cs.spell_id}`}</p>
                          <p className="mt-0.5 text-xs text-stone-400">
                            {[sp.school && label(sp.school), sp.cast_time && label(sp.cast_time)].filter(Boolean).join(' · ')}
                          </p>
                          {sp.range_type && (
                            <p className="mt-0.5 text-xs text-stone-400">
                              Дистанция: {label(sp.range_type)}{sp.range_value ? ` (${sp.range_value})` : ''}
                              {sp.duration ? ` · ${label(sp.duration)}` : ''}
                            </p>
                          )}
                        </div>
                        {editing && (
                          <button type="button" className="sheet-btn shrink-0" onClick={() => remove(cs.spell_id)}>
                            Убрать
                          </button>
                        )}
                      </div>
                      {sp.description && <p className="mt-2 text-sm text-stone-400">{sp.description}</p>}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <div className="flex items-end gap-2">
          <Field label="Добавить заклинание">
            <Select value={spellId} onChange={(e) => setSpellId(e.target.value)}>
              <option value="">Выберите...</option>
              {lookups.spells.map((sp) => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </Select>
          </Field>
          <Button onClick={add}>Добавить</Button>
        </div>
      )}
    </div>
  )
}
