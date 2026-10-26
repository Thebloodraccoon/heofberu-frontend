import SheetDrawer from '@/components/sheet/SheetDrawer.jsx'
import { catalogApi } from '@/features/catalog/api.js'
import { catalog } from '@/features/catalog/catalog.js'
import CatalogSearchList from '@/features/catalog/components/CatalogSearchList.jsx'
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import { useCharacterSpells, useCharacterSpellSlots } from '@/features/characters/queries.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { label, sentenceCase } from '@/lib/i18n/index.js'
import { Button } from '@/components/ui'
import { SPELL_LEVEL_ORDER } from './constants.js'
import { SpellDetailFetched } from '../SpellQuickView.jsx'

const LEVEL_TITLE = (lv) => (lv === 'CANTRIP' ? 'Заговоры' : label(lv))
// Уровень задаёт выбранная ячейка — остальные фильтры каталога заклинаний.
const SPELL_FILTERS = catalog.spells.filters.filter((f) => f.name !== 'level')

/**
 * Two-step spell picker modal.
 *
 * Step 1 — pick a spell slot ("cell") to fill. Only slots that still have
 *   capacity and have available spells are offered.
 * Step 2 — fill that cell: only the spells of the chosen level are shown
 *   (respecting class/subclass/race/subrace availability and excluding
 *   already-known spells), capped by the slot's remaining capacity.
 */
export default function SpellPickerModal({ character, onClose, onError }) {
  const queryClient = useQueryClient()
  const characterId = character.id
  const { data: known = [] } = useCharacterSpells(characterId)
  const { data: slots = [] } = useCharacterSpellSlots(characterId)
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(() => new Set())

  const knownIds = useMemo(() => new Set(known.map((sp) => sp.id)), [known])

  const knownCountByLevel = useMemo(() => {
    const counts = {}
    for (const sp of known) counts[sp.level] = (counts[sp.level] ?? 0) + 1
    return counts
  }, [known])

  const slotsByLevel = useMemo(() => {
    const map = {}
    for (const s of slots) map[s.spell_level] = s
    return map
  }, [slots])

  const capacityByLevel = useMemo(() => {
    const knownCount = {}
    for (const sp of known) knownCount[sp.level] = (knownCount[sp.level] ?? 0) + 1
    return Object.fromEntries(
      slots.map((s) => [s.spell_level, Math.max(0, (s.total ?? 0) - (knownCount[s.spell_level] ?? 0))]),
    )
  }, [slots, known])

  // Доступность классу/подклассу/расе/подрасе отсекает сервер (те же правила, что при изучении);
  // здесь убираем только уже известные.
  const blockedSpell = (sp) => knownIds.has(sp.id)
  const availableTo = {
    class_id: character.class_id,
    subclass_id: character.subclass_id,
    race_id: character.race_id,
    subrace_id: character.subrace_id,
  }

  const fillableLevels = useMemo(
    () =>
      SPELL_LEVEL_ORDER.filter((lv) => {
        const cap = capacityByLevel[lv] ?? 0
        return cap > 0
      }),
    [capacityByLevel],
  )

  const levelCap = selectedLevel != null ? capacityByLevel[selectedLevel] ?? 0 : 0

  const toggle = (spell) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(spell.id)) next.delete(spell.id)
      else {
        if (next.size >= levelCap) return prev
        next.add(spell.id)
      }
      return next
    })
  }

  const toggleExpand = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const pickLevel = (lv) => {
    // Ячейка каждый раз открывается с первой страницы.
    queryClient.removeQueries({ queryKey: queryKeys.pickers.characterSpells(characterId) })
    setSelected(new Set())
    setExpanded(new Set())
    setSelectedLevel(lv)
  }

  const back = () => {
    setSelected(new Set())
    setExpanded(new Set())
    setSelectedLevel(null)
  }

  const learnCell = async () => {
    setSaving(true)
    try {
      for (const spellId of selected) await charactersApi.spells.add(characterId, { spell_id: spellId })
      await queryClient.invalidateQueries({ queryKey: queryKeys.characters.spells(Number(characterId)) })
      setSelected(new Set())
      setExpanded(new Set())
      setSelectedLevel(null)
    } catch (err) {
      onError(err)
      await queryClient.invalidateQueries({ queryKey: queryKeys.characters.spells(Number(characterId)) })
      setSelected(new Set())
      setExpanded(new Set())
      setSelectedLevel(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SheetDrawer title="Заклинания" onClose={onClose} bodyClassName={selectedLevel == null ? undefined : 'grant-picker-body'} footer={selectedLevel == null ? <Button variant="ghost" onClick={onClose}>Отмена</Button> : <><Button variant="ghost" onClick={back}>Назад</Button><Button onClick={learnCell} disabled={saving || selected.size === 0}>{saving ? 'Сохраняем…' : 'Выучить ячейку'}</Button></>}>
      {selectedLevel == null ? (
        <>
          <p className="-mt-1 text-xs text-stone-500">
            Выберите ячейку, которую хотите заполнить.
          </p>
          {fillableLevels.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">Нет свободных ячеек для изучения заклинаний.</p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {fillableLevels.map((lv) => {
                const slot = slotsByLevel[lv]
                const known = knownCountByLevel[lv] ?? 0
                const total = slot?.total ?? 0
                return (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => pickLevel(lv)}
                    className="flex items-center justify-between rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-3 text-left transition hover:border-ember/60 hover:bg-stone-900"
                  >
                    <span className="text-sm font-medium text-stone-100">{LEVEL_TITLE(lv)}</span>
                    <span className="rounded bg-ember/15 px-1.5 py-0.5 text-xs font-semibold text-ember">
                      {known} / {total}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

        </>
      ) : (
        <>
          <p className="-mt-1 mb-4 flex items-center justify-between gap-2 text-xs text-stone-500">
            <button type="button" onClick={back} className="font-medium text-ember hover:underline">
              ← Выбрать ячейку
            </button>
            <span><span className="text-stone-300">{LEVEL_TITLE(selectedLevel)}</span> (свободно {levelCap})</span>
          </p>
          <CatalogSearchList
            queryKey={queryKeys.pickers.characterSpells(characterId)}
            list={catalogApi.spells.list}
            params={{ level: selectedLevel, ...availableTo }}
            filters={SPELL_FILTERS}
            pageSize={100}
            exclude={blockedSpell}
            emptyText="Для этой ячейки нет доступных заклинаний."
            listClassName="grant-picker-list pr-1"
          >
            {(spells) => <ul className="space-y-3">
              {spells.map((sp) => {
                const checked = selected.has(sp.id)
                const isOpen = expanded.has(sp.id)
                const blocked = !checked && selected.size >= levelCap
                return (
                  <li
                    key={sp.id}
                    className={`rounded-lg border transition ${
                      checked ? 'border-ember/70' : 'border-stone-700/60 bg-stone-900/60'
                    } ${isOpen ? 'bg-stone-900' : ''} ${blocked ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-center gap-2 px-3 py-1.5">
                      <label className={`flex shrink-0 items-center ${blocked ? 'pointer-events-none' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          id={sp.id}
                          checked={checked}
                          onChange={() => toggle(sp)}
                          disabled={blocked}
                          className="sr-only"
                        />
                        <span
                          aria-hidden
                          className={`flex size-5 items-center justify-center rounded border text-xs transition ${
                            checked ? 'border-ember bg-ember text-white' : 'border-stone-600 bg-stone-800/60 text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                      </label>
                      <label
                        htmlFor={sp.id}
                        className={`min-w-0 flex-1 ${blocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        title={blocked ? 'Нет свободных ячеек этого уровня' : undefined}
                      >
                        <span className="block truncate text-sm text-stone-100">{sentenceCase(sp.name)}</span>
                        <span className="block text-xs text-stone-500">
                          {[sp.school && label(sp.school)].filter(Boolean).join(' · ')}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleExpand(sp.id)}
                        className="flex shrink-0 items-center justify-center rounded p-1 text-stone-400 transition hover:text-stone-100"
                        title={isOpen ? 'Свернуть' : 'Подробнее'}
                        aria-expanded={isOpen}
                      >
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={`size-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                          aria-hidden="true"
                        >
                          <path d="M7 5l6 5-6 5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                    {isOpen && <SpellDetailFetched spellId={sp.id} />}
                  </li>
                )
              })}
            </ul>}
          </CatalogSearchList>
        </>
      )}
    </SheetDrawer>
  )
}
