import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import { useCharacterSpellSlots, useCharacterSpells } from '@/features/characters/queries.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { label } from '@/lib/i18n/index.js'
import { EmptyState } from '@/components/ui'
import { SPELL_LEVEL_ORDER } from './constants.js'
import SpellPickerModal from './SpellPickerModal.jsx'

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
)

export default function SpellsPanel({ character, onError }) {
  const queryClient = useQueryClient()
  const { data: spells = [] } = useCharacterSpells(character.id)
  const { data: slots = [] } = useCharacterSpellSlots(character.id)
  const [pickerOpen, setPickerOpen] = useState(false)

  const knownByLevel = useMemo(() => {
    const counts = {}
    for (const cs of spells) {
      const lv = cs.spell?.level ?? 'OTHER'
      counts[lv] = (counts[lv] ?? 0) + 1
    }
    return counts
  }, [spells])

  const removeSpell = async (spellId) => {
    try {
      await charactersApi.spells.remove(character.id, spellId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.characters.spells(Number(character.id)) })
    } catch (e) {
      onError(e)
    }
  }

  const byLevel = useMemo(() => {
    const groups = {}
    for (const cs of spells) {
      const lv = cs.spell?.level ?? 'OTHER'
      ;(groups[lv] ??= []).push(cs)
    }
    return groups
  }, [spells])

  return (
    <div className="space-y-5">
      {slots.length > 0 && (
        <div>
          <p className="sheet-section-label">Слоты заклинаний</p>
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => {
              const known = knownByLevel[slot.spell_level] ?? 0
              const full = known >= slot.total
              return (
                <div key={slot.spell_level} className="sheet-boxed">
                  <div className="sheet-boxed__box min-w-0 flex-col !gap-0.5 !px-3">
                    <span className={`text-sm ${full ? 'text-stone-500' : 'text-stone-100'}`}>
                      {known} / {slot.total}
                    </span>
                  </div>
                  <span className="sheet-boxed__label">{label(slot.spell_level)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <p className="sheet-section-label sheet-section-label--flush self-center leading-none">Заклинания</p>
          <button type="button" className="sheet-btn sheet-btn_primary" onClick={() => setPickerOpen(true)}>
            + Добавить заклинание
          </button>
        </div>

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
                        <button
                          type="button"
                          className="shrink-0 rounded p-1.5 text-stone-400 transition hover:bg-stone-800 hover:text-red-300"
                          title="Забыть заклинание"
                          onClick={() => removeSpell(cs.spell_id)}
                        >
                          <TrashIcon />
                        </button>
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

      {pickerOpen && (
        <SpellPickerModal
          character={character}
          onClose={() => setPickerOpen(false)}
          onError={onError}
        />
      )}
    </div>
  )
}
