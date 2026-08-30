import { Fragment, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import { useCharacterAttacks } from '@/features/characters/queries.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { useUiSet } from '@/lib/uiState.js'
import { EmptyState } from '@/components/ui'
import { RollButton } from '@/components/sheet/primitives.jsx'
import { num } from './constants.js'
import AttackModal from './AttackModal.jsx'

const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
)
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
)
const NoteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 5h14M5 10h14M5 15h9" strokeLinecap="round" />
  </svg>
)

const fmtPlus = (n) => {
  const v = Number(n ?? 0)
  return v >= 0 ? `+${v}` : String(v)
}

const damageLabel = (a) => {
  const dice = a.damage_dice_count && a.damage_dice_type
    ? `${a.damage_dice_count}${a.damage_dice_type.replace('D', 'к')}`
    : null
  const bonus = num(a.bonus_damage) ?? 0
  if (!dice) return bonus ? fmtPlus(bonus) : '+0'
  return bonus ? `${dice} ${fmtPlus(bonus)}` : dice
}

export default function AttacksPanel({ characterId, attackBonus, onRoll, onError }) {
  const queryClient = useQueryClient()
  const { data: attacks = [] } = useCharacterAttacks(characterId)
  const [modal, setModal] = useState(null) // null | 'new' | attack object
  const [notesIds, toggleNotesId] = useUiSet(`attackNotes:${characterId}`)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.characters.attacks(Number(characterId)) })

  const remove = async (attackId) => {
    try {
      await charactersApi.attacks.remove(characterId, attackId)
      await invalidate()
    } catch (err) {
      onError(err)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="sheet-section-label sheet-section-label--flush self-center leading-none">Атаки персонажа</p>
        <button type="button" className="sheet-btn sheet-btn_primary" onClick={() => setModal('new')}>
          + Добавить атаку
        </button>
      </div>

      {attacks.length === 0 && <EmptyState text="Атак пока нет" />}
      {attacks.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-stone-700/60">
          <table className="w-full">
            <thead>
              <tr>
                <th className="w-full px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">Название</th>
                <th className="whitespace-nowrap px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">Атака</th>
                <th className="whitespace-nowrap px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">Урон</th>
                <th className="whitespace-nowrap px-3 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500">Настройки</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 bg-stone-900/60">
              {attacks.map((a) => {
                const open = notesIds.includes(String(a.id))
                const attack = attackBonus(a)
                const dmg = num(a.bonus_damage) ?? 0
                return (
                  <Fragment key={a.id}>
                    <tr>
                      <td className="w-full px-3 py-2 align-middle">
                        <div className="flex min-w-0 items-baseline gap-2">
                          <span className="truncate text-sm font-medium text-stone-100">{a.name}</span>
                          {a.range ? <span className="shrink-0 text-xs text-stone-500">{a.range}</span> : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-middle">
                        <RollButton
                          bonus={attack}
                          onClick={() => onRoll(`Атака: ${a.name}`, attack)}
                          title={`Бросок атаки: ${a.name}`}
                          className="!min-w-11"
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-middle">
                        <RollButton
                          label={damageLabel(a)}
                          onClick={() => onRoll(`Урон: ${a.name}`, dmg)}
                          title={`Бросок урона: ${a.name} ${fmtPlus(dmg)}`}
                          className="!min-w-[4.5rem]"
                        />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className={`relative rounded p-1.5 transition ${
                              open ? 'text-ember hover:bg-stone-800' : 'text-stone-400 hover:bg-stone-800 hover:text-ember'
                            }`}
                            title={open ? 'Скрыть заметку' : 'Показать заметку'}
                            onClick={() => toggleNotesId(String(a.id))}
                          >
                            <NoteIcon />
                            {a.notes?.trim() && !open && (
                              <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-amber-400" />
                            )}
                          </button>
                          <button
                            type="button"
                            className="rounded p-1.5 text-stone-400 transition hover:bg-stone-800 hover:text-ember"
                            title="Изменить"
                            onClick={() => setModal(a)}
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1.5 text-stone-400 transition hover:bg-stone-800 hover:text-red-300"
                            title="Удалить"
                            onClick={() => remove(a.id)}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={4} className="border-t border-stone-800 bg-stone-900/40 px-3 py-3">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Заметка</p>
                          {a.notes?.trim() ? (
                            <p className="whitespace-pre-wrap border-l-2 border-ember/50 pl-3 text-sm leading-relaxed text-stone-300">
                              {a.notes}
                            </p>
                          ) : (
                            <span className="text-sm text-stone-500">Нет заметки</span>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <AttackModal
          characterId={characterId}
          attack={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={invalidate}
          onError={onError}
        />
      )}
    </div>
  )
}