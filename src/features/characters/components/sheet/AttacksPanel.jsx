import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import { useCharacterAttacks } from '@/features/characters/queries.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { useUiSet } from '@/lib/uiState.js'
import { Button, EmptyState, Skeleton } from '@/components/ui'
import { RollButton } from '@/components/sheet/primitives.jsx'
import { num } from './constants.js'
import AttackModal from './AttackModal.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { label } from '@/lib/i18n/index.js'

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

const AttackActions = ({ open, onToggleNote, onEdit, onDelete }) => (
  <div className="flex items-center gap-1">
    <button
      type="button"
      className="character-icon-button"
      aria-expanded={open}
      title={open ? 'Скрыть заметку' : 'Показать заметку'}
      onClick={onToggleNote}
    >
      <LoreIcon name="note" />
    </button>
    <button
      type="button"
      className="character-icon-button"
      title="Изменить"
      onClick={onEdit}
    >
      <LoreIcon name="edit" />
    </button>
    <button
      type="button"
      className="catalog-delete-button"
      title="Удалить"
      onClick={onDelete}
    >
      <LoreIcon name="trash" />
    </button>
  </div>
)

const AttackNotes = ({ notes }) => (
  <>
    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Заметка</p>
    {notes?.trim() ? (
      <p className="whitespace-pre-wrap border-l-2 border-ember/50 pl-3 text-sm leading-relaxed text-stone-300">
        {notes}
      </p>
    ) : (
      <span className="text-sm text-stone-500">Нет заметки</span>
    )}
  </>
)

export default function AttacksPanel({ characterId, attackBonus, onRoll, onRollDamage, onError, classSpellcastingAbility }) {
  const queryClient = useQueryClient()
  const { data: attacks = [], isLoading } = useCharacterAttacks(characterId)
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
        <Button onClick={() => setModal('new')}><LoreIcon name="plus" /> Добавить</Button>
      </div>

      {isLoading && (
        <div className="overflow-hidden rounded-lg border border-stone-700/60" aria-busy="true">
          <div className="border-b border-stone-800 bg-stone-900/40 px-3 py-1.5">
            <Skeleton className="h-3 w-32" />
          </div>
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-stone-800 bg-stone-900/60 px-3 py-2.5"
            >
              <Skeleton className="h-3.5 w-44" />
              <Skeleton className="ml-auto h-8 w-16" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      )}
      {!isLoading && attacks.length === 0 && <EmptyState text="Атак пока нет" />}
      {!isLoading && attacks.length > 0 && (
        <div className="character-record-list">
          {attacks.map((a) => {
            const open = notesIds.includes(String(a.id))
            const attack = attackBonus(a)
            const dmg = num(a.bonus_damage) ?? 0
            return (
              <article key={a.id} className="character-record-card">
                <div className="character-record-heading">
                  <div><h3>{a.name}</h3><p>{[label(a.attack_type), a.damage_type && label(a.damage_type), a.range].filter(Boolean).join(' · ')}</p></div>
                  <AttackActions open={open} onToggleNote={() => toggleNotesId(String(a.id))} onEdit={() => setModal(a)} onDelete={() => remove(a.id)} />
                </div>
                <div className="character-attack-rolls">
                  <RollButton bonus={attack} label={`Атака ${fmtPlus(attack)}`} onClick={() => onRoll(`Атака: ${a.name}`, attack)} title={`Бросок атаки: ${a.name}`} />
                  <RollButton label={`Урон ${damageLabel(a)}`} onClick={() => onRollDamage(`Урон: ${a.name}`, a.damage_dice_count && a.damage_dice_type ? a.damage_dice_count : 0, Number(String(a.damage_dice_type ?? '').replace(/D/i, '')) || 0, dmg)} title={`Бросок урона: ${a.name} ${fmtPlus(dmg)}`} />
                </div>
                {open && <div className="character-record-description"><AttackNotes notes={a.notes} /></div>}
              </article>
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
          classSpellcastingAbility={classSpellcastingAbility}
        />
      )}
    </div>
  )
}