import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ASI_LEVELS,
  POINT_BUY_BUDGET,
  POINT_BUY_MIN,
  STATS,
  abilityName,
  bonusMap,
  effectiveTotals,
  mod,
  pointCost,
  rollDie,
} from '@/lib/utils/ability.js'
import { charactersApi } from '@/features/characters/api.js'
import { useCharacterFeats } from '@/features/characters/queries.js'
import { useFeatDetail } from '@/features/catalog/queries.js'
import {
  useBackgroundDetail,
  useBackgrounds,
  useClassDetail,
  useClasses,
  useRaceDetail,
  useRaceFeatures,
  useRaces,
  useSkills,
  useSubclassDetail,
  useSubraceDetail,
} from '@/features/catalog/queries.js'
import { Button, ErrorBox, Modal } from '@/components/ui'
import StepAbilities from '@/features/characters/components/wizard/StepAbilities.jsx'
import StepBackground from '@/features/characters/components/wizard/StepBackground.jsx'
import StepClass from '@/features/characters/components/wizard/StepClass.jsx'
import StepRace from '@/features/characters/components/wizard/StepRace.jsx'
import StepSkills from '@/features/characters/components/wizard/StepSkills.jsx'
import { OptionCard } from '@/features/characters/components/wizard/OptionCard.jsx'
import { Hint, Section, StepShell, Tag } from '@/features/characters/components/wizard/StepShell.jsx'
import RollToasts from '@/features/characters/components/wizard/RollToasts.jsx'
import AsiChoiceModal from '@/features/characters/components/wizard/AsiChoiceModal.jsx'

const DEFAULT_FORM = (character) => ({
  race_id: String(character.race_id ?? ''),
  subrace_id: String(character.subrace_id ?? ''),
  background_id: String(character.background_id ?? ''),
  class_id: String(character.class_id ?? ''),
  subclass_id: String(character.subclass_id ?? ''),
  ability_method: 'array',
  ability_base: {},
  ability_rolls: {},
  ability_sources: {},
  class_skill_ids: [],
  max_hp: '',
  asi_choices: {},
})

function describeAsiChoice(choice, featEffect) {
  if (!choice) return null
  if (choice.type === 'ASI') {
    return choice.increases.map((i) => `+${i.amount} ${abilityName(i.ability)}`).join(', ')
  }
  if (!featEffect) return 'Черта — уточняем…'
  const bonus = featEffect.ability ? ` (+${featEffect.amount} ${abilityName(featEffect.ability)})` : ''
  return `${featEffect.name ?? 'Черта'}${bonus}`
}

// Резолвит фичу выбранной черты (имя + повышение характеристики, если оно
// есть) и поднимает результат наверх — нужно и для отображения, и чтобы
// накопительно учитывать бонус черты при проверке потолка на следующих уровнях.
function FeatEffectResolver({ level, featId, increaseId, onResolved }) {
  const { data } = useFeatDetail(featId)
  useEffect(() => {
    if (!data) return
    const inc = (data.ability_score_increases ?? []).find((ai) => String(ai.id) === String(increaseId))
    onResolved(level, { name: data.name, ability: inc?.ability ?? null, amount: inc?.amount ?? 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, increaseId])
  return null
}

function InfoCard({ label, children, className = '' }) {
  return (
    <div className={`min-w-0 rounded-lg border border-stone-800 bg-stone-900/60 px-3 py-2 ${className}`}>
      <p className="text-[10px] uppercase tracking-widest text-stone-500">{label}</p>
      <div className="mt-0.5 text-sm font-medium text-stone-100">{children}</div>
    </div>
  )
}

function AsiLevelTile({ level, choice, featEffect, onClick }) {
  const label = describeAsiChoice(choice, featEffect)
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-stone-700/50 bg-stone-900/40 p-3 text-left transition hover:border-ember/70"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="shrink-0 text-sm text-stone-200">Уровень {level}</span>
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm text-stone-400">{label ?? 'Не выбрано'}</span>
          <span className="shrink-0 text-xs font-medium text-ember">{choice ? 'Изменить' : 'Выбрать'}</span>
        </div>
      </div>
    </button>
  )
}

export default function RebuildModal({ character, onClose, onSuccess }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(() => DEFAULT_FORM(character))
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [asiLevelOpen, setAsiLevelOpen] = useState(null)
  const [featAsiEffects, setFeatAsiEffects] = useState({})
  const [hpMode, setHpMode] = useState(null)
  const [rolledHp, setRolledHp] = useState(null)
  const [rolls, setRolls] = useState([])

  const level = Number(character.level) || 1
  const requiredAsiLevels = useMemo(() => ASI_LEVELS.filter((l) => l <= level), [level])

  const racesQ = useRaces({ size: 100 })
  const classesQ = useClasses({ size: 100 })
  const backgroundsQ = useBackgrounds({ size: 100 })
  const skillsQ = useSkills({ size: 100 })
  const races = racesQ.data ?? []
  const classes = classesQ.data ?? []
  const backgrounds = backgroundsQ.data ?? []
  const skills = skillsQ.data ?? []
  const loading = racesQ.isLoading || classesQ.isLoading || backgroundsQ.isLoading || skillsQ.isLoading

  const { data: raceDetail } = useRaceDetail(form.race_id)
  const { data: raceFeatures = [] } = useRaceFeatures(form.race_id)
  const { data: subraceDetail } = useSubraceDetail(form.race_id, form.subrace_id)
  const { data: classDetail } = useClassDetail(form.class_id)
  const { data: subclassDetail } = useSubclassDetail(form.class_id, form.subclass_id)
  const { data: backgroundDetail } = useBackgroundDetail(form.background_id)
  const { data: charFeats = [] } = useCharacterFeats(character.id)

  const STEPS = useMemo(() => {
    const base = [
      { id: 'race', title: 'Раса' },
      { id: 'background', title: 'Предыстория' },
      { id: 'class', title: 'Класс' },
      { id: 'skills', title: 'Навыки' },
      { id: 'abilities', title: 'Характеристики' },
      { id: 'hp', title: 'Хиты' },
    ]
    for (const l of requiredAsiLevels) base.push({ id: `asi-${l}`, level: l, title: `Улучшение (ур. ${l})` })
    base.push({ id: 'confirm', title: 'Подтверждение' })
    return base
  }, [requiredAsiLevels])

  const currentStep = STEPS[step]
  const currentAsiLevel = currentStep?.id?.startsWith('asi-') ? currentStep.level : null

  // Шаги уровней ASI идут по порядку: попав на нерешённый уровень, подбор
  // открывается сам собой (без выбора дальше идти нельзя); manual override
  // (клик «Изменить» на уже решённом уровне) задаётся через asiLevelOpen.
  const openAsiLevel =
    asiLevelOpen ?? (currentAsiLevel != null && !form.asi_choices[currentAsiLevel] ? currentAsiLevel : null)

  const pushRolls = (items) => {
    if (!items) return
    const list = Array.isArray(items) ? items : [items]
    if (list.length === 0) return
    setRolls((prev) => [...prev, ...list.map((it, i) => ({ id: Date.now() + i + Math.random(), ...it }))])
  }
  const dismissRoll = (id) => setRolls((prev) => prev.filter((r) => r.id !== id))

  const update = (patch) =>
    setForm((f) => {
      const next = { ...f, ...patch }
      if (
        (patch.race_id !== undefined || patch.background_id !== undefined) &&
        (next.class_skill_ids ?? []).length > 0
      ) {
        const unchanged = [patch.race_id === undefined ? raceDetail : null, patch.background_id === undefined ? backgroundDetail : null]
        const grantedIds = new Set(
          unchanged
            .flatMap((d) => d?.granted_skills ?? [])
            .map((s) => Number(s?.id))
            .filter(Number.isFinite),
        )
        if (grantedIds.size > 0) {
          next.class_skill_ids = next.class_skill_ids.filter((id) => !grantedIds.has(Number(id)))
        }
      }
      return next
    })

  const lookups = {
    races,
    classes,
    backgrounds,
    skills,
    raceDetail,
    raceFeatures,
    subraceDetail,
    subraceFeatures: Array.isArray(subraceDetail?.features) ? subraceDetail.features : [],
    classDetail,
    subclassDetail,
    backgroundDetail,
  }

  const dieSides = classDetail?.hit_dice ? Number(String(classDetail.hit_dice).replace(/\D/g, '')) : 8
  const bonusByCode = {
    ...bonusMap(raceDetail?.ability_bonuses),
    ...bonusMap(subraceDetail?.ability_bonuses),
  }
  const totals = useMemo(
    () => effectiveTotals(Object.fromEntries(STATS.map((s) => [s.key, form.ability_base[s.key] ?? 8])), bonusByCode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.ability_base, raceDetail, subraceDetail],
  )
  const derived = { bonusByCode, totals, dieSides }

  const conMod = mod(totals.CON)
  const level1Hp = Math.max(dieSides + conMod, 1)
  const avgGain = Math.max(1, Math.floor(dieSides / 2) + 1 + conMod)
  const avgTotal = level <= 1 ? level1Hp : level1Hp + (level - 1) * avgGain

  const pickRollHp = () => {
    // Бросок — одноразовый: повторный клик просто возвращает уже
    // выпавший результат, а не бросает кости заново.
    if (rolledHp != null) {
      setHpMode('roll')
      setForm((f) => ({ ...f, max_hp: String(rolledHp) }))
      return
    }
    let sum = level1Hp
    const toasts = []
    for (let l = 2; l <= level; l++) {
      const value = rollDie(dieSides)
      const gain = Math.max(1, value + conMod)
      sum += gain
      toasts.push({ title: `Хиты ур. ${l}`, dice: [value], total: gain })
    }
    pushRolls(toasts)
    setHpMode('roll')
    setRolledHp(sum)
    setForm((f) => ({ ...f, max_hp: String(sum) }))
  }

  const pickAverageHp = () => {
    setHpMode('average')
    setForm((f) => ({ ...f, max_hp: String(avgTotal) }))
  }

  const cumulativeTotalsBeforeLevel = (targetLevel) => {
    const acc = { ...totals }
    for (const l of requiredAsiLevels) {
      if (l >= targetLevel) continue
      const c = form.asi_choices[l]
      if (c?.type === 'ASI') {
        for (const inc of c.increases) acc[inc.ability] = (acc[inc.ability] || 0) + inc.amount
      } else if (c?.type === 'FEAT') {
        const effect = featAsiEffects[l]
        if (effect?.ability) acc[effect.ability] = (acc[effect.ability] || 0) + effect.amount
      }
    }
    return acc
  }

  // ASI-sourced feats are wiped by the rebuild itself, so only GM/origin
  // grants can still block re-picking a feat during the ASI step.
  const existingFeatIds = charFeats
    .filter((cf) => cf.source_type !== 'ASI')
    .map((cf) => cf.feat_id ?? cf.feat?.id)
    .filter(Boolean)
  const chosenFeatIdsExceptOpen = Object.entries(form.asi_choices)
    .filter(([l]) => Number(l) !== openAsiLevel)
    .map(([, c]) => (c.type === 'FEAT' ? c.feat_id : null))
    .filter(Boolean)

  const canContinue = (() => {
    switch (STEPS[step]?.id) {
      case 'race':
        return Boolean(form.race_id)
      case 'background':
        return true
      case 'class':
        return Boolean(form.class_id)
      case 'skills': {
        if (!form.class_id) return false
        const count = classDetail?.skill_choice_count ?? 0
        return (form.class_skill_ids ?? []).length >= count
      }
      case 'abilities': {
        const allAssigned = STATS.every((s) => {
          const v = Number(form.ability_base[s.key])
          return Number.isFinite(v) && v >= 3 && v <= 18
        })
        if (form.ability_method === 'pointbuy') {
          const spent = STATS.reduce((sum, s) => sum + pointCost(Number(form.ability_base[s.key]) || POINT_BUY_MIN), 0)
          return allAssigned && POINT_BUY_BUDGET - spent >= 0
        }
        return allAssigned
      }
      case 'hp':
        return Number(form.max_hp) >= 1
      case 'confirm':
        return confirmed
      default:
        if (currentAsiLevel != null) return Boolean(form.asi_choices[currentAsiLevel])
        return true
    }
  })()

  const submit = async () => {
    if (submitting || !canContinue) return
    setError(null)
    setSubmitting(true)
    try {
      const body = {
        class_id: Number(form.class_id),
        subclass_id: form.subclass_id ? Number(form.subclass_id) : null,
        race_id: Number(form.race_id),
        subrace_id: form.subrace_id ? Number(form.subrace_id) : null,
        background_id: form.background_id ? Number(form.background_id) : null,
        max_hp: Number(form.max_hp),
        skill_ids: (form.class_skill_ids ?? []).map(Number),
        asi_choices: requiredAsiLevels.map((l) => ({ class_level: l, choice: form.asi_choices[l] })),
      }
      for (const s of STATS) body[s.key] = Number(form.ability_base[s.key])

      await charactersApi.progression.rebuild(character.id, body)
      await queryClient.invalidateQueries({ queryKey: ['characters', Number(character.id)] })
      onSuccess?.()
    } catch (e) {
      setError(e)
    } finally {
      setSubmitting(false)
    }
  }

  const requestClose = () => {
    if (step > 0 && !window.confirm('Прервать ребилд? Несохранённые изменения будут потеряны.')) return
    onClose()
  }

  const stepProps = { stepNo: step + 1, total: STEPS.length, form, update, lookups, derived }

  const renderStep = () => {
    switch (STEPS[step]?.id) {
      case 'race':
        return <StepRace {...stepProps} />
      case 'background':
        return <StepBackground {...stepProps} />
      case 'class':
        return <StepClass {...stepProps} />
      case 'skills':
        return <StepSkills {...stepProps} />
      case 'abilities':
        return <StepAbilities {...stepProps} onRoll={pushRolls} />
      case 'hp':
        return (
          <StepShell
            stepNo={step + 1}
            total={STEPS.length}
            title="Хиты"
            subtitle="Новый максимум хитов для этого класса и уровня"
          >
            <Section>
              {level <= 1 ? (
                <>
                  <p className="text-sm text-stone-300">
                    На 1 уровне хиты фиксированы: кость к{dieSides} + модификатор Телосложения (
                    {conMod >= 0 ? '+' : ''}
                    {conMod}).
                  </p>
                  {form.max_hp !== String(level1Hp) ? (
                    <Button className="mt-3" onClick={() => setForm((f) => ({ ...f, max_hp: String(level1Hp) }))}>
                      Подтвердить: {level1Hp} HP
                    </Button>
                  ) : (
                    <Tag tone="good" className="mt-3 inline-block">
                      Хиты: {level1Hp}
                    </Tag>
                  )}
                </>
              ) : (
                <>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <OptionCard selected={hpMode === 'average'} onClick={pickAverageHp} title="Среднее" subtitle={`${avgTotal} HP`} />
                    <OptionCard
                      selected={hpMode === 'roll'}
                      onClick={pickRollHp}
                      title={`Бросить кости (${level - 1}× к${dieSides})`}
                      subtitle={rolledHp != null ? `Выпало: ${rolledHp} HP` : 'Кость хитов + мод. Телосложения на каждом уровне'}
                    />
                  </div>
                </>
              )}
            </Section>
          </StepShell>
        )
      case 'confirm': {
        const raceName = races.find((r) => String(r.id) === String(form.race_id))?.name
        const subraceName = (raceDetail?.subraces ?? []).find((s) => String(s.id) === String(form.subrace_id))?.name
        const className = classes.find((c) => String(c.id) === String(form.class_id))?.name
        const subclassName = (classDetail?.subclasses ?? []).find((s) => String(s.id) === String(form.subclass_id))?.name
        const backgroundName = backgrounds.find((b) => String(b.id) === String(form.background_id))?.name
        const skillNames = (form.class_skill_ids ?? [])
          .map((id) => skills.find((s) => String(s.id) === String(id))?.name)
          .filter(Boolean)
        // Итоговые характеристики уже с учётом всех ASI/черт — все уровни резолвлены к этому шагу.
        const finalTotals = cumulativeTotalsBeforeLevel(Infinity)
        return (
          <StepShell
            stepNo={step + 1}
            total={STEPS.length}
            title="Подтверждение"
            subtitle="Проверьте новую сборку перед тем, как применить её"
          >
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
              <Section title="Новая сборка">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <InfoCard label="Раса">
                    {raceName ?? '—'}
                    {subraceName ? ` · ${subraceName}` : ''}
                  </InfoCard>
                  <InfoCard label="Класс">
                    {className ?? '—'}
                    {subclassName ? ` · ${subclassName}` : ''}
                  </InfoCard>
                  <InfoCard label="Предыстория">{backgroundName ?? '—'}</InfoCard>
                  <InfoCard label="Хиты">{form.max_hp || '—'}</InfoCard>
                  <InfoCard label="Навыки">{skillNames.length ? skillNames.join(', ') : '—'}</InfoCard>
                  {requiredAsiLevels.length > 0 && (
                    <InfoCard label="Улучшения" className="sm:col-span-2">
                      <ul className="space-y-0.5">
                        {requiredAsiLevels.map((l) => (
                          <li key={l}>
                            ур. {l}: {describeAsiChoice(form.asi_choices[l], featAsiEffects[l]) ?? 'не выбрано'}
                          </li>
                        ))}
                      </ul>
                    </InfoCard>
                  )}
                </div>
              </Section>

              <Section title="Характеристики">
                <table className="w-full table-fixed border-separate border-spacing-y-0.5 bg-stone-700/60">
                  <tbody>
                    {STATS.map((s) => {
                      const value = finalTotals[s.code] ?? 10
                      const modifier = mod(value)
                      return (
                        <tr key={s.code}>
                          <td className="w-3/5 border-l border-stone-700/60 bg-stone-900 px-3 py-2 text-[11px] uppercase tracking-wider text-stone-500">
                            {abilityName(s.code)}
                          </td>
                          <td className="w-1/5 bg-stone-900 py-2 text-center font-display text-xs font-bold text-stone-100">
                            <span className={modifier >= 0 ? 'text-gold-light' : 'text-red-400'}>
                              {modifier >= 0 ? '+' : ''}
                              {modifier}
                            </span>
                          </td>
                          <td className="w-1/5 border-r border-stone-700/60 bg-stone-900 py-2 text-center font-display text-base font-normal text-stone-300">
                            {value}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Section>
            </div>

            <Section className="mt-6">
              <div className="rounded-lg border border-red-800/50 bg-red-950/20 p-3 text-sm text-red-200">
                Ребилд сбросит владения навыками, известные заклинания и историю выбора при повышении уровня.
                Экипировка, заметки, предыстория (текст) и уровень персонажа не изменятся.
              </div>

              <label className="mt-3 flex cursor-pointer items-center gap-2 rounded border border-stone-700 bg-stone-800/70 px-3 py-2 text-sm text-stone-200">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="size-4 accent-ember"
                />
                Я понимаю последствия и хочу применить ребилд
              </label>

              {error && (
                <div className="mt-3">
                  <ErrorBox error={error} />
                </div>
              )}
            </Section>
          </StepShell>
        )
      }
      default: {
        if (currentAsiLevel == null) return null
        const choice = form.asi_choices[currentAsiLevel]
        return (
          <StepShell
            stepNo={step + 1}
            total={STEPS.length}
            title={`Улучшение — уровень ${currentAsiLevel}`}
            subtitle="Выберите заново ASI или черту для этого уровня, как при обычном повышении уровня"
          >
            <Section>
              <AsiLevelTile
                level={currentAsiLevel}
                choice={choice}
                featEffect={featAsiEffects[currentAsiLevel]}
                onClick={() => setAsiLevelOpen(currentAsiLevel)}
              />
              {choice && (
                <Hint className="mt-2">
                  Если уверены в выборе — переходите дальше. Хотите передумать — нажмите «Изменить» (более высокие
                  уровни улучшений придётся выбрать заново).
                </Hint>
              )}
            </Section>
          </StepShell>
        )
      }
    }
  }

  return (
    <>
      <Modal
        title="Ребилд персонажа"
        onClose={requestClose}
        size="4xl"
        scroll
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <Button variant="ghost" disabled={step === 0 || submitting} onClick={() => setStep((s) => Math.max(s - 1, 0))}>
              ← Назад
            </Button>
            {step < STEPS.length - 1 ? (
              <Button disabled={!canContinue || loading} onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}>
                Далее →
              </Button>
            ) : (
              <Button disabled={!canContinue || submitting} onClick={submit}>
                {submitting ? 'Применяем…' : 'Применить ребилд'}
              </Button>
            )}
          </div>
        }
      >
        {loading ? <Hint>Загружаем справочники…</Hint> : renderStep()}
      </Modal>

      {openAsiLevel != null && (
        <AsiChoiceModal
          level={openAsiLevel}
          abilityTotals={cumulativeTotalsBeforeLevel(openAsiLevel)}
          grantedFeatIds={[...existingFeatIds, ...chosenFeatIdsExceptOpen]}
          onCancel={() => {
            // Без выбора для этого уровня идти дальше нельзя — просто
            // возвращаемся на шаг назад, а не закрываем весь визард.
            if (!form.asi_choices[openAsiLevel]) setStep((s) => Math.max(s - 1, 0))
            setAsiLevelOpen(null)
          }}
          onConfirm={(choice) => {
            // Изменение уровня инвалидирует потолок характеристик для всех
            // более высоких уровней — их придётся выбрать заново.
            setForm((f) => {
              const nextChoices = { ...f.asi_choices, [openAsiLevel]: choice }
              for (const l of requiredAsiLevels) {
                if (l > openAsiLevel) delete nextChoices[l]
              }
              return { ...f, asi_choices: nextChoices }
            })
            setFeatAsiEffects((prev) => {
              const next = { ...prev }
              for (const l of requiredAsiLevels) {
                if (l > openAsiLevel) delete next[l]
              }
              return next
            })
            setAsiLevelOpen(null)
          }}
        />
      )}

      {requiredAsiLevels.map((l) => {
        const c = form.asi_choices[l]
        if (c?.type !== 'FEAT') return null
        return (
          <FeatEffectResolver
            key={l}
            level={l}
            featId={c.feat_id}
            increaseId={c.ability_score_increase_id}
            onResolved={(lvl, effect) => setFeatAsiEffects((prev) => ({ ...prev, [lvl]: effect }))}
          />
        )
      })}

      <RollToasts toasts={rolls} onDismiss={dismissRoll} />
    </>
  )
}
