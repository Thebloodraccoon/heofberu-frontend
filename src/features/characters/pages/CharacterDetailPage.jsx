import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { charactersApi as api } from '@/features/characters/api.js'
import { recordRoll } from '@/lib/rollHistory.js'
import { fmtBonus } from '@/lib/utils/sheet.js'
import { useCharacter, useCanLevelUp } from '@/features/characters/queries.js'
import {
  useBackgroundDetail,
  useClassDetail,
  useRaceDetail,
  useSkills,
  useSubclassDetail,
  useSubraceDetail,
} from '@/features/catalog/queries.js'
import { sentenceCase, skillLabels, weaponProficiencyLabels } from '@/lib/i18n/index.js'
import { STATS, mod } from '@/lib/utils/ability.js'
import { ErrorBox, Skeleton, SkeletonCard, SkeletonCircle } from '@/components/ui'
import {
  PassiveSenses,
  ProficiencyList,
  SheetSectionLabel,
  SheetTabs,
} from '@/components/sheet/primitives.jsx'
import SheetRollToasts from '@/components/sheet/SheetRollToasts.jsx'
import SheetHeader from '@/features/characters/components/sheet/SheetHeader.jsx'
import AbilityBlock from '@/features/characters/components/sheet/AbilityBlock.jsx'
import AttacksPanel from '@/features/characters/components/sheet/AttacksPanel.jsx'
import FeaturesPanel from '@/features/characters/components/sheet/FeaturesPanel.jsx'
import EquipmentPanel from '@/features/characters/components/sheet/EquipmentPanel.jsx'
import ConditionsPanel from '@/features/characters/components/sheet/ConditionsPanel.jsx'
import PersonalityPanel from '@/features/characters/components/sheet/PersonalityPanel.jsx'
import BackstoryPanel from '@/features/characters/components/sheet/BackstoryPanel.jsx'
import NotesPanel from '@/features/characters/components/sheet/NotesPanel.jsx'
import SpellsPanel from '@/features/characters/components/sheet/SpellsPanel.jsx'
import StatsCalculator from '@/features/characters/components/sheet/StatsCalculator.jsx'
import PlayerChoices from '@/features/characters/components/sheet/PlayerChoices.jsx'
import HpModal from '@/features/characters/components/sheet/HpModal.jsx'
import ArmorModal from '@/features/characters/components/sheet/ArmorModal.jsx'
import LevelUpModal from '@/features/characters/components/sheet/LevelUpModal.jsx'
import MoneyModal from '@/features/characters/components/sheet/MoneyModal.jsx'
import { ARMOR_OPTIONS, num } from '@/features/characters/components/sheet/constants.js'

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
const FaceIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 15h8" />
    <path d="M8 9h2" />
    <path d="M14 9h2" />
  </svg>
)
const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21 21-4.34-4.34" />
    <circle cx="11" cy="11" r="8" />
  </svg>
)

export default function CharacterDetailPage() {
  const { id } = useParams()
  const { data: character, error, refetch } = useCharacter(id)
  const [mutationError, setMutationError] = useState(null)

  // Identity names resolve via get-by-id of exactly what the character
  // references — no bulk catalog fetches on sheet load.
  const { data: classDetail } = useClassDetail(character?.class_id)
  const { data: subclassDetail } = useSubclassDetail(character?.class_id, character?.subclass_id)
  const { data: raceDetail } = useRaceDetail(character?.race_id)
  const { data: subraceDetail } = useSubraceDetail(character?.race_id, character?.subrace_id)
  const { data: backgroundDetail } = useBackgroundDetail(character?.background_id)
  const { data: skillsCatalog = [] } = useSkills({ size: 100 })

  const [tab, setTab] = useState('attacks')
  const [rollToasts, setRollToasts] = useState([])
  const [hpModal, setHpModal] = useState(false)
  const [armorModal, setArmorModal] = useState(false)
  const [levelUpOpen, setLevelUpOpen] = useState(false)
  const { data: canLevelUpData } = useCanLevelUp(id)
  const [moneyModal, setMoneyModal] = useState(false)

  const load = useCallback(async () => {
    const res = await refetch()
    setMutationError(res?.error ?? null)
  }, [refetch])

  const saveField = useCallback(
    (field) => async (value) => {
      try {
        await api.update(id, { [field]: value })
        await load()
      } catch (e) {
        setMutationError(e)
      }
    },
    [id, load]
  )

  const pushToast = useCallback((title, d20, bonus, total) => {
    const toastId = Date.now() + Math.random()
    setRollToasts((prev) => [...prev.slice(-3), { id: toastId, title, d20, bonus, total }])
    recordRoll({ id: toastId, title, detail: bonus ? `d20 ${fmtBonus(bonus)}` : 'd20', total, at: Date.now() })
  }, [])

  const rollDice = useCallback(
    (title, bonus) => {
      const d20 = 1 + Math.floor(Math.random() * 20)
      pushToast(title, d20, bonus, d20 + Number(bonus ?? 0))
    },
    [pushToast]
  )

  const rollFree = useCallback(
    (counts) => {
      const entries = Object.entries(counts).filter(([, q]) => q > 0)
      if (entries.length === 0) return
      const rolls = []
      let total = 0
      for (const [sides, qty] of entries) {
        for (let i = 0; i < Number(qty); i += 1) {
          const v = 1 + Math.floor(Math.random() * Number(sides))
          rolls.push(v)
          total += v
        }
      }
      const idv = Date.now() + Math.random()
      const title = entries.map(([s, q]) => `${q}к${s}`).join(' + ')
      setRollToasts((prev) => [...prev.slice(-3), { id: idv, title, rolls, total }])
      recordRoll({ id: idv, title, detail: rolls.join(' + '), total, at: Date.now() })
    },
    []
  )

  const dismissToast = useCallback((toastId) => {
    setRollToasts((prev) => prev.filter((t) => t.id !== toastId))
  }, [])

  const exhaustionCondition = useMemo(
    () => (character?.conditions ?? []).find((c) => c.condition === 'EXHAUSTION'),
    [character]
  )

  const changeExhaustion = useCallback(
    async (v) => {
      try {
        if (v === 0) {
          if (exhaustionCondition) await api.conditions.remove(id, 'EXHAUSTION')
        } else if (exhaustionCondition) {
          await api.conditions.update(id, 'EXHAUSTION', { exhaustion_level: v })
        } else {
          await api.conditions.add(id, { condition: 'EXHAUSTION', exhaustion_level: v })
        }
        await load()
      } catch (e) {
        setMutationError(e)
      }
    },
    [id, load, exhaustionCondition]
  )

  const toggleInspiration = useCallback(async () => {
    try {
      await api.update(id, { inspiration: !character?.inspiration })
      await load()
    } catch (e) {
      setMutationError(e)
    }
  }, [id, load, character])

  const level = Number(character?.level) || 1
  const pb = 2 + Math.floor((level - 1) / 4)

  const totals = useMemo(() => {
    const abilityTotals = character?.ability_scores || {}
    return Object.fromEntries(
      STATS.map((s) => [s.code, abilityTotals[`${s.key}_total`] ?? character?.[s.key] ?? 10])
    )
  }, [character])

  const modFor = useCallback((code) => mod(totals[code] ?? 10), [totals])

  const skillMap = useMemo(() => {
    const m = new Map()
    for (const sk of skillsCatalog) m.set(Number(sk.id), sk)
    return m
  }, [skillsCatalog])

  const { profSet, expertiseSet } = useMemo(() => {
    const profs = new Set()
    const experts = new Set()
    for (const p of character?.skill_proficiencies ?? []) {
      const sid = Number(p.skill_id)
      if (Number.isNaN(sid)) continue
      profs.add(sid)
      if (p.is_expertise) experts.add(sid)
    }
    return { profSet: profs, expertiseSet: experts }
  }, [character?.skill_proficiencies])

  const saveSet = useMemo(
    () => new Set((character?.saving_throw_proficiencies ?? []).map((s) => s.ability)),
    [character?.saving_throw_proficiencies]
  )

  const skillsByAbility = useMemo(() => {
    const groups = Object.fromEntries(STATS.map((s) => [s.code, []]))
    groups.other = []
    for (const sk of skillsCatalog) {
      const code = sk.ability && groups[sk.ability] ? sk.ability : 'other'
      groups[code].push(sk)
    }
    const displayName = (sk) => {
      const raw = sk.name ?? ''
      return skillLabels[raw] ?? sentenceCase(raw)
    }
    for (const code of Object.keys(groups)) {
      groups[code].sort((a, b) => displayName(a).localeCompare(displayName(b), 'ru'))
    }
    return groups
  }, [skillsCatalog])

  const passiveSenses = useMemo(() => {
    const findSkill = (key) =>
      skillsCatalog.find((s) => [s.key, s.slug, s.name].some((v) => String(v ?? '').toLowerCase() === key))
    const build = (key, icon) => {
      const sk = findSkill(key)
      if (!sk) return null
      const prof = profSet.has(Number(sk.id))
      const expertise = expertiseSet.has(Number(sk.id))
      const value = 10 + modFor(sk.ability) + (prof ? pb : 0) + (expertise ? pb : 0)
      return { name: skillLabels[key] ?? sentenceCase(sk.name), value, icon }
    }
    return [build('perception', <EyeIcon />), build('insight', <FaceIcon />), build('investigation', <SearchIcon />)]
      .filter(Boolean)
  }, [skillsCatalog, profSet, pb, modFor])

  const armorProfs = useMemo(() => {
    const raw = classDetail?.armor_proficiencies ?? []
    return raw.map((a) => (typeof a === 'string' ? a : a.armor_type))
  }, [classDetail])
  const weaponProfs = useMemo(() => {
    const raw = classDetail?.weapon_proficiencies ?? []
    return raw.map((a) => (typeof a === 'string' ? a : (a.weapon_category ?? a.weapon_type)))
  }, [classDetail])

  if (error || mutationError) return <ErrorBox error={error ?? mutationError} onRetry={load} />
  if (!character) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <div className="fantasy-panel rounded-lg p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-3.5 w-48" />
            </div>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3.5 w-12" />
                  <Skeleton className="h-5 w-14" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="sheet-body">
          <div className="sheet-col-left">
            <aside className="sheet-left fantasy-panel rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="space-y-2 rounded border border-stone-700/60 bg-stone-900/60 p-3">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="mx-auto h-8 w-12" />
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-4/5" />
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <SkeletonCircle size="size-7" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            </aside>
          </div>
          <section className="sheet-right fantasy-panel rounded-lg p-4">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-24" />
              ))}
            </div>
            <div className="pt-4">
              <SkeletonCard />
            </div>
          </section>
        </div>
      </div>
    )
  }

  const identityFields = [
    { label: 'Имя', value: character.name || 'Безымянный персонаж' },
    { label: 'Уровень', value: String(level) },
    { label: 'Класс', value: classDetail?.name },
    { label: 'Подкласс', value: subclassDetail?.name },
    { label: 'Раса', value: raceDetail?.name },
    { label: 'Подраса', value: subraceDetail?.name },
    { label: 'Предыстория', value: backgroundDetail?.name },
  ]

  const exhaustion = exhaustionCondition?.exhaustion_level ?? 0

  const initiativeBonus = modFor('DEX') + (num(character.initiative_bonus) ?? 0)
  const initiativeKey = `heofberu:initiative:${id}`
  let initiativeLast = null
  try {
    const raw = window.localStorage.getItem(initiativeKey)
    if (raw !== null && !Number.isNaN(Number(raw))) initiativeLast = Number(raw)
  } catch {
    initiativeLast = null
  }

  const rollInitiative = () => {
    const d20 = 1 + Math.floor(Math.random() * 20)
    try {
      window.localStorage.setItem(initiativeKey, String(d20 + initiativeBonus))
    } catch {
      /* localStorage недоступен */
    }
    pushToast('Инициатива', d20, initiativeBonus, d20 + initiativeBonus)
  }

  const saveBonus = (code) => modFor(code) + (saveSet.has(code) ? pb : 0)
  const skillBonus = (sk) => {
    const sid = Number(sk.id)
    const prof = profSet.has(sid)
    const expertise = expertiseSet.has(sid)
    return modFor(sk.ability) + (prof ? pb : 0) + (expertise ? pb : 0)
  }

  const attackBonus = (a) => modFor(a.ability) + (a.is_proficient ? pb : 0) + (num(a.bonus_attack) ?? 0)

  const hpDelta = async (delta) => {
    try {
      await api.hp(id, { delta })
      await load()
      setHpModal(false)
    } catch (e) {
      setMutationError(e)
    }
  }

  const setTempHp = async (temp_hp) => {
    try {
      await api.hp(id, { temp_hp })
      await load()
      setHpModal(false)
    } catch (e) {
      setMutationError(e)
    }
  }

  const doRest = async (type) => {
    try {
      await api.rest(id, { type })
      await load()
      setHpModal(false)
    } catch (e) {
      setMutationError(e)
    }
  }

  const saveArmor = async ({ armor_class, shield }) => {
    try {
      await api.update(id, { armor_class, shield })
      await load()
      setArmorModal(false)
    } catch (e) {
      setMutationError(e)
    }
  }

  const tabs = [
    ['abilities', 'Характеристики', 'lg:hidden'],
    ['attacks', 'Атаки'],
    ['features', 'Способности'],
    ['equipment', 'Снаряжение'],
    ['conditions', 'Состояния'],
    ['personality', 'Личность'],
    ['backstory', 'Предыстория'],
    ['notes', 'Заметки'],
    ['spells', 'Заклинания'],
    ['calculator', 'Развитие персонажа'],
  ]

  const renderAbilities = () => {
    const makeProps = (s) => ({
      stat: s,
      total: totals[s.code],
      saveBonus: saveBonus(s.code),
      saveProf: saveSet.has(s.code),
      skills: skillsByAbility[s.code],
      skillMap,
      skillBonus,
      skillChecked: (sk) => profSet.has(Number(sk.id)),
      skillExpertise: (sk) => expertiseSet.has(Number(sk.id)),
      onRoll: rollDice,
    })
    const paired = []
    const [str, dex, con, int, wis, cha] = STATS
    paired.push(
      <div key="str-con" className="sheet-ability-pair">
        <AbilityBlock key={str.code} {...makeProps(str)} />
        <AbilityBlock key={con.code} {...makeProps(con)} />
      </div>,
    )
    paired.push(<AbilityBlock key={wis.code} {...makeProps(wis)} />)
    paired.push(<AbilityBlock key={int.code} {...makeProps(int)} />)
    paired.push(<AbilityBlock key={cha.code} {...makeProps(cha)} />)
    paired.push(<AbilityBlock key={dex.code} {...makeProps(dex)} />)
    if (passiveSenses.length > 0) {
      paired.push(
        <div key="passive-senses" className="py-1">
          <SheetSectionLabel className="!mt-0">Пассивные чувства</SheetSectionLabel>
          <PassiveSenses items={passiveSenses} />
        </div>,
      )
    }
    paired.push(
      <div key="armor-profs" style={{ gridColumn: '1 / -1' }}>
        <SheetSectionLabel>Владение доспехами</SheetSectionLabel>
        <ProficiencyList items={armorProfs} options={ARMOR_OPTIONS} empty="Не задано классом" />
      </div>,
    )
    paired.push(
      <div key="weapon-profs" style={{ gridColumn: '1 / -1' }}>
        <SheetSectionLabel>Владение оружием</SheetSectionLabel>
        <ProficiencyList
          items={weaponProfs}
          options={Object.entries(weaponProficiencyLabels).map(([value, label]) => ({ value, label }))}
          empty="Не задано классом"
        />
      </div>,
    )
    return paired
  }

  return (
    <div className="flex flex-col gap-4">
      <SheetHeader
        character={character}
        fields={identityFields}
        level={level}
        pb={pb}
        inspiration={Boolean(character?.inspiration)}
        exhaustion={exhaustion}
        conditionCount={(character.conditions ?? []).length}
        onInspiration={toggleInspiration}
        onExhaustion={changeExhaustion}
        onOpenHp={() => setHpModal(true)}
        onOpenAc={() => setArmorModal(true)}
        levelUpInfo={canLevelUpData}
        onOpenLevelUp={() => setLevelUpOpen(true)}
        onOpenConditions={() => setTab('conditions')}
        onOpenMoney={() => setMoneyModal(true)}
        initiativeBonus={initiativeBonus}
        initiativeLast={initiativeLast}
        onRollInitiative={rollInitiative}
        onRollFree={rollFree}
      />

      <div className="sheet-body">
        <div className="sheet-col-left">
          <aside className="sheet-left fantasy-panel rounded-lg p-4">
            {renderAbilities()}
          </aside>
        </div>

        <section className="sheet-right fantasy-panel rounded-lg p-4">
          <SheetTabs tabs={tabs} active={tab} onSelect={setTab} />

          <div className="pt-4">
            {tab === 'abilities' && (
              <div className="sheet-left sheet-abilities-tab">
                {renderAbilities()}
              </div>
            )}
            {tab === 'calculator' && (
              <div className="grid gap-5 lg:grid-cols-2">
                <StatsCalculator characterId={character.id} />
                <PlayerChoices characterId={character.id} />
              </div>
            )}
            {tab === 'attacks' && (
              <AttacksPanel
                characterId={character.id}
                attackBonus={attackBonus}
                onRoll={rollDice}
                onError={setMutationError}
              />
            )}
            {tab === 'features' && (
              <FeaturesPanel character={character} onError={setMutationError} />
            )}
            {tab === 'equipment' && (
              <EquipmentPanel character={character} onError={setMutationError} />
            )}
            {tab === 'conditions' && (
              <ConditionsPanel character={character} onError={setMutationError} />
            )}
            {tab === 'personality' && (
              <PersonalityPanel character={character} onSave={saveField} />
            )}
            {tab === 'backstory' && (
              <BackstoryPanel characterId={id} onError={setMutationError} />
            )}
            {tab === 'notes' && (
              <NotesPanel character={character} onSave={saveField} />
            )}
            {tab === 'spells' && (
              <SpellsPanel
                character={character}
                onError={setMutationError}
              />
            )}
          </div>
        </section>
      </div>

      {hpModal && (
        <HpModal
          character={character}
          onClose={() => setHpModal(false)}
          onDelta={hpDelta}
          onTempHp={setTempHp}
          onRest={doRest}
        />
      )}

      {armorModal && (
        <ArmorModal character={character} onClose={() => setArmorModal(false)} onSave={saveArmor} />
      )}

      {levelUpOpen && (
        <LevelUpModal
          character={character}
          onClose={() => setLevelUpOpen(false)}
          onError={setMutationError}
          onRollToast={pushToast}
        />
      )}

      {moneyModal && (
        <MoneyModal character={character} onClose={() => setMoneyModal(false)} onError={setMutationError} />
      )}

      <SheetRollToasts toasts={rollToasts} onDismiss={dismissToast} />
    </div>
  )
}
