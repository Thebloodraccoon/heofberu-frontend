import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/endpoints.js'
import { ASI_LEVELS, STATS, baseDefaults, bonusMap, effectiveTotals, mod, rollDie } from '../utils/ability.js'
import { expertiseBudget as expertiseBudgetFn } from '../utils/expertise.js'
import { Button, Card, ErrorBox, PageHeader, Spinner } from '../components/ui.jsx'
import AsiChoiceModal from '../components/characterCreate/AsiChoiceModal.jsx'
import CreateProgress from '../components/characterCreate/CreateProgress.jsx'
import StepAbilities from '../components/characterCreate/StepAbilities.jsx'
import StepClass from '../components/characterCreate/StepClass.jsx'
import StepDetails from '../components/characterCreate/StepDetails.jsx'
import StepOrigin from '../components/characterCreate/StepOrigin.jsx'
import StepReview from '../components/characterCreate/StepReview.jsx'
import StepSkills from '../components/characterCreate/StepSkills.jsx'

const STEPS = [
  { id: 'origin', title: 'Происхождение' },
  { id: 'class', title: 'Класс' },
  { id: 'abilities', title: 'Характеристики' },
  { id: 'skills', title: 'Навыки' },
  { id: 'details', title: 'Детали' },
  { id: 'review', title: 'Сводка' },
]

const statsToTotals = (stats) => ({
  STR: stats?.strength_total ?? 0,
  DEX: stats?.dexterity_total ?? 0,
  CON: stats?.constitution_total ?? 0,
  INT: stats?.intelligence_total ?? 0,
  WIS: stats?.wisdom_total ?? 0,
  CHA: stats?.charisma_total ?? 0,
})

const DEFAULT_FORM = {
  race_id: '',
  subrace_id: '',
  background_id: '',
  class_id: '',
  subclass_id: '',
  level: '1',
  hp_mode: 'average',
  manual_hp: {},
  rolled_dice: {},
  ability_method: 'manual',
  ability_base: baseDefaults(),
  ability_rolls: {},
  class_skill_ids: [],
  expertise_ids: [],
  name: '',
  image_path: '',
  traits: '',
  proficiencies: '',
  backstory: '',
  notes: '',
  money_gold: 0,
  money_silver: 0,
  money_copper: 0,
}

export default function CharacterCreatePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const [races, setRaces] = useState([])
  const [classes, setClasses] = useState([])
  const [backgrounds, setBackgrounds] = useState([])
  const [skills, setSkills] = useState([])

  const [raceDetail, setRaceDetail] = useState(null)
  const [raceDetailId, setRaceDetailId] = useState(null)
  const [raceFeatures, setRaceFeatures] = useState([])
  const [raceFeaturesId, setRaceFeaturesId] = useState(null)
  const [subraceDetail, setSubraceDetail] = useState(null)
  const [subraceDetailId, setSubraceDetailId] = useState(null)
  const [subraceFeatures, setSubraceFeatures] = useState([])
  const [subraceFeaturesId, setSubraceFeaturesId] = useState(null)
  const [classDetail, setClassDetail] = useState(null)
  const [classDetailId, setClassDetailId] = useState(null)
  const [subclassDetail, setSubclassDetail] = useState(null)
  const [subclassDetailId, setSubclassDetailId] = useState(null)
  const [backgroundDetail, setBackgroundDetail] = useState(null)
  const [backgroundDetailId, setBackgroundDetailId] = useState(null)

  const [feats, setFeats] = useState([])
  const [featsLoading, setFeatsLoading] = useState(false)

  const [creating, setCreating] = useState(false)
  const [createProgress, setCreateProgress] = useState(null)
  const [asiPrompt, setAsiPrompt] = useState(null)

  useEffect(() => {
    let active = true
    Promise.all([
      api.races.list({ size: 100 }),
      api.classes.list({ size: 100 }),
      api.backgrounds.list({ size: 100 }),
      api.skills.list({ size: 100 }),
    ])
      .then(([r, c, b, sk]) => {
        if (!active) return
        setRaces(r?.items ?? [])
        setClasses(c?.items ?? [])
        setBackgrounds(b?.items ?? [])
        setSkills(sk?.items ?? [])
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const raceId = form.race_id
    if (!raceId) return () => { active = false }
    api.races
      .get(Number(raceId))
      .then((d) => {
        if (active) {
          setRaceDetail(d)
          setRaceDetailId(raceId)
        }
      })
      .catch(() => {})
    api.races.features
      .list(Number(raceId))
      .then((d) => {
        if (active) {
          setRaceFeatures(Array.isArray(d) ? d : [])
          setRaceFeaturesId(raceId)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [form.race_id])

  useEffect(() => {
    let active = true
    if (!form.race_id || !form.subrace_id) return () => { active = false }
    const raceId = form.race_id
    const subraceId = form.subrace_id
    api.races.subraces
      .get(Number(raceId), Number(subraceId))
      .then((d) => {
        if (active) {
          setSubraceDetail(d)
          setSubraceDetailId(subraceId)
          setSubraceFeatures(Array.isArray(d.features) ? d.features : [])
          setSubraceFeaturesId(subraceId)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [form.race_id, form.subrace_id])

  useEffect(() => {
    let active = true
    const classId = form.class_id
    if (!classId) return () => { active = false }
    api.classes
      .get(Number(classId))
      .then((d) => {
        if (active) {
          setClassDetail(d)
          setClassDetailId(classId)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [form.class_id])

  useEffect(() => {
    let active = true
    const classId = form.class_id
    const subclassId = form.subclass_id
    if (!classId || !subclassId) return () => { active = false }
    api.classes.subclasses
      .get(Number(classId), Number(subclassId))
      .then((d) => {
        if (active) {
          setSubclassDetail(d)
          setSubclassDetailId(subclassId)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [form.class_id, form.subclass_id])

  useEffect(() => {
    let active = true
    const bgId = form.background_id
    if (!bgId) return () => { active = false }
    api.backgrounds
      .get(Number(bgId))
      .then((d) => {
        if (active) {
          setBackgroundDetail(d)
          setBackgroundDetailId(bgId)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [form.background_id])

  const update = (patch) => setForm((f) => ({ ...f, ...patch }))

  const showRaceDetail = form.race_id && String(raceDetailId) === String(form.race_id) ? raceDetail : null
  const showRaceFeatures = form.race_id && String(raceFeaturesId) === String(form.race_id) ? raceFeatures : []
  const showSubraceDetail =
    form.subrace_id && String(subraceDetailId) === String(form.subrace_id) ? subraceDetail : null
  const showSubraceFeatures =
    form.subrace_id && String(subraceFeaturesId) === String(form.subrace_id) ? subraceFeatures : []
  const showClassDetail = form.class_id && String(classDetailId) === String(form.class_id) ? classDetail : null
  const showSubclassDetail =
    form.subclass_id && String(subclassDetailId) === String(form.subclass_id) ? subclassDetail : null
  const showBackgroundDetail =
    form.background_id && String(backgroundDetailId) === String(form.background_id) ? backgroundDetail : null

  const level = Number(form.level) || 1
  const dieSides = showClassDetail?.hit_dice ? Number(String(showClassDetail.hit_dice).replace('D', '')) : 8
  const bonusByCode = {
    ...bonusMap(showRaceDetail?.ability_bonuses),
    ...bonusMap(showSubraceDetail?.ability_bonuses),
  }
  const totals = effectiveTotals(form.ability_base, bonusByCode)
  const conModValue = mod(totals.CON)
  const hpLevel1 = dieSides + conModValue
  const avgGain = Math.floor(dieSides / 2) + 1 + conModValue
  const expertiseBudgetValue = expertiseBudgetFn(showClassDetail?.features ?? [], level)

  const lookups = {
    races,
    classes,
    backgrounds,
    skills,
    raceDetail: showRaceDetail,
    raceFeatures: showRaceFeatures,
    subraceDetail: showSubraceDetail,
    subraceFeatures: showSubraceFeatures,
    classDetail: showClassDetail,
    subclassDetail: showSubclassDetail,
    backgroundDetail: showBackgroundDetail,
  }

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
      case 'origin':
        return Boolean(form.race_id) && Boolean(form.background_id)
      case 'class':
        return Boolean(form.class_id) && level >= 1 && level <= 20
      case 'abilities':
        return STATS.every((s) => {
          const v = Number(form.ability_base[s.key])
          return Number.isFinite(v) && v >= 3 && v <= 20
        })
      case 'skills': {
        const count = showClassDetail?.skill_choice_count ?? 0
        const chosen = (form.class_skill_ids ?? []).length
        const exp = (form.expertise_ids ?? []).length
        return chosen >= count && exp >= expertiseBudgetValue
      }
      case 'details':
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
    let changed = false
    for (let l = 2; l <= level; l++) {
      if (dice[l] == null) {
        dice[l] = rollDie(dieSides)
        changed = true
      }
    }
    if (changed) update({ rolled_dice: dice })
  }

  const rollHpDice = () => {
    const dice = {}
    for (let l = 2; l <= level; l++) dice[l] = rollDie(dieSides)
    update({ rolled_dice: dice })
  }

  const next = () => {
    if (STEPS[step].id === 'class') ensureHpRolls()
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const back = () => setStep((s) => Math.max(s - 1, 0))

  const loadFeats = async () => {
    if (feats.length > 0 || featsLoading) return
    setFeatsLoading(true)
    try {
      const page = await api.feats.list({ size: 100 })
      const list = page?.items ?? []
      const full = await Promise.all(list.map((f) => api.feats.get(f.id).catch(() => null)))
      setFeats(full.filter(Boolean))
    } catch {
      setFeats([])
    } finally {
      setFeatsLoading(false)
    }
  }

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
      await loadFeats()

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
      for (const k of ['image_path', 'traits', 'proficiencies', 'backstory', 'notes']) {
        if (form[k]) body[k] = form[k]
      }

      const created = await api.characters.create(body)
      const id = created.id

      const saves = (showClassDetail?.saving_throws ?? []).map((s) => s.ability)
      if (saves.length) await api.characters.savingThrows(id, { saving_throws: saves })

      const chosen = (form.class_skill_ids ?? []).map(Number)
      const raceGranted = (showRaceDetail?.granted_skills ?? []).map((s) => s.id)
      const bgGranted = (showBackgroundDetail?.granted_skills ?? []).map((s) => s.id)
      const skillIds = [...new Set([...chosen, ...raceGranted, ...bgGranted].map(Number))]
      const expertise = new Set((form.expertise_ids ?? []).map(Number))
      await api.characters.skills(id, {
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
            const feat = feats.find((f) => String(f.id) === String(choice.feat_id))
            const inc = feat?.ability_score_increases?.find(
              (ai) => String(ai.id) === String(choice.ability_score_increase_id),
            )
            if (inc?.ability === 'CON') currentCon += inc.amount
          }
        }

        if (form.hp_mode === 'roll') {
          req.hit_points_gained = (form.rolled_dice?.[lvl] ?? Math.floor(dieSides / 2) + 1) + mod(currentCon)
        } else if (form.hp_mode === 'manual') {
          req.hit_points_gained = form.manual_hp?.[lvl] ?? avgGain
        }

        const response = await api.characters.progression.levelUp(id, req)
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
      case 'origin':
        return <StepOrigin {...props} />
      case 'class':
        return <StepClass {...props} />
      case 'abilities':
        return <StepAbilities {...props} />
      case 'skills':
        return <StepSkills {...props} />
      case 'details':
        return <StepDetails {...props} />
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
          feats={feats}
          featsLoading={featsLoading}
          onCancel={() => resolveAsi(null)}
          onConfirm={resolveAsi}
        />
      )}
      {creating && createProgress && (
        <CreateProgress current={createProgress.current} target={createProgress.target} />
      )}
    </div>
  )
}
