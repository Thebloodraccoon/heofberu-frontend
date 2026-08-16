import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { charactersApi as api } from '@/features/characters/api.js'
import { useCharacter } from '@/features/characters/queries.js'
import {
  useBackgrounds,
  useClasses,
  useClassDetail,
  useFeatures,
  useFeats,
  useItems,
  useRaces,
  useSkills,
  useSpells,
  useSubracesForRace,
} from '@/features/catalog/queries.js'
import { skillLabels } from '@/lib/i18n/index.js'
import { STATS, mod } from '@/lib/utils/ability.js'
import { ErrorBox, Spinner } from '@/components/ui'
import {
  PassiveSenses,
  ProficiencyChips,
  RollModal,
  SheetSectionLabel,
  SheetTabs,
  TextBlock,
} from '@/components/sheet/primitives.jsx'
import SheetHeader from '@/features/characters/components/sheet/SheetHeader.jsx'
import AbilityBlock from '@/features/characters/components/sheet/AbilityBlock.jsx'
import AttacksPanel from '@/features/characters/components/sheet/AttacksPanel.jsx'
import FeaturesPanel from '@/features/characters/components/sheet/FeaturesPanel.jsx'
import EquipmentPanel from '@/features/characters/components/sheet/EquipmentPanel.jsx'
import PersonalityPanel from '@/features/characters/components/sheet/PersonalityPanel.jsx'
import GoalsPanel from '@/features/characters/components/sheet/GoalsPanel.jsx'
import NotesPanel from '@/features/characters/components/sheet/NotesPanel.jsx'
import SpellsPanel from '@/features/characters/components/sheet/SpellsPanel.jsx'
import HpModal from '@/features/characters/components/sheet/HpModal.jsx'
import ConditionsModal from '@/features/characters/components/sheet/ConditionsModal.jsx'
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

  const { data: races = [] } = useRaces({ size: 100 })
  const { data: classes = [] } = useClasses({ size: 100 })
  const { data: backgrounds = [] } = useBackgrounds({ size: 100 })
  const { data: skills = [] } = useSkills({ size: 100 })
  const { data: spells = [] } = useSpells({ size: 100 })
  const { data: items = [] } = useItems({ size: 100 })
  const { data: feats = [] } = useFeats({ size: 100 })
  const { data: features = [] } = useFeatures({ size: 100 })
  const { data: subraces = [] } = useSubracesForRace(character?.race_id)
  const { data: classDetail } = useClassDetail(character?.class_id)

  const lookups = useMemo(
    () => ({ races, classes, backgrounds, skills, spells, items, feats, features, subraces }),
    [races, classes, backgrounds, skills, spells, items, feats, features, subraces]
  )

  const [tab, setTab] = useState('attacks')
  const [editing, setEditing] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [rollsOn, setRollsOn] = useState(true)
  const [roll, setRoll] = useState(null)
  const [hpModal, setHpModal] = useState(false)
  const [conditionsModal, setConditionsModal] = useState(false)
  const [inspiration, setInspiration] = useState(false)
  const [exhaustion, setExhaustion] = useState(0)

  const load = useCallback(async () => {
    const res = await refetch()
    setMutationError(res?.error ?? null)
  }, [refetch])

  const saveField = useCallback(
    (field) => async (value) => {
      try {
        await api.characters.update(id, { [field]: value })
        await load()
      } catch (e) {
        setMutationError(e)
      }
    },
    [id, load]
  )

  const rollDice = (title, bonus) => setRoll({ title, bonus, d20: 1 + Math.floor(Math.random() * 20) })

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
    for (const sk of lookups.skills ?? []) m.set(Number(sk.id), sk)
    return m
  }, [lookups.skills])

  const profSet = useMemo(() => {
    const m = new Map()
    for (const p of character?.skill_proficiencies ?? []) m.set(Number(p.skill_id), p.is_expertise ?? false)
    return m
  }, [character?.skill_proficiencies])

  const saveSet = useMemo(
    () => new Set((character?.saving_throw_proficiencies ?? []).map((s) => s.ability)),
    [character?.saving_throw_proficiencies]
  )

  const skillsByAbility = useMemo(() => {
    const groups = Object.fromEntries(STATS.map((s) => [s.code, []]))
    groups.other = []
    for (const sk of lookups.skills ?? []) {
      const code = sk.ability && groups[sk.ability] ? sk.ability : 'other'
      groups[code].push(sk)
    }
    for (const code of Object.keys(groups)) groups[code].sort((a, b) => String(a.name).localeCompare(String(b.name)))
    return groups
  }, [lookups.skills])

  const passiveSenses = useMemo(() => {
    const findSkill = (key) =>
      (lookups.skills ?? []).find((s) => [s.key, s.slug, s.name].some((v) => String(v ?? '').toLowerCase() === key))
    const build = (key, icon) => {
      const sk = findSkill(key)
      if (!sk) return null
      const prof = profSet.get(Number(sk.id))
      const value = 10 + modFor(sk.ability) + (prof ? pb : 0)
      return { name: skillLabels[key] ?? sk.name, value, icon }
    }
    return [build('perception', <EyeIcon />), build('insight', <FaceIcon />), build('investigation', <SearchIcon />)]
      .filter(Boolean)
  }, [lookups.skills, profSet, pb, modFor])

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

  const cls = lookups.classes.find((x) => x.id === character.class_id)
  const race = lookups.races.find((x) => x.id === character.race_id)
  const bg = lookups.backgrounds.find((x) => x.id === character.background_id)
  const subcls = cls?.subclasses?.find((x) => String(x.id) === String(character.subclass_id))
  const subrace = lookups.subraces.find((x) => x.id === character.subrace_id)

  const subtitle = [cls?.name, subcls?.name, race?.name, subrace?.name, bg?.name]
    .filter(Boolean)
    .join(' · ')

  const saveBonus = (code) => modFor(code) + (saveSet.has(code) ? pb : 0)
  const skillBonus = (sk) => {
    const prof = profSet.get(Number(sk.id))
    const expertise = prof && (character.skill_proficiencies ?? []).find((p) => Number(p.skill_id) === Number(sk.id))?.is_expertise
    return modFor(sk.ability) + (prof ? pb : 0) + (expertise ? pb : 0)
  }

  const attackBonus = (a) => modFor(a.ability) + (a.is_proficient ? pb : 0) + (num(a.bonus_attack) ?? 0)

  const hpDelta = async (delta) => {
    try {
      await api.characters.hp(id, { delta })
      await load()
    } catch (e) {
      setMutationError(e)
    }
  }

  const doRest = async (type) => {
    try {
      await api.characters.rest(id, { type })
      await load()
    } catch (e) {
      setMutationError(e)
    }
  }

  const changeSlot = async (spellLevel, used) => {
    try {
      await api.characters.spellSlots.update(id, { level: spellLevel, used })
      await load()
    } catch (e) {
      setMutationError(e)
    }
  }

  const tabs = [
    ['attacks', 'Атаки'],
    ['features', 'Способности'],
    ['equipment', 'Снаряжение'],
    ['personality', 'Личность'],
    ['goals', 'Цели'],
    ['notes', 'Заметки'],
    ['spells', 'Заклинания'],
  ]

  return (
    <div className="flex flex-col gap-4">
      <SheetHeader
        character={character}
        subtitle={subtitle}
        level={level}
        pb={pb}
        collapsed={collapsed}
        editing={editing}
        inspiration={inspiration}
        exhaustion={exhaustion}
        conditionCount={(character.conditions ?? []).length}
        rollsOn={rollsOn}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onToggleEdit={() => setEditing(!editing)}
        onInspiration={() => setInspiration(!inspiration)}
        onExhaustion={(v) => setExhaustion(v)}
        onOpenHp={() => setHpModal(true)}
        onOpenConditions={() => setConditionsModal(true)}
        onRollInitiative={() => rollDice('Инициатива', modFor('DEX') + (num(character.initiative_bonus) ?? 0))}
      />

      <div className="sheet-body">
        <aside className="sheet-left fantasy-panel rounded-lg p-4">
          {STATS.map((s) => (
            <AbilityBlock
              key={s.code}
              stat={s}
              total={totals[s.code]}
              saveBonus={saveBonus(s.code)}
              saveProf={saveSet.has(s.code)}
              skills={skillsByAbility[s.code]}
              skillMap={skillMap}
              skillBonus={skillBonus}
              rollsOn={rollsOn}
              onRoll={rollDice}
            />
          ))}

          {passiveSenses.length > 0 && (
            <>
              <SheetSectionLabel>Пассивные чувства</SheetSectionLabel>
              <PassiveSenses items={passiveSenses} />
            </>
          )}

          <SheetSectionLabel>Владение доспехами</SheetSectionLabel>
          <ProficiencyChips items={armorProfs} options={ARMOR_OPTIONS} empty="Не задано классом" />

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

          <div className="mt-4">
            <TextBlock
              title="Прочие владения и языки"
              value={character.proficiencies}
              editing={editing}
              onSave={saveField('proficiencies')}
            />
          </div>
        </aside>

        <section className="sheet-right fantasy-panel rounded-lg p-4">
          <SheetTabs
            tabs={tabs}
            active={tab}
            onSelect={setTab}
            rollsOn={rollsOn}
            onToggleRolls={setRollsOn}
          />

          <div className="pt-4">
            {tab === 'attacks' && (
              <AttacksPanel
                character={character}
                editing={editing}
                rollsOn={rollsOn}
                attackBonus={attackBonus}
                onRoll={rollDice}
                onSaveTraits={saveField('traits')}
                onChanged={load}
                onError={setMutationError}
              />
            )}
            {tab === 'features' && (
              <FeaturesPanel
                character={character}
                lookups={lookups}
                editing={editing}
                onChanged={load}
                onError={setMutationError}
              />
            )}
            {tab === 'equipment' && (
              <EquipmentPanel
                character={character}
                lookups={lookups}
                editing={editing}
                onChanged={load}
                onError={setMutationError}
              />
            )}
            {tab === 'personality' && (
              <PersonalityPanel character={character} editing={editing} onSave={saveField} />
            )}
            {tab === 'goals' && (
              <GoalsPanel character={character} editing={editing} onSave={saveField} />
            )}
            {tab === 'notes' && (
              <NotesPanel character={character} editing={editing} onSave={saveField} />
            )}
            {tab === 'spells' && (
              <SpellsPanel
                character={character}
                lookups={lookups}
                editing={editing}
                onChangeSlot={changeSlot}
                onChanged={load}
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
          onRest={doRest}
        />
      )}

      {conditionsModal && (
        <ConditionsModal
          character={character}
          onClose={() => setConditionsModal(false)}
          onChanged={load}
          onError={setMutationError}
        />
      )}

      {roll && <RollModal title={roll.title} bonus={roll.bonus} d20={roll.d20} onClose={() => setRoll(null)} />}
    </div>
  )
}
