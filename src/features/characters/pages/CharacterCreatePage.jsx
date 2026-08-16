import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ASI_LEVELS, POINT_BUY_BUDGET, POINT_BUY_MIN, STATS, bonusMap, effectiveTotals, mod, pointCost, rollDie } from '@/lib/utils/ability.js'
import { expertiseBudget as expertiseBudgetFn } from '@/lib/utils/expertise.js'
import { STEPS, statsToTotals, DEFAULT_FORM } from '@/lib/utils/characterCreate.js'
import { Button, Card, ErrorBox, PageHeader, Spinner } from '@/components/ui'
import AsiChoiceModal from '@/features/characters/components/wizard/AsiChoiceModal.jsx'
import CreateProgress from '@/features/characters/components/wizard/CreateProgress.jsx'
import StepAbilities from '@/features/characters/components/wizard/StepAbilities.jsx'
import StepBackground from '@/features/characters/components/wizard/StepBackground.jsx'
import StepClass from '@/features/characters/components/wizard/StepClass.jsx'
import StepLevel from '@/features/characters/components/wizard/StepLevel.jsx'
import StepPersonality from '@/features/characters/components/wizard/StepPersonality.jsx'
import StepRace from '@/features/characters/components/wizard/StepRace.jsx'
import StepReview from '@/features/characters/components/wizard/StepReview.jsx'
import RollToasts from '@/features/characters/components/wizard/RollToasts.jsx'
import { charactersApi } from '@/features/characters/api.js'
import {
  useBackgroundDetail,
  useBackgrounds,
  useClasses,
  useClassDetail,
  useFeatsFull,
  useRaceDetail,
  useRaceFeatures,
  useRaces,
  useSkills,
  useSubclassDetail,
  useSubraceDetail,
} from '@/features/catalog/queries.js'

export default function CharacterCreatePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [error, setError] = useState(null)

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

  const featsQ = useFeatsFull()
  const feats = featsQ.data ?? []

  const [creating, setCreating] = useState(false)
  const [createProgress, setCreateProgress] = useState(null)
  const [asiPrompt, setAsiPrompt] = useState(null)
  const [rolls, setRolls] = useState([])
  const rollSeq = useRef(0)

  const pushRolls = (items) => {
    if (!items) return
    const list = Array.isArray(items) ? items : [items]
    if (list.length === 0) return
    setRolls((prev) => [...prev, ...list.map((it) => ({ id: ++rollSeq.current, ...it }))])
  }
  const dismissRoll = (id) => setRolls((prev) => prev.filter((r) => r.id !== id))

  const update = (patch) => setForm((f) => ({ ...f, ...patch }))

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
    feats,
  }

  const level = Number(form.level) || 1
  const dieSides = classDetail?.hit_dice ? Number(String(classDetail.hit_dice).replace('D', '')) : 8
  const bonusByCode = {
    ...bonusMap(raceDetail?.ability_bonuses),
    ...bonusMap(subraceDetail?.ability_bonuses),
  }
  const totals = effectiveTotals(
    Object.fromEntries(STATS.map((s) => [s.key, form.ability_base[s.key] ?? 8])),
    bonusByCode,
  )
  const conModValue = mod(totals.CON)
  const hpLevel1 = dieSides + conModValue
  const avgGain = Math.floor(dieSides / 2) + 1 + conModValue
  const expertiseBudgetValue = expertiseBudgetFn(classDetail?.features ?? [], level)

  const derived = {
    bonusByCode,
    totals,
    dieSides,
    conMod: conModValue,
    hpLevel1,
    avgGain,
    expertiseBudget: expertiseBudgetValue,
  }

  const canContinue = (() => {
    switch (STEPS[step].id) {
      case 'race':
        return Boolean(form.race_id)
      case 'background':
        return Boolean(form.background_id)
      case 'class': {
        if (!form.class_id) return false
        const count = classDetail?.skill_choice_count ?? 0
        const chosen = (form.class_skill_ids ?? []).length
        const exp = (form.expertise_ids ?? []).length
        return chosen >= count && exp >= expertiseBudgetValue
      }
      case 'abilities': {
        const allAssigned = STATS.every((s) => {
          const v = Number(form.ability_base[s.key])
          return Number.isFinite(v) && v >= 3 && v <= 20
        })
        if (form.ability_method === 'pointbuy') {
          const spent = STATS.reduce((sum, s) => sum + pointCost(Number(form.ability_base[s.key]) || POINT_BUY_MIN), 0)
          return allAssigned && POINT_BUY_BUDGET - spent >= 0
        }
        return allAssigned
      }
      case 'level':
        return level >= 1 && level <= 20
      case 'personality':
        return Boolean(form.name.trim())
      case 'review':
        return true
      default:
        return true
    }
  })()

  const ensureHpRolls = () => {
    if (form.hp_mode !== 'roll') return
    const dice = { ...(form.rolled_dice || {}) }
    const fresh = []
    let changed = false
    for (let l = 2; l <= level; l++) {
      if (dice[l] == null) {
        dice[l] = rollDie(dieSides)
        fresh.push({ level: l, value: dice[l] })
        changed = true
      }
    }
    if (changed) {
      update({ rolled_dice: dice })
      pushRolls(fresh.map((r) => ({ title: `Уровень ${r.level} · к${dieSides}`, dice: [r.value], total: r.value + conModValue })))
    }
  }

  const rollHpDice = () => {
    const dice = {}
    const fresh = []
    for (let l = 2; l <= level; l++) {
      dice[l] = rollDie(dieSides)
      fresh.push({ level: l, value: dice[l] })
    }
    update({ rolled_dice: dice })
    pushRolls(fresh.map((r) => ({ title: `Уровень ${r.level} · к${dieSides}`, dice: [r.value], total: r.value + conModValue })))
  }

  const next = () => {
    if (STEPS[step].id === 'level') ensureHpRolls()
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const back = () => setStep((s) => Math.max(s - 1, 0))

  const askAsi = (lvl, characterId, currentStats) =>
    new Promise((resolve) => {
      setAsiPrompt({ level: lvl, characterId, totals: statsToTotals(currentStats), resolve })
    })

  const resolveAsi = (choice) => {
    const resolve = asiPrompt?.resolve
    setAsiPrompt(null)
    if (resolve) resolve(choice)
  }

  const create = async () => {
    if (!canContinue) return
    setError(null)
    setCreating(true)
    try {
      const featsResult = await featsQ.refetch()
      const featsList = featsResult.data ?? feats

      const body = {
        name: form.name.trim(),
        class_id: Number(form.class_id),
        level: 1,
        max_hp: hpLevel1,
        current_hp: hpLevel1,
        money_gold: Number(form.money_gold) || 0,
        money_silver: Number(form.money_silver) || 0,
        money_copper: Number(form.money_copper) || 0,
      }
      for (const s of STATS) body[s.key] = Number(form.ability_base[s.key])
      if (form.subclass_id) body.subclass_id = Number(form.subclass_id)
      if (form.race_id) body.race_id = Number(form.race_id)
      if (form.subrace_id) body.subrace_id = Number(form.subrace_id)
      body.background_id = Number(form.background_id)
      for (const k of ['traits', 'proficiencies', 'backstory', 'notes']) {
        if (form[k]) body[k] = form[k]
      }

      const created = await charactersApi.create(body)
      const id = created.id

      if (form.feat_id) {
        await charactersApi.feats.add(id, { feat_id: Number(form.feat_id) })
      }

      const saves = (classDetail?.saving_throws ?? []).map((s) => s.ability)
      if (saves.length) await charactersApi.savingThrows(id, { saving_throws: saves })

      const chosen = (form.class_skill_ids ?? []).map(Number)
      const raceGranted = (raceDetail?.granted_skills ?? []).map((s) => s.id)
      const bgGranted = (backgroundDetail?.granted_skills ?? []).map((s) => s.id)
      const skillIds = [...new Set([...chosen, ...raceGranted, ...bgGranted].map(Number))]
      const expertise = new Set((form.expertise_ids ?? []).map(Number))
      await charactersApi.skills(id, {
        skill_proficiencies: skillIds.map((sid) => ({ skill_id: sid, is_expertise: expertise.has(sid) })),
      })

      let currentStats = created.ability_scores || null
      let currentCon = currentStats ? currentStats.constitution_total : totals.CON
      setCreateProgress({ current: 1, target: level })

      for (let lvl = 2; lvl <= level; lvl++) {
        setCreateProgress({ current: lvl, target: level })
        const req = {}

        if (ASI_LEVELS.includes(lvl)) {
          const choice = await askAsi(lvl, id, currentStats)
          if (!choice) {
            navigate(`/characters/${id}`)
            return
          }
          req.choice = choice
          if (choice.type === 'ASI') {
            for (const inc of choice.increases || []) {
              if (inc.ability === 'CON') currentCon += inc.amount
            }
          } else if (choice.type === 'FEAT' && choice.ability_score_increase_id) {
            const feat = featsList.find((f) => String(f.id) === String(choice.feat_id))
            const inc = feat?.ability_score_increases?.find(
              (ai) => String(ai.id) === String(choice.ability_score_increase_id),
            )
            if (inc?.ability === 'CON') currentCon += inc.amount
          }
        }

        if (form.hp_mode === 'roll') {
          req.hit_points_gained = (form.rolled_dice?.[lvl] ?? Math.floor(dieSides / 2) + 1) + mod(currentCon)
        } else {
          req.hit_points_gained = avgGain
        }

        const response = await charactersApi.progression.levelUp(id, req)
        currentStats = response?.ability_scores || currentStats
        currentCon = currentStats.constitution_total ?? currentCon
      }

      navigate(`/characters/${id}`)
    } catch (e) {
      setError(e)
    } finally {
      setCreating(false)
      setCreateProgress(null)
    }
  }

  const renderStep = () => {
    const props = {
      stepNo: step + 1,
      total: STEPS.length,
      form,
      update,
      lookups,
      derived,
    }
    switch (STEPS[step].id) {
      case 'race':
        return <StepRace {...props} />
      case 'background':
        return <StepBackground {...props} />
      case 'class':
        return <StepClass {...props} />
      case 'abilities':
        return <StepAbilities {...props} onRoll={pushRolls} />
      case 'level':
        return <StepLevel {...props} />
      case 'personality':
        return <StepPersonality {...props} />
      case 'review':
        return <StepReview {...props} onRollHp={rollHpDice} />
      default:
        return null
    }
  }

  if (loading) return <Spinner label="Загружаем справочники…" />

  return (
    <div>
      <div className="mb-4">
        <Link to="/characters" className="text-sm text-ember hover:underline">
          ← Назад к персонажам
        </Link>
      </div>

      <PageHeader title="Новый персонаж" subtitle="Пошаговое создание героя в стиле классического D&D" />

      {error && <div className="mb-6"><ErrorBox error={error} /></div>}

      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <ol className="space-y-1">
            {STEPS.map((s, i) => {
              const done = i < step
              const current = i === step
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => done && setStep(i)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                      current
                        ? 'bg-ember/10 text-stone-100'
                        : done
                          ? 'text-stone-300 hover:bg-stone-800/60'
                          : 'text-stone-600'
                    }`}
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                        current
                          ? 'border-ember bg-ember text-white'
                          : done
                            ? 'border-ember/50 text-ember'
                            : 'border-stone-700 text-stone-500'
                      }`}
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <span className="text-sm font-medium">{s.title}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </aside>

        <div className="min-w-0">
          <Card className="p-5 sm:p-6">
            {renderStep()}
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-stone-700/40 pt-4">
              <Button variant="ghost" disabled={step === 0 || creating} onClick={back}>
                ← Назад
              </Button>
              {step < STEPS.length - 1 ? (
                <Button disabled={!canContinue} onClick={next}>
                  Далее →
                </Button>
              ) : (
                <Button disabled={creating} onClick={create}>
                  {creating ? 'Создаём…' : 'Создать персонажа'}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {asiPrompt && (
        <AsiChoiceModal
          level={asiPrompt.level}
          abilityTotals={asiPrompt.totals}
          feats={featsQ.data ?? []}
          featsLoading={featsQ.isFetching}
          onCancel={() => resolveAsi(null)}
          onConfirm={resolveAsi}
        />
      )}
      {creating && createProgress && (
        <CreateProgress current={createProgress.current} target={createProgress.target} />
      )}

      <RollToasts toasts={rolls} onDismiss={dismissRoll} />
    </div>
  )
}
