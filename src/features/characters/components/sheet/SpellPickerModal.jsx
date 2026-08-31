import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import { useCharacterSpells, useCharacterSpellSlots } from '@/features/characters/queries.js'
import { useSpells } from '@/features/catalog/queries.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { label } from '@/lib/i18n/index.js'
import { Button, Modal } from '@/components/ui'
import { SPELL_LEVEL_ORDER } from './constants.js'

/**
 * Spell picker modal. Groups available spells by level, respecting:
 *  - class/subclass/race/subrace availability lists on the spell — a
 *    non-empty list requires membership, an empty list never excludes
 *    (same four-dimension rule the backend enforces on add);
 *  - per-level capacity from the character's spell slots (known count
 *    must stay below the slot total).
 */
export default function SpellPickerModal({ character, onClose, onError }) {
  const queryClient = useQueryClient()
  const characterId = character.id
  const { data: catalog = [] } = useSpells({ size: 100 })
  const { data: known = [] } = useCharacterSpells(characterId)
  const { data: slots = [] } = useCharacterSpellSlots(characterId)
  const [selected, setSelected] = useState(() => new Set())
  const [saving, setSaving] = useState(false)

  const knownIds = useMemo(() => new Set(known.map((cs) => cs.spell_id)), [known])

  const knownCountByLevel = useMemo(() => {
    const counts = {}
    for (const cs of known) {
      const lv = cs.spell?.level ?? cs.level
      counts[lv] = (counts[lv] ?? 0) + 1
    }
    return counts
  }, [known])

  const capacityByLevel = useMemo(() => {
    const knownCount = {}
    for (const cs of known) knownCount[cs.spell?.level ?? cs.level] = (knownCount[cs.spell?.level ?? cs.level] ?? 0) + 1
    return Object.fromEntries(
      slots.map((s) => [s.spell_level, Math.max(0, (s.total ?? 0) - (knownCount[s.spell_level] ?? 0))]),
    )
  }, [slots, known])

  const groups = useMemo(() => {
    const matches = (list, id) =>
      !list?.length || (id != null && list.some((x) => Number(x.id) === Number(id)))
    const allowed = (sp) => {
      if (knownIds.has(sp.id)) return false
      if (!matches(sp.available_classes, character.class_id)) return false
      if (!matches(sp.available_subclasses, character.subclass_id)) return false
      if (!matches(sp.available_races, character.race_id)) return false
      if (!matches(sp.available_subraces, character.subrace_id)) return false
      return true
    }
    const byLevel = {}
    for (const sp of catalog) {
      if (!allowed(sp)) continue
      ;(byLevel[sp.level] ??= []).push(sp)
    }
    for (const list of Object.values(byLevel)) list.sort((a, b) => a.name.localeCompare(b.name))
    return byLevel
  }, [catalog, character, knownIds])

  const levels = SPELL_LEVEL_ORDER.filter((lv) => groups[lv]?.length)

  const toggle = (spell, lv) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(spell.id)) next.delete(spell.id)
      else {
        const cap = capacityByLevel[lv] ?? 0
        const pickedInLevel = [...next]
          .map((id) => catalog.find((s) => s.id === id))
          .filter((s) => s && s.level === lv).length
        if (pickedInLevel >= cap) return prev
        next.add(spell.id)
      }
      return next
    })
  }

  const submit = async () => {
    setSaving(true)
    try {
      for (const spellId of selected) await charactersApi.spells.add(characterId, { spell_id: spellId })
      await queryClient.invalidateQueries({ queryKey: queryKeys.characters.spells(Number(characterId)) })
      onClose()
    } catch (err) {
      onError(err)
      await queryClient.invalidateQueries({ queryKey: queryKeys.characters.spells(Number(characterId)) })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Заклинания" onClose={onClose} size="lg">
      <p className="-mt-1 text-xs text-stone-500">
        Доступны заклинания вашего класса, подкласса, расы и подрасы; количество ограничено ячейками по уровню.
      </p>
      {slots.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {slots.map((slot) => {
            const known = knownCountByLevel[slot.spell_level] ?? 0
            const full = known >= slot.total
            return (
              <div key={slot.spell_level} className="flex flex-col items-center gap-0.5">
                <span
                  className={`flex min-w-[2.75rem] items-center justify-center rounded-md border px-1.5 py-1 text-sm font-bold ${
                    full
                      ? 'border-stone-700 bg-stone-800 text-stone-500'
                      : 'border-ember/60 bg-stone-800 text-stone-100'
                  }`}
                >
                  {known} / {slot.total}
                </span>
                <span className="text-[10px] text-stone-500">{label(slot.spell_level)}</span>
              </div>
            )
          })}
        </div>
      )}
      <div className="mt-3 max-h-[55vh] space-y-4 overflow-y-auto pr-1">
        {levels.length === 0 && <p className="text-sm text-stone-500">Нет доступных заклинаний.</p>}
        {levels.map((lv) => {
          const cap = capacityByLevel[lv] ?? 0
          const full = cap === 0
          return (
            <div key={lv}>
              <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                {lv === 'CANTRIP' ? 'Заговоры' : label(lv)}
                <span className={`rounded px-1.5 py-0.5 ${full ? 'bg-stone-800 text-stone-500' : 'bg-stone-800 text-ember'}`}>
                  свободно: {cap}
                </span>
              </p>
              <ul className="space-y-1">
                {groups[lv].map((sp) => {
                  const checked = selected.has(sp.id)
                  return (
                    <li key={sp.id}>
                      <label
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 transition ${
                          checked ? 'border-ember/70 bg-stone-900' : 'border-stone-700/60 bg-stone-900/60 hover:border-stone-600'
                        } ${!checked && full ? 'pointer-events-none opacity-40' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(sp, lv)}
                          className="size-4 accent-ember"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-stone-100">{sp.name}</span>
                          <span className="block text-xs text-stone-500">
                            {[sp.school && label(sp.school)].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex items-center justify-end gap-2 pt-3">
        <Button variant="ghost" onClick={onClose}>Отмена</Button>
        <Button onClick={submit} disabled={saving || selected.size === 0}>
          Выучить{selected.size > 0 ? ` (${selected.size})` : ''}
        </Button>
      </div>
    </Modal>
  )
}
