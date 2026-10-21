import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import { useCharacterFeats } from '@/features/characters/queries.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { recordRoll } from '@/lib/rollHistory.js'
import { ASI_LEVELS, mod, rollDie } from '@/lib/utils/ability.js'
import { Button } from '@/components/ui'
import SheetDrawer from '@/components/sheet/SheetDrawer.jsx'
import { useClassDetail } from '@/features/catalog/queries.js'
import AsiChoiceModal from '@/features/characters/components/wizard/AsiChoiceModal.jsx'
import { OptionCard } from '@/features/characters/components/wizard/OptionCard.jsx'

const asNum = (v) => Number(v) || 0

const HP_MODE_KEY = 'heofberu-ui:levelup-hp-mode'

function loadHpMode(characterId) {
  try {
    const key = `${HP_MODE_KEY}:${characterId}`
    const raw = window.localStorage.getItem(key)
    return raw === 'roll' || raw === 'average' ? raw : null
  } catch {
    return null
  }
}

function saveHpMode(characterId, mode) {
  try {
    if (mode) window.localStorage.setItem(`${HP_MODE_KEY}:${characterId}`, mode)
    else window.localStorage.removeItem(`${HP_MODE_KEY}:${characterId}`)
  } catch {
    /* localStorage недоступен */
  }
}

export default function LevelUpModal({ character, onClose, onError, onRollToast }) {
  const queryClient = useQueryClient()
  const { data: classDetail } = useClassDetail(character?.class_id)
  const { data: charFeats = [] } = useCharacterFeats(character?.id)
  const [phase, setPhase] = useState('hp')
  const [hpMode, setHpMode] = useState(() => loadHpMode(character?.id))
  const [rolled, setRolled] = useState(null)
  const [busy, setBusy] = useState(false)
  const [level, setLevel] = useState(() => asNum(character?.level) || 1)

  const chooseHpMode = (mode) => {
    setHpMode(mode)
    saveHpMode(character?.id, mode)
  }

  const dieSides = classDetail?.hit_dice ? Number(String(classDetail.hit_dice).replace(/\D/g, '')) : 8
  const conMod = useMemo(() => {
    const totals = character?.ability_scores ?? {}
    return mod(asNum(totals.constitution_total))
  }, [character])

  const currentLevel = level
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
    onRollToast?.(`Хиты ур. ${targetLevel} · к${dieSides}`, value, conMod, Math.max(1, value + conMod), dieSides)
    if (!onRollToast) recordRoll({
      id: Date.now() + Math.random(),
      title: `Хиты ур. ${targetLevel}`,
      detail: `${value}${conMod ? ` ${conMod < 0 ? '−' : '+'} ${Math.abs(conMod)}` : ''}`,
      dice: `к${dieSides}${conMod ? ` ${conMod < 0 ? '−' : '+'} ${Math.abs(conMod)}` : ''}`,
      total: Math.max(1, value + conMod),
      at: Date.now(),
    })
  }

  // Всё персонажа лежит под префиксом ['characters', id] (черты, can-level-up,
  // счётчик незавершённых выборов — группы новых особенностей тоже там), так что
  // одного инвалидирования достаточно.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.characters.detail(Number(character.id)) })

  const submit = async (choice) => {
    setBusy(true)
    try {
      await charactersApi.progression.levelUp(character.id, {
        hit_points_gained: hpGain() ?? undefined,
        ...(choice ? { choice } : {}),
      })
      await invalidate()
      const next = await charactersApi.progression.canLevelUp(Number(character.id))
      if (next?.current_level != null) setLevel(asNum(next.current_level))
      setRolled(null)
      setPhase(next?.can_level_up ? 'hp' : 'done')
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
      {(phase === 'hp' || phase === 'done') && <SheetDrawer
        title="Повышение уровня"
        onClose={() => { if (!busy) onClose() }}
        footer={phase === 'done' ? <Button onClick={onClose}>Закрыть</Button> : <>
          <Button variant="ghost" disabled={busy} onClick={onClose}>Отмена</Button>
          <Button disabled={busy || hpGain() == null} onClick={confirmHp}>
            {busy ? 'Повышаем…' : needsAsi ? 'Далее' : 'Повысить уровень'}
          </Button>
        </>}
      >
        {phase === 'done' ? (
          <div className="text-center">
            <p className="font-display text-3xl font-bold text-gold-light">Уровень {currentLevel}</p>
            <p className="mt-2 text-sm text-stone-400">Достигнут максимальный доступный уровень.</p>
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
                disabled={busy}
                onClick={() => chooseHpMode('roll')}
                title={`Бросить к${dieSides}`}
                subtitle={
                  rolled != null
                    ? `Выпало ${rolled} ${conMod >= 0 ? '+' : ''}${conMod} = ${Math.max(1, rolled + conMod)}`
                    : 'Бросок кости хитов + мод. Телосложения'
                }
              ></OptionCard>
              <OptionCard
                selected={hpMode === 'average'}
                disabled={busy}
                onClick={() => chooseHpMode('average')}
                title="Среднее"
                subtitle={`+${avgGain} HP`}
              />
            </div>
            {hpMode === 'roll' && rolled == null && (
              <Button className="mt-3 w-full" disabled={busy} onClick={rollHp}>
                Бросить кубик
              </Button>
            )}

          </>
        )}
      </SheetDrawer>}

      {phase === 'asi' && (
        <AsiChoiceModal
          presentation="drawer"
          busy={busy}
          level={targetLevel}
          grantedFeatIds={charFeats.map((cf) => cf.feat_id ?? cf.feat?.id).filter(Boolean)}
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
