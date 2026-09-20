import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import { useCharacterFeats } from '@/features/characters/queries.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { recordRoll } from '@/lib/rollHistory.js'
import { ASI_LEVELS, mod, rollDie } from '@/lib/utils/ability.js'
import { Button, Modal } from '@/components/ui'
import { useClassDetail } from '@/features/catalog/queries.js'
import AsiChoiceModal from '@/features/characters/components/wizard/AsiChoiceModal.jsx'
import PendingChoicesModal from '@/features/characters/components/sheet/PendingChoicesModal.jsx'
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
    await queryClient.invalidateQueries({ queryKey: queryKeys.characters.feats(Number(character.id)) })
  }

  // После выбора черты она может открыть свои группы выбора (владения,
  // заклинания и т.п.) — доводим игрока по ним сразу же, не заставляя
  // потом искать значок «Выборы» в шапке листа.
  const [afterChoicesPhase, setAfterChoicesPhase] = useState(null)

  const submit = async (choice) => {
    setBusy(true)
    try {
      // Имя/место поля с ответами на прочие группы выбора черты (не
      // ABILITY_SCORE) бэком не задокументировано — шлём его и вложенным в
      // choice (см. AsiChoiceModal), и продублированным на верхнем уровне
      // тела запроса на случай, если бэк ждёт его именно там.
      const choiceAnswers = choice?.answers ?? choice?.choice_answers
      await charactersApi.progression.levelUp(character.id, {
        hit_points_gained: hpGain() ?? undefined,
        ...(choice ? { choice } : {}),
        ...(choiceAnswers ? { answers: choiceAnswers, choice_answers: choiceAnswers } : {}),
      })
      await invalidate()
      const [next, pendingGrants] = await Promise.all([
        charactersApi.progression.canLevelUp(Number(character.id)),
        charactersApi.grants.pending(Number(character.id)),
      ])
      if (next?.current_level != null) setLevel(asNum(next.current_level))
      setRolled(null)
      const nextPhase = next?.can_level_up ? 'hp' : 'done'
      if ((pendingGrants ?? []).length > 0) {
        setAfterChoicesPhase(nextPhase)
        setPhase('choices')
      } else {
        setPhase(nextPhase)
      }
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
                onClick={() => chooseHpMode('average')}
                title="Среднее"
                subtitle={`+${avgGain} HP`}
              />
            </div>
            {hpMode === 'roll' && rolled == null && (
              <button type="button" className="sheet-btn sheet-btn_primary mt-3 w-full max-sm:w-auto" onClick={rollHp}>
                Бросить кубик
              </button>
            )}

            <button
              type="button"
              className="sheet-btn sheet-btn_primary mt-4 w-full max-sm:w-auto"
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

      {phase === 'choices' && (
        <PendingChoicesModal
          character={character}
          onClose={() => setPhase(afterChoicesPhase ?? 'done')}
          onError={onError}
        />
      )}
    </>
  )
}
