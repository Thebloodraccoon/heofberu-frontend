import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import { useCharacterSpells, useCharacterSpellSlots } from '@/features/characters/queries.js'
import { useSpells, useSpellDetail } from '@/features/catalog/queries.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { label, diceTypeLabels } from '@/lib/i18n/index.js'
import { Button, Modal, Skeleton } from '@/components/ui'
import { SPELL_LEVEL_ORDER } from './constants.js'

const LEVEL_TITLE = (lv) => (lv === 'CANTRIP' ? 'Заговоры' : label(lv))

const COMPONENT_FULL = { VERBAL: 'Вербальный', SOMATIC: 'Соматический', MATERIAL: 'Материальный' }

function SpellDetailFetched({ spellId }) {
  const { data: sp, isLoading } = useSpellDetail(spellId)
  if (isLoading || !sp) {
    return (
      <div className="border-t border-stone-800 px-3 py-2.5 text-sm text-stone-400">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="mt-2 h-3 w-1/2" />
      </div>
    )
  }
  return <SpellDetail sp={sp} />
}

function SpellDetail({ sp }) {
  const components = (sp.components ?? []).map((c) => COMPONENT_FULL[c] ?? label(c)).join(', ')
  const rangeText =
    sp.range_value != null && sp.range_value !== ''
      ? `${sp.range_value} футов`
      : sp.range_type
        ? label(sp.range_type)
        : null
  const durationText = sp.duration
    ? sp.is_concentration
      ? `Концентрация, вплоть до ${label(sp.duration)}`
      : label(sp.duration)
    : null
  const componentsText =
    sp.components && sp.components.length > 0
      ? sp.components.includes('MATERIAL') && sp.material
        ? `${components} (${sp.material})`
        : components
      : null
  const damageText =
    sp.damage_dice_count && sp.damage_dice_type
      ? `${sp.damage_dice_count}${diceTypeLabels[sp.damage_dice_type] ?? sp.damage_dice_type}${
          sp.damage_type ? ` ${label(sp.damage_type)}` : ''
        }`.trim()
      : null
  const healingText =
    sp.healing_dice_count && sp.healing_dice_type
      ? `${sp.healing_dice_count}${diceTypeLabels[sp.healing_dice_type] ?? sp.healing_dice_type}${
          sp.healing_target ? ` ${label(sp.healing_target)}` : ''
        }`.trim()
      : null
  const rows = [
    sp.school ? { label: 'Школа', value: label(sp.school) } : null,
    sp.cast_time ? { label: 'Время накладывания', value: label(sp.cast_time) } : null,
    rangeText ? { label: 'Дистанция', value: rangeText } : null,
    durationText ? { label: 'Длительность', value: durationText } : null,
    componentsText ? { label: 'Компоненты', value: componentsText } : null,
    damageText ? { label: 'Урон', value: damageText } : null,
    healingText ? { label: 'Лечение', value: healingText } : null,
  ].filter(Boolean)
  const description = sp.description?.trim()

  return (
    <div className="border-t border-stone-800 px-3 py-2.5 text-sm text-stone-400">
      {rows.length > 0 && (
        <dl className="mb-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          {rows.map(({ label: l, value }) => (
            <div key={l} className="col-span-2 flex gap-2">
              <dt className="shrink-0 text-stone-500">{l}:</dt>
              <dd className="text-stone-300">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {description ? (
        <p className="whitespace-pre-wrap border-l-2 border-ember/50 pl-3 leading-relaxed text-stone-200">
          {description}
        </p>
      ) : (
        <span className="text-stone-500">Описание отсутствует</span>
      )}
      {sp.higher_levels && (
        <div className="mt-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
            На более высоких уровнях
          </p>
          <p className="whitespace-pre-wrap leading-relaxed text-stone-300">{sp.higher_levels}</p>
        </div>
      )}
    </div>
  )
}

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
  const { data: catalog = [] } = useSpells({ size: 100 })
  const { data: known = [] } = useCharacterSpells(characterId)
  const { data: slots = [] } = useCharacterSpellSlots(characterId)
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(() => new Set())

  const knownIds = useMemo(() => new Set(known.map((cs) => cs.spell_id)), [known])

  const knownCountByLevel = useMemo(() => {
    const counts = {}
    for (const cs of known) {
      const lv = cs.spell?.level ?? cs.level
      counts[lv] = (counts[lv] ?? 0) + 1
    }
    return counts
  }, [known])

  const slotsByLevel = useMemo(() => {
    const map = {}
    for (const s of slots) map[s.spell_level] = s
    return map
  }, [slots])

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

  const fillableLevels = useMemo(
    () =>
      SPELL_LEVEL_ORDER.filter((lv) => {
        const cap = capacityByLevel[lv] ?? 0
        return cap > 0 && (groups[lv] ?? []).length > 0
      }),
    [capacityByLevel, groups],
  )

  const levelCap = selectedLevel != null ? capacityByLevel[selectedLevel] ?? 0 : 0
  const chosenForLevel = [...selected].map((id) => catalog.find((s) => s.id === id))

  const toggle = (spell) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(spell.id)) next.delete(spell.id)
      else {
        if (chosenForLevel.length >= levelCap) return prev
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
    <Modal title="Заклинания" onClose={onClose} size="lg">
      {selectedLevel == null ? (
        <>
          <p className="-mt-1 text-xs text-stone-500">
            Выберите ячейку, которую хотите заполнить.
          </p>
          {fillableLevels.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">Все ячейки заполнены или доступных заклинаний нет.</p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {fillableLevels.map((lv) => {
                const slot = slotsByLevel[lv]
                const known = knownCountByLevel[lv] ?? 0
                const total = slot?.total ?? 0
                const cap = capacityByLevel[lv] ?? 0
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
          <div className="mt-4 flex items-center justify-end gap-2 pt-3">
            <Button variant="ghost" onClick={onClose}>Отмена</Button>
          </div>
        </>
      ) : (
        <>
          <p className="-mt-1 flex items-center justify-between gap-2 text-xs text-stone-500">
            <button type="button" onClick={back} className="font-medium text-ember hover:underline">
              ← Выбрать ячейку
            </button>
            <span><span className="text-stone-300">{LEVEL_TITLE(selectedLevel)}</span> (свободно {levelCap})</span>
          </p>
          <div className="mt-3 max-h-[55vh] space-y-1 overflow-y-auto pr-1">
            {(groups[selectedLevel] ?? []).length === 0 && (
              <p className="text-sm text-stone-500">Для этой ячейки нет доступных заклинаний.</p>
            )}
            <ul className="space-y-1">
              {groups[selectedLevel]?.map((sp) => {
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
                        <span className="block truncate text-sm text-stone-100">{sp.name}</span>
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
            </ul>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2 pt-3">
            <Button variant="ghost" onClick={back}>Назад</Button>
            <Button onClick={learnCell} disabled={saving || selected.size === 0}>
              {saving
                ? 'Сохраняем…'
                : selected.size > 0
                  ? `Выучить ячейку`
                  : 'Выучить ячейку'}
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}
