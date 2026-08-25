import { Fragment, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import { useCharacterAttacks } from '@/features/characters/queries.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { useUiSet } from '@/lib/uiState.js'
import { label } from '@/lib/i18n/index.js'
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

export default function AttacksPanel({ characterId, attackBonus, onRoll, onError }) {
  const queryClient = useQueryClient()
  const { data: attacks = [] } = useCharacterAttacks(characterId)
  const [modal, setModal] = useState(null) // null | 'new' | attack object
  const [notesIds, toggleNotesId] = useUiSet(`attackNotes:${characterId}`)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.characters.attacks(Number(characterId)) })

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
        <p className="sheet-section-label m-0 !mt-0 self-center leading-none">Атаки персонажа</p>
        <button type="button" className="sheet-btn sheet-btn_primary" onClick={() => setModal('new')}>
          + Добавить атаку
        </button>
      </div>

      {attacks.length === 0 && <EmptyState text="Атак пока нет" />}
      {attacks.length > 0 && (
        <div className="space-y-2">
          {attacks.map((a) => {
            const damage = a.damage_dice_count && a.damage_dice_type
              ? `${a.damage_dice_count}${a.damage_dice_type.replace('D', 'к')}${
                  a.damage_type ? ` ${label(a.damage_type).toLowerCase()}` : ''
                }`
              : '—'
            return (
              <Fragment key={a.id}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-x-3 rounded-lg border border-stone-700/60 bg-stone-900/60 px-4 py-2.5">
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="truncate text-left text-sm font-medium text-stone-100 hover:text-ember"
                      title="Показать заметку"
                      onClick={() => toggleNotesId(String(a.id))}
                    >
                      {a.name}
                    </button>
                    {a.range ? <span className="ml-2 text-xs font-normal text-stone-500">{a.range}</span> : null}
                  </div>
                  <RollButton
                    bonus={attackBonus(a)}
                    onClick={() => onRoll(`Атака: ${a.name}`, attackBonus(a))}
                    title={`Бросок атаки: ${a.name}`}
                  />
                  <span className="flex items-center gap-2 whitespace-nowrap text-sm text-stone-300">
                    <RollButton
                      compact
                      title={`Бросок урона: ${a.name}`}
                      onClick={() => onRoll(`Урон: ${a.name}`, num(a.bonus_damage) ?? 0)}
                    />
                    {damage}
                  </span>
                  <span className="flex items-center justify-end gap-1">
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
                  </span>
                </div>
                {notesIds.includes(String(a.id)) && (
                  <div className="rounded-lg border border-stone-700/60 bg-stone-900/40 px-4 py-3 text-sm text-stone-400">
                    {a.notes?.trim() ? (
                      <p className="whitespace-pre-wrap border-l-2 border-ember/50 pl-3">{a.notes}</p>
                    ) : (
                      <span className="text-stone-500">Нет заметки</span>
                    )}
                  </div>
                )}
              </Fragment>
            )
          })}
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
