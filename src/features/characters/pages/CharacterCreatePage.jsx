import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { POINT_BUY_BUDGET, POINT_BUY_MIN, STATS, bonusMap, effectiveTotals, pointCost } from '@/lib/utils/ability.js'
import { STEPS, DEFAULT_FORM, buildItemChoiceIds, choiceGroupsComplete } from '@/lib/utils/characterCreate.js'
import { Button, Card, ErrorBox, PageHeader, Skeleton, SkeletonCard, SkeletonCircle } from '@/components/ui'
import StepAbilities from '@/features/characters/components/wizard/StepAbilities.jsx'
import StepBackground from '@/features/characters/components/wizard/StepBackground.jsx'
import StepClass from '@/features/characters/components/wizard/StepClass.jsx'
import StepName from '@/features/characters/components/wizard/StepName.jsx'
import StepRace from '@/features/characters/components/wizard/StepRace.jsx'
import StepSkills from '@/features/characters/components/wizard/StepSkills.jsx'
import StepSummary from '@/features/characters/components/wizard/StepSummary.jsx'
import RollToasts from '@/features/characters/components/wizard/RollToasts.jsx'
import { charactersApi } from '@/features/characters/api.js'
import { useAuth } from '@/features/auth/useAuth.js'
import {
  useBackgroundDetail,
  useBackgrounds,
  useClasses,
  useClassDetail,
  useRaceDetail,
  useRaceFeatures,
  useRaces,
  useSkills,
  useSubclassDetail,
  useSubraceDetail,
} from '@/features/catalog/queries.js'

export default function CharacterCreatePage() {
  const navigate = useNavigate()
  const { isGM } = useAuth()
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

  const [creating, setCreating] = useState(false)
  const [rolls, setRolls] = useState([])
  const rollSeq = useRef(0)

  const pushRolls = (items) => {
    if (!items) return
    const list = Array.isArray(items) ? items : [items]
    if (list.length === 0) return
    setRolls((prev) => [...prev, ...list.map((it) => ({ id: ++rollSeq.current, ...it }))])
  }
  const dismissRoll = (id) => setRolls((prev) => prev.filter((r) => r.id !== id))

  // При смене расы/предыстории вычищаем из выбранных навыков класса те,
  // что теперь выдаются автоматически, чтобы не было дублей.
  const update = (patch) =>
    setForm((f) => {
      const next = { ...f, ...patch }
      if (
        (patch.race_id !== undefined || patch.background_id !== undefined) &&
        (next.class_skill_ids ?? []).length > 0
      ) {
        // Детали только что выбранной расы/предыстории ещё не загружены —
        // сверяемся с деталями неизменённого источника.
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

  const dieSides = classDetail?.hit_dice ? Number(String(classDetail.hit_dice).replace('D', '')) : 8
  const bonusByCode = {
    ...bonusMap(raceDetail?.ability_bonuses),
    ...bonusMap(subraceDetail?.ability_bonuses),
  }
  const totals = useMemo(
    () =>
      effectiveTotals(
        Object.fromEntries(STATS.map((s) => [s.key, form.ability_base[s.key] ?? 8])),
        bonusByCode,
      ),
    [form.ability_base, raceDetail, subraceDetail],
  )

  const derived = {
    bonusByCode,
    totals,
    dieSides,
  }

  const canContinue = (() => {
    switch (STEPS[step].id) {
      case 'name':
        return Boolean(form.name.trim())
      case 'race':
        return Boolean(form.race_id)
      case 'background':
        return true
      case 'class': {
        return Boolean(form.class_id)
      }
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
      case 'summary': {
        // Снаряжение «выбери-себе-из-N» должно быть полностью заполнено:
        // бэкенд вернёт 400, если по группе выбрано не ровно pick_count опций.
        const complete = choiceGroupsComplete(classDetail, backgroundDetail, form.starting_choices)
        return Boolean(form.name.trim()) && complete
      }
      default:
        return true
    }
  })()

  const create = async () => {
    if (!canContinue) return
    setError(null)
    setCreating(true)
    try {
      const body = {
        name: form.name.trim(),
        class_id: Number(form.class_id),
      }
      for (const s of STATS) body[s.key] = Number(form.ability_base[s.key])
      if (form.subclass_id) body.subclass_id = Number(form.subclass_id)
      if (form.race_id) body.race_id = Number(form.race_id)
      if (form.subrace_id) body.subrace_id = Number(form.subrace_id)
      if (form.background_id) body.background_id = Number(form.background_id)
      // Только выбранные навыки класса: гранты расы и предыстории бэкенд
      // добавляет сам, а лишние/неизвестные поля отклоняются с 422.
      body.skill_ids = (form.class_skill_ids ?? []).map(Number)
      // Группы «выбери себе снаряжение» класса и предыстории. Передаём flat-список
      // id выбранных ОПЦИЙ (options.id — SourceItemChoiceOption.id), как того ждёт
      // бэкенд в item_choice_ids. Базовый комплект (starting_items расы/класса/
      // предыстории) выдаётся сервером автоматически.
      body.item_choice_ids = buildItemChoiceIds(classDetail, backgroundDetail, form.starting_choices)

      const created = await charactersApi.create(body)

      navigate(`/characters/${created.id}`)
    } catch (e) {
      setError(e)
    } finally {
      setCreating(false)
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
      isGM,
    }
    switch (STEPS[step].id) {
      case 'name':
        return <StepName {...props} />
      case 'race':
        return <StepRace {...props} />
      case 'background':
        return <StepBackground {...props} />
      case 'class':
        return <StepClass {...props} />
      case 'skills':
        return <StepSkills {...props} />
      case 'abilities':
        return <StepAbilities {...props} onRoll={pushRolls} />
      case 'summary':
        return <StepSummary {...props} />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div aria-busy="true">
        <div className="mb-4">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="space-y-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <SkeletonCircle size="size-8" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </aside>
          <div className="min-w-0">
            <SkeletonCard className="min-h-[24rem]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <Link to="/characters" className="text-sm text-ember hover:underline">
          ← Назад к персонажам
        </Link>
      </div>

      <PageHeader title="Новый персонаж" subtitle="Пошаговое создание героя 1 уровня в стиле классического D&D" />

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
              <Button variant="ghost" disabled={step === 0 || creating} onClick={() => setStep((s) => Math.max(s - 1, 0))}>
                ← Назад
              </Button>
              {step < STEPS.length - 1 ? (
                <Button disabled={!canContinue} onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}>
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

      <RollToasts toasts={rolls} onDismiss={dismissRoll} />
    </div>
  )
}
