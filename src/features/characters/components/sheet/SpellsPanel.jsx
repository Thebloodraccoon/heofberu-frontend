import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import { useCharacterSpellSlots, useCharacterSpells } from '@/features/characters/queries.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { abilityName } from '@/lib/utils/ability.js'
import { diceTypeLabels, label } from '@/lib/i18n/index.js'
import { EmptyState } from '@/components/ui'
import { useUiSet } from '@/lib/uiState.js'
import { SPELL_LEVEL_ORDER } from './constants.js'
import SpellPickerModal from './SpellPickerModal.jsx'

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
)

const COMPONENT_FULL = { VERBAL: 'Вербальный', SOMATIC: 'Соматический', MATERIAL: 'Материальный' }

function SpellFacts({ sp }) {
  const components = (sp.components ?? [])
    .map((c) => COMPONENT_FULL[c] ?? label(c))
    .join(', ')
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

  return (
    <dl className="mb-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
      {rows.map(({ label, value }) => (
        <div key={label} className="col-span-2 flex gap-2">
          <dt className="shrink-0 text-stone-500">{label}:</dt>
          <dd className="text-stone-300">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function SpellRow({ cs, open, onExpand, onRemove }) {
  const sp = cs.spell || {}
  const description = sp.description?.trim()
  return (
    <li className="rounded-lg border border-stone-700/60 bg-stone-900/60">
      <div className="flex w-full items-center gap-2">
        <button
          type="button"
          onClick={onExpand}
          className="flex min-w-0 flex-1 items-center gap-2 px-4 py-2.5 text-left"
        >
          <span className={`text-stone-500 transition ${open ? 'rotate-90' : ''}`}>›</span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-100">
            {sp.name || `Заклинание #${cs.spell_id}`}
          </span>
          {sp.school && <span className="shrink-0 text-xs text-stone-500">{label(sp.school)}</span>}
        </button>
        <button
          type="button"
          className="mr-2 inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded text-stone-400 transition hover:bg-stone-800 hover:text-red-300"
          title="Забыть заклинание"
          onClick={onRemove}
        >
          <TrashIcon />
        </button>
      </div>
      {open && (
        <div className="border-t border-stone-800 px-4 py-3 text-sm text-stone-400">
          <SpellFacts sp={sp} />
          {description ? (
            <p className="whitespace-pre-wrap border-l-2 border-ember/50 pl-3 leading-relaxed text-stone-200">
              {description}
            </p>
          ) : (
            <span className="text-stone-500">Описание отсутствует</span>
          )}
        </div>
      )}
    </li>
  )
}

export default function SpellsPanel({ character, classSpellcastingAbility, onError }) {
  const queryClient = useQueryClient()
  const { data: spells = [] } = useCharacterSpells(character.id)
  const { data: slots = [] } = useCharacterSpellSlots(character.id)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [openIds, toggleId] = useUiSet(`spells:${character.id}`)

  const hasSpellcasting = !!classSpellcastingAbility

  const totalFilled = spells.length
  const totalSlots = slots.reduce((s, x) => s + (x.total ?? 0), 0)
  const slotsFull = totalSlots > 0 && totalFilled >= totalSlots

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

  const cantripsCount = (byLevel.CANTRIP ?? []).length
  const cantripTotal = slots.find((s) => s.spell_level === 'CANTRIP')?.total ?? 0
  const cantripsFull = cantripTotal === 0 || cantripsCount >= cantripTotal

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between">
          <p className="sheet-section-label sheet-section-label--flush self-center leading-none">
            Заклинания
            {hasSpellcasting && totalSlots > 0 && (
              <span className={`ml-2 rounded px-1.5 py-0.5 text-xs font-semibold ${
                slotsFull ? 'bg-stone-800 text-stone-500' : 'bg-ember/15 text-ember'
              }`}>
                {totalFilled} / {totalSlots}
              </span>
            )}
          </p>
          <button
            type="button"
            className={`sheet-btn sheet-btn_primary ${!slotsFull && hasSpellcasting ? 'sheet-btn_warn-pulse' : ''}`}
            onClick={() => setPickerOpen(true)}
            disabled={!hasSpellcasting}
            title={classSpellcastingAbility ? `Характеристика заклинаний: ${abilityName(classSpellcastingAbility)}` : undefined}
          >
            + Добавить заклинание
          </button>
        </div>

        {!hasSpellcasting && (
          <p className="mt-2 rounded-md border border-stone-700/60 bg-stone-900/60 px-3 py-2 text-xs text-stone-400">
            У вашего класса нет возможности использовать заклинания.
          </p>
        )}

        {hasSpellcasting && spells.length === 0 && <EmptyState text="Заклинаний пока нет" />}
        <div className="space-y-4">
          {SPELL_LEVEL_ORDER.filter((lv) => byLevel[lv]).map((lv) => (
            <div key={lv}>
              <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                {lv === 'CANTRIP' ? 'Заговоры' : label(lv)}
                {lv === 'CANTRIP' && cantripTotal > 0 && (
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                    cantripsFull ? 'bg-stone-800 text-stone-500' : 'bg-ember/15 text-ember'
                  }`}>
                    {cantripsCount} / {cantripTotal}
                  </span>
                )}
              </p>
              <ul className="space-y-2">
                {byLevel[lv].map((cs) => (
                  <SpellRow
                    key={cs.spell_id}
                    cs={cs}
                    open={openIds.includes(String(cs.spell_id))}
                    onExpand={() => toggleId(String(cs.spell_id))}
                    onRemove={() => removeSpell(cs.spell_id)}
                  />
                ))}
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
