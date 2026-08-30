import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { recordRoll } from '@/lib/rollHistory.js'
import { ASI_LEVELS, mod, rollDie } from '@/lib/utils/ability.js'
import { Button, Modal } from '@/components/ui'
import { useClassDetail } from '@/features/catalog/queries.js'
import AsiChoiceModal from '@/features/characters/components/wizard/AsiChoiceModal.jsx'
import { OptionCard } from '@/features/characters/components/wizard/OptionCard.jsx'

const asNum = (v) => Number(v) || 0

export default function LevelUpModal({ character, onClose, onError, onRollToast }) {
  const queryClient = useQueryClient()
  const { data: classDetail } = useClassDetail(character?.class_id)
  const [phase, setPhase] = useState('hp')
  const [hpMode, setHpMode] = useState(null)
  const [rolled, setRolled] = useState(null)
  const [busy, setBusy] = useState(false)

  const dieSides = classDetail?.hit_dice ? Number(String(classDetail.hit_dice).replace(/\D/g, '')) : 8
  const conMod = useMemo(() => {
    const totals = character?.ability_scores ?? {}
    return mod(asNum(totals.constitution_total))
  }, [character])

  const currentLevel = asNum(character?.level) || 1
  const targetLevel = currentLevel + 1
  const avgGain = Math.max(1, Math.floor(dieSides / 2) + 1 + conMod)

  const hpGain = () => {
    if (hpMode === 'average') return avgGain
    if (hpMode === 'roll' && rolled != null) return Math.max(1, rolled + conMod)
    return null
  }

  const rollHp = () => {
    const value = rollDie(dieSides)
    setRolled(value)
    onRollToast?.(`Хиты ур. ${targetLevel} · к${dieSides}`, value, conMod, Math.max(1, value + conMod))
    recordRoll({
      id: Date.now() + Math.random(),
      title: `Хиты ур. ${targetLevel}`,
      detail: `к${dieSides}${conMod ? ` ${conMod >= 0 ? '+' : ''}${conMod}` : ''}`,
      total: Math.max(1, value + conMod),
      at: Date.now(),
    })
  }

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.characters.detail(Number(character.id)) })
    await queryClient.invalidateQueries({
      queryKey: ['characters', Number(character.id), 'progression', 'can-level-up'],
    })
  }

  const submit = async (choice) => {
    setBusy(true)
    try {
      await charactersApi.progression.levelUp(character.id, {
        hit_points_gained: hpGain() ?? undefined,
        ...(choice ? { choice } : {}),
      })
      setPhase('hp')
      setHpMode(null)
      setRolled(null)
      await invalidate()
      const next = await charactersApi.progression.canLevelUp(Number(character.id))
      if (!next?.can_level_up) setPhase('done')
    } catch (e) {
      onError(e)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const confirmHp = async () => {
    if (hpGain() == null || busy) return
    if (ASI_LEVELS.includes(targetLevel)) {
      setPhase('asi')
    } else {
      submit(null)
    }
  }

  const needsAsi = ASI_LEVELS.includes(targetLevel)

  return (
    <>
      <Modal title="Повышение уровня" onClose={onClose} size="sm">
        {phase === 'done' ? (
          <div className="text-center">
            <p className="font-display text-3xl font-bold text-gold-light">Уровень {currentLevel}</p>
            <p className="mt-2 text-sm text-stone-400">Достигнут максимальный доступный уровень.</p>
            <div className="mt-4">
              <Button onClick={onClose}>Отлично</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center">
              <p className="font-display text-xl font-bold text-stone-100">
                Уровень {currentLevel} → {targetLevel}
              </p>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <OptionCard
                selected={hpMode === 'roll'}
                onClick={() => setHpMode('roll')}
                title={`Бросить к${dieSides}`}
                subtitle={
                  rolled != null
                    ? `Выпало ${rolled} ${conMod >= 0 ? '+' : ''}${conMod} = ${Math.max(1, rolled + conMod)} HP`
                    : 'Бросок кости хитов + мод. Телосложения'
                }
              >
                {hpMode === 'roll' && (
                  <span
                    className="mt-1.5 inline-block text-xs text-gold-light underline decoration-dotted"
                    onClick={(e) => {
                      e.stopPropagation()
                      rollHp()
                    }}
                  >
                    Перебросить
                  </span>
                )}
              </OptionCard>
              <OptionCard
                selected={hpMode === 'average'}
                onClick={() => setHpMode('average')}
                title="Среднее"
                subtitle={`+${avgGain} HP`}
              />
            </div>
            {hpMode === 'roll' && rolled == null && (
              <button type="button" className="sheet-btn sheet-btn_primary mt-3 w-full" onClick={rollHp}>
                Бросить кубик
              </button>
            )}

            <button
              type="button"
              className="sheet-btn sheet-btn_primary mt-4 w-full"
              disabled={busy || hpGain() == null}
              onClick={confirmHp}
            >
              {needsAsi && hpGain() != null ? 'Далее: улучшение характеристик' : 'Повыситься'}
            </button>
          </>
        )}
      </Modal>

      {phase === 'asi' && (
        <AsiChoiceModal
          level={targetLevel}
          abilityTotals={{
            STR: character?.ability_scores?.strength_total ?? 10,
            DEX: character?.ability_scores?.dexterity_total ?? 10,
            CON: character?.ability_scores?.constitution_total ?? 10,
            INT: character?.ability_scores?.intelligence_total ?? 10,
            WIS: character?.ability_scores?.wisdom_total ?? 10,
            CHA: character?.ability_scores?.charisma_total ?? 10,
          }}
          onCancel={() => setPhase('hp')}
          onConfirm={(choice) => submit(choice)}
        />
      )}
    </>
  )
}
