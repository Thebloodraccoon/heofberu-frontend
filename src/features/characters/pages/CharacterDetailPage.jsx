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
import { label, skillLabels } from '@/lib/i18n/index.js'
import { STATS, mod } from '@/lib/utils/ability.js'
import { ErrorBox, Spinner } from '@/components/ui'
import {
  PassiveSenses,
  ProficiencyChips,
  SheetSectionLabel,
  SheetTabs,
} from '@/components/sheet/primitives.jsx'
import { EditableBlock } from '@/components/sheet/primitives.jsx'
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
  const [inspiration, setInspiration] = useState(false)

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
    for (const code of Object.keys(groups)) groups[code].sort((a, b) => String(a.name).localeCompare(String(b.name)))
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
      return { name: skillLabels[key] ?? label(sk.name), value, icon }
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
    return raw.map((a) => (typeof a === 'string' ? a : a.weapon_type))
  }, [classDetail])

  if (error || mutationError) return <ErrorBox error={error ?? mutationError} onRetry={load} />
  if (!character) return <Spinner />

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
    } catch (e) {
      setMutationError(e)
    }
  }

  const setTempHp = async (temp_hp) => {
    try {
      await api.hp(id, { temp_hp })
      await load()
    } catch (e) {
      setMutationError(e)
    }
  }

  const doRest = async (type) => {
    try {
      await api.rest(id, { type })
      await load()
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
    ['attacks', 'Атаки'],
    ['features', 'Способности'],
    ['equipment', 'Снаряжение'],
    ['conditions', 'Состояния'],
    ['personality', 'Личность'],
    ['backstory', 'Предыстория'],
    ['notes', 'Заметки'],
    ['spells', 'Заклинания'],
  ]

  return (
    <div className="flex flex-col gap-4">
      <SheetHeader
        character={character}
        fields={identityFields}
        level={level}
        pb={pb}
        inspiration={inspiration}
        exhaustion={exhaustion}
        conditionCount={(character.conditions ?? []).length}
        onInspiration={() => setInspiration(!inspiration)}
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
          {(() => {
            const makeProps = (s) => ({
              key: s.code,
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
                <AbilityBlock {...makeProps(str)} />
                <AbilityBlock {...makeProps(con)} />
              </div>,
            )
            paired.push(<AbilityBlock {...makeProps(wis)} />)
            paired.push(<AbilityBlock {...makeProps(int)} />)
            paired.push(<AbilityBlock {...makeProps(cha)} />)
            paired.push(<AbilityBlock {...makeProps(dex)} />)
            if (passiveSenses.length > 0) {
              paired.push(
                <div key="passive-senses" className="py-1">
                  <SheetSectionLabel className="!mt-0">Пассивные чувства</SheetSectionLabel>
                  <PassiveSenses items={passiveSenses} />
                </div>
              )
            }
            paired.push(
              <div key="armor-profs">
                <SheetSectionLabel>Владение доспехами</SheetSectionLabel>
                <ProficiencyChips items={armorProfs} options={ARMOR_OPTIONS} empty="Не задано классом" />
              </div>,
            )
            paired.push(
              <div key="weapon-profs">
                <SheetSectionLabel>Владение оружием</SheetSectionLabel>
                <ProficiencyChips
                  items={weaponProfs}
                  options={[
                    { value: 'SIMPLE', label: 'Простое' },
                    { value: 'MARTIAL', label: 'Воинское' },
                    { value: 'OTHER', label: 'Другое' },
                  ]}
                  empty="Не задано классом"
                />
              </div>,
            )
            return paired
          })()}
          </aside>
        </div>

        <section className="sheet-right fantasy-panel rounded-lg p-4">
          <SheetTabs tabs={tabs} active={tab} onSelect={setTab} />

          <div className="pt-4">
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
              <BackstoryPanel character={character} onSave={saveField} />
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
