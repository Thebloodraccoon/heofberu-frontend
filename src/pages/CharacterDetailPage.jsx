import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/endpoints.js'
import { label, armorProficiencyLabels, skillLabels, conditionLabels } from '../labels.js'
import { STATS, mod } from '../utils/ability.js'
import { Button, EmptyState, ErrorBox, Field, Input, Modal, Select, Spinner } from '../components/ui.jsx'
import {
  BoxedValue,
  CheckDot,
  PassiveSenses,
  ProficiencyChips,
  RollButton,
  RollModal,
  SheetSectionLabel,
  SheetTabs,
  TextBlock,
  XpBar,
} from '../components/sheet/primitives.jsx'

const ATTACK_TYPES = ['MELEE_ATTACK', 'RANGED_ATTACK']
const DICE_TYPES = ['D4', 'D6', 'D8', 'D10', 'D12', 'D20', 'D100']
const DAMAGE_TYPES = [
  'SLASHING', 'PIERCING', 'BLUDGEONING', 'ACID', 'COLD', 'FIRE', 'FORCE',
  'LIGHTNING', 'NECROTIC', 'POISON', 'PSYCHIC', 'RADIANT', 'THUNDER',
]
const CONDITIONS = [
  'BLINDED', 'CHARMED', 'DEAFENED', 'FRIGHTENED', 'GRAPPLED', 'INCAPACITATED',
  'INVISIBLE', 'PARALYZED', 'PETRIFIED', 'POISONED', 'PRONE', 'RESTRAINED',
  'STUNNED', 'UNCONSCIOUS', 'EXHAUSTION',
]

const ARMOR_OPTIONS = ['LIGHT', 'MEDIUM', 'HEAVY', 'SHIELD'].map((v) => ({
  value: v,
  label: armorProficiencyLabels[v] ?? label(v),
}))

const SPELL_LEVEL_ORDER = [
  'CANTRIP', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4',
  'LEVEL_5', 'LEVEL_6', 'LEVEL_7', 'LEVEL_8', 'LEVEL_9',
]

const num = (v) => (v === '' || v === undefined || v === null ? null : Number(v))

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
  const [character, setCharacter] = useState(null)
  const [error, setError] = useState(null)
  const [classDetail, setClassDetail] = useState(null)
  const [lookups, setLookups] = useState({ races: [], classes: [], backgrounds: [], skills: [], spells: [], items: [], feats: [], features: [], subraces: [] })

  const [tab, setTab] = useState('attacks')
  const [editing, setEditing] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [rollsOn, setRollsOn] = useState(true)
  const [roll, setRoll] = useState(null)
  const [hpModal, setHpModal] = useState(false)
  const [conditionsModal, setConditionsModal] = useState(false)
  const [inspiration, setInspiration] = useState(false)
  const [exhaustion, setExhaustion] = useState(0)

  useEffect(() => {
    let active = true
    const run = async () => {
      try {
        const data = await api.characters.get(id)
        if (!active) return
        setError(null)
        setCharacter(data)
      } catch (e) {
        if (active) setError(e)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    let active = true
    api.races.list({ size: 100 }).then((p) => { if (active) setLookups((l) => ({ ...l, races: p.items ?? [] })) }).catch(() => {})
    api.classes.list({ size: 100 }).then((p) => { if (active) setLookups((l) => ({ ...l, classes: p.items ?? [] })) }).catch(() => {})
    api.backgrounds.list({ size: 100 }).then((p) => { if (active) setLookups((l) => ({ ...l, backgrounds: p.items ?? [] })) }).catch(() => {})
    api.skills.list({ size: 100 }).then((p) => { if (active) setLookups((l) => ({ ...l, skills: p.items ?? [] })) }).catch(() => {})
    api.spells.list({ size: 100 }).then((p) => { if (active) setLookups((l) => ({ ...l, spells: p.items ?? [] })) }).catch(() => {})
    api.items.list({ size: 100 }).then((p) => { if (active) setLookups((l) => ({ ...l, items: p.items ?? [] })) }).catch(() => {})
    api.feats.list({ size: 100 }).then((p) => { if (active) setLookups((l) => ({ ...l, feats: p.items ?? [] })) }).catch(() => {})
    api.features.list({ size: 100 }).then((p) => { if (active) setLookups((l) => ({ ...l, features: p.items ?? [] })) }).catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const raceId = character?.race_id
    if (!raceId) return () => { active = false }
    api.races.subraces
      .list(Number(raceId))
      .then((res) => {
        if (active) setLookups((l) => ({ ...l, subraces: Array.isArray(res) ? res : res?.items ?? [] }))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [character?.race_id])

  useEffect(() => {
    let active = true
    const classId = character?.class_id
    if (!classId) return () => { active = false }
    api.classes
      .get(Number(classId))
      .then((data) => {
        if (active) setClassDetail(data)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [character?.class_id])

  const load = useCallback(async () => {
    try {
      setCharacter(await api.characters.get(id))
    } catch (e) {
      setError(e)
    }
  }, [id])

  const saveField = useCallback(
    (field) => async (value) => {
      try {
        await api.characters.update(id, { [field]: value })
        await load()
      } catch (e) {
        setError(e)
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

  if (error) return <ErrorBox error={error} onRetry={load} />
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
      setError(e)
    }
  }

  const doRest = async (type) => {
    try {
      await api.characters.rest(id, { type })
      await load()
    } catch (e) {
      setError(e)
    }
  }

  const changeSlot = async (spellLevel, used) => {
    try {
      await api.characters.spellSlots.update(id, { level: spellLevel, used })
      await load()
    } catch (e) {
      setError(e)
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
                onError={setError}
              />
            )}
            {tab === 'features' && (
              <FeaturesPanel
                character={character}
                lookups={lookups}
                editing={editing}
                onChanged={load}
                onError={setError}
              />
            )}
            {tab === 'equipment' && (
              <EquipmentPanel
                character={character}
                lookups={lookups}
                editing={editing}
                onChanged={load}
                onError={setError}
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
                onError={setError}
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
          onError={setError}
        />
      )}

      {roll && <RollModal title={roll.title} bonus={roll.bonus} d20={roll.d20} onClose={() => setRoll(null)} />}
    </div>
  )
}

/* ===== Шапка листа ===== */

function SheetHeader({
  character,
  subtitle,
  level,
  pb,
  collapsed,
  editing,
  inspiration,
  exhaustion,
  conditionCount,
  rollsOn,
  onToggleCollapse,
  onToggleEdit,
  onInspiration,
  onExhaustion,
  onOpenHp,
  onOpenConditions,
  onRollInitiative,
}) {
  return (
    <div className="sheet-header">
      {!collapsed && (
        <div className="flex items-center gap-3 px-4 pb-3 pt-3">
          <Link
            to="/characters"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-stone-700 bg-stone-800/70 text-stone-300 transition hover:border-ember hover:text-ember"
            title="К списку персонажей"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold text-stone-100">{character.name || 'Безымянный персонаж'}</p>
            <p className="truncate text-xs text-stone-400">{subtitle || '&nbsp;'}</p>
            <div className="mt-2 max-w-xs">
              <XpBar level={level} current={0} next={300} />
            </div>
          </div>
          <span className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-stone-600 bg-stone-900 font-display text-lg font-black text-stone-100 shadow-[inset_0_0_0_2px_rgba(0,0,0,0.35)]">
            {(character.name || '?').slice(0, 1).toUpperCase()}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-stone-800 px-4 py-2.5">
        <BoxedValue label="КД">{character.armor_class ?? '—'}</BoxedValue>
        <BoxedValue label="Скорость">{character.speed ?? '—'}</BoxedValue>
        <BoxedValue label="Владение">+{pb}</BoxedValue>
        <div className="ml-auto flex items-center gap-4">
          <span className="sheet-chip" title="Золото">
            ⛁ {character.money_gold ?? 0}
          </span>
          <button type="button" className="sheet-btn" onClick={onOpenHp} title="Отдых и хиты">
            ⛺ Отдых
          </button>
          <button type="button" className="sheet-btn" onClick={onOpenHp} title="Хиты">
            ♥ {character.current_hp ?? 0}/{character.max_hp ?? 0}
            {character.temp_hp > 0 && <span className="ml-1 text-emerald-300">(+{character.temp_hp})</span>}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-stone-800 px-4 py-2.5">
          <BoxedValue label="Вдохновение" boxClassName="p-0">
            <input
              type="checkbox"
              checked={inspiration}
              onChange={onInspiration}
              className="size-4 accent-ember"
              title="Вдохновение"
            />
          </BoxedValue>
          <BoxedValue label="Состояния">
            <button type="button" className="text-sm text-ember hover:underline" onClick={onOpenConditions}>
              {conditionCount > 0 ? conditionCount : '—'}
            </button>
          </BoxedValue>
          <BoxedValue label="Истощение">
            <select
              value={exhaustion}
              onChange={(e) => onExhaustion(Number(e.target.value))}
              className="w-12 rounded border border-stone-700 bg-stone-800/70 px-1 py-1 text-center text-sm text-stone-100 outline-none focus:border-ember"
              title="Уровень истощения"
            >
              {[0, 1, 2, 3, 4, 5, 6].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </BoxedValue>
          <BoxedValue label="Инициатива">
            <RollButton bonus={0} disabled={!rollsOn} onClick={onRollInitiative} title="Инициатива" />
          </BoxedValue>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleEdit}
              className={`sheet-btn ${editing ? 'sheet-btn_primary' : ''}`}
            >
              {editing ? '✓ Готово' : '✎ Редактировать'}
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex w-full items-center justify-center gap-1 rounded-b-xl border-t border-stone-800 py-1 text-[11px] uppercase tracking-wide text-stone-500 transition hover:text-stone-300"
      >
        <svg className={`size-3 transition ${collapsed ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
        </svg>
        {collapsed ? 'развернуть' : 'свернуть'}
      </button>
    </div>
  )
}

/* ===== Блок характеристики ===== */

function SkillRow({ labelText, bonus, onRoll, dot, rollsOn }) {
  return (
    <div className="sheet-skill">
      <span className="sheet-skill__label">
        {dot != null && <CheckDot checked={dot.checked} onChange={dot.onChange} />}
        <span>{labelText}</span>
      </span>
      <RollButton bonus={bonus} onClick={onRoll} compact disabled={!rollsOn} title={`Бросок: ${labelText}`} />
    </div>
  )
}

function AbilityBlock({ stat, total, saveBonus, saveProf, skills, skillMap, skillBonus, rollsOn, onRoll }) {
  const m = mod(total)
  return (
    <div className="sheet-ability">
      <div className="sheet-ability__name">
        <span className="sheet-ability__name-link">{stat.label}</span>
        <span className="ml-auto flex items-baseline gap-1.5">
          <span className="text-xs text-stone-600">—</span>
          <span className="sheet-ability__score">{total}</span>
        </span>
      </div>

      <div className="sheet-ability__checks">
        <SkillRow
          labelText="Проверка"
          bonus={m}
          rollsOn={rollsOn}
          onRoll={() => onRoll(`${stat.label}: проверка`, m)}
        />
        <SkillRow
          labelText="Спасбросок"
          bonus={saveBonus}
          rollsOn={rollsOn}
          dot={{ checked: saveProf }}
          onRoll={() => onRoll(`${stat.label}: спасбросок`, saveBonus)}
        />
      </div>

      {(skills ?? []).map((sk) => (
        <SkillRow
          key={sk.id}
          labelText={skillMap.get(Number(sk.id))?.name ?? sk.name}
          bonus={skillBonus(sk)}
          rollsOn={rollsOn}
          onRoll={() => onRoll(`Навык: ${skillMap.get(Number(sk.id))?.name ?? sk.name}`, skillBonus(sk))}
        />
      ))}
    </div>
  )
}

/* ===== Вкладки ===== */

function AttacksPanel({ character, editing, rollsOn, attackBonus, onRoll, onSaveTraits, onChanged, onError }) {
  const attacks = character.attacks ?? []
  const [form, setForm] = useState({
    name: '',
    attack_type: 'MELEE_ATTACK',
    ability: 'STR',
    is_proficient: true,
    bonus_attack: 0,
    bonus_damage: 0,
    damage_dice_count: 1,
    damage_dice_type: 'D8',
    damage_type: 'SLASHING',
    range: '',
    notes: '',
  })
  const [showForm, setShowForm] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const add = async (e) => {
    e.preventDefault()
    setShowForm(false)
    try {
      const body = {
        ...form,
        is_proficient: form.is_proficient === 'true' || form.is_proficient === true,
        bonus_attack: num(form.bonus_attack) ?? 0,
        bonus_damage: num(form.bonus_damage) ?? 0,
        damage_dice_count: num(form.damage_dice_count),
        range: form.range || undefined,
        notes: form.notes || undefined,
      }
      await api.characters.attacks.add(character.id, body)
      setForm((f) => ({ ...f, name: '' }))
      await onChanged()
    } catch (err) {
      onError(err)
    }
  }

  const remove = async (attackId) => {
    try {
      await api.characters.attacks.remove(character.id, attackId)
      await onChanged()
    } catch (err) {
      onError(err)
    }
  }

  return (
    <div className="space-y-4">
      {attacks.length === 0 && <EmptyState text="Атак пока нет" />}
      {attacks.length > 0 && (
        <table className="sheet-table">
          <thead>
            <tr>
              <th>название</th>
              <th className="w-20">Бонус</th>
              <th>урон / вид</th>
              {editing && <th className="w-20" />}
            </tr>
          </thead>
          <tbody>
            {attacks.map((a) => (
              <tr key={a.id}>
                <td className="font-medium text-stone-100">{a.name}</td>
                <td>
                  <RollButton
                    bonus={attackBonus(a)}
                    compact
                    disabled={!rollsOn}
                    onClick={() => onRoll(`Атака: ${a.name}`, attackBonus(a))}
                  />
                </td>
                <td>
                  <RollButton
                    bonus={0}
                    compact
                    disabled={!rollsOn}
                    onClick={() => onRoll(`Урон: ${a.name}`, (num(a.bonus_damage) ?? 0))}
                    className="mr-2"
                  />
                  {a.damage_dice_count && a.damage_dice_type
                    ? `${a.damage_dice_count}${a.damage_dice_type.replace('D', 'к')}${a.damage_type ? ` ${label(a.damage_type).toLowerCase()}` : ''}`
                    : ''}
                </td>
                {editing && (
                  <td className="text-right">
                    <button type="button" className="sheet-btn" onClick={() => remove(a.id)}>Удалить</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <TextBlock
        title="Атаки и заклинания"
        value={character.traits}
        editing={editing}
        onSave={onSaveTraits}
      />

      {editing && (
        <div>
          {!showForm ? (
            <button type="button" className="sheet-btn" onClick={() => setShowForm(true)}>
              + Добавить атаку
            </button>
          ) : (
            <form onSubmit={add} className="space-y-3 rounded-lg border border-stone-700/70 bg-stone-900/60 p-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Название *"><Input required value={form.name} onChange={set('name')} /></Field>
                <Field label="Тип">
                  <Select value={form.attack_type} onChange={set('attack_type')}>
                    {ATTACK_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
                  </Select>
                </Field>
                <Field label="Характеристика">
                  <Select value={form.ability} onChange={set('ability')}>
                    {STATS.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
                  </Select>
                </Field>
                <Field label="Владение">
                  <Select value={String(form.is_proficient)} onChange={set('is_proficient')}>
                    <option value="true">Да</option>
                    <option value="false">Нет</option>
                  </Select>
                </Field>
                <Field label="Кол-во костей"><Input type="number" min="0" value={form.damage_dice_count} onChange={set('damage_dice_count')} /></Field>
                <Field label="Кость">
                  <Select value={form.damage_dice_type} onChange={set('damage_dice_type')}>
                    {DICE_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </Field>
                <Field label="Тип урона">
                  <Select value={form.damage_type} onChange={set('damage_type')}>
                    {DAMAGE_TYPES.map((d) => <option key={d} value={d}>{label(d)}</option>)}
                  </Select>
                </Field>
                <Field label="Бонус атаки"><Input type="number" value={form.bonus_attack} onChange={set('bonus_attack')} /></Field>
                <Field label="Бонус урона"><Input type="number" value={form.bonus_damage} onChange={set('bonus_damage')} /></Field>
                <Field label="Дистанция"><Input value={form.range} onChange={set('range')} /></Field>
                <Field label="Заметки"><Input value={form.notes} onChange={set('notes')} /></Field>
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit">Добавить атаку</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Отмена</Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

function FeatSection({ title, items, editing, renderName, onRemove }) {
  return (
    <div className="space-y-2">
      <p className="sheet-section-label">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-stone-500">Ничего не добавлено</p>
      ) : (
        <ul className="space-y-2">
          {items.map((cf) => (
            <li key={cf.id} className="flex items-start justify-between gap-3 rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-100">{renderName(cf)}</p>
              </div>
              {editing && (
                <button type="button" className="sheet-btn shrink-0" onClick={() => onRemove(cf)}>
                  Убрать
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FeaturesPanel({ character, lookups, editing, onChanged, onError }) {
  const feats = character.feats ?? []
  const features = character.features ?? []
  const [featId, setFeatId] = useState('')
  const [featureId, setFeatureId] = useState('')
  const findFeat = (idv) => lookups.feats.find((x) => x.id === idv)?.name
  const findFeature = (idv) => lookups.features.find((x) => x.id === idv)?.name

  const addFeat = async () => {
    if (!featId) return
    try {
      await api.characters.feats.add(character.id, { feat_id: Number(featId) })
      setFeatId('')
      await onChanged()
    } catch (e) {
      onError(e)
    }
  }

  const addFeature = async () => {
    if (!featureId) return
    try {
      await api.characters.features.add(character.id, { feature_id: Number(featureId) })
      setFeatureId('')
      await onChanged()
    } catch (e) {
      onError(e)
    }
  }

  const removeFeat = async (cfId) => {
    try {
      await api.characters.feats.remove(character.id, cfId)
      await onChanged()
    } catch (e) {
      onError(e)
    }
  }

  const removeFeature = async (cfId) => {
    try {
      await api.characters.features.remove(character.id, cfId)
      await onChanged()
    } catch (e) {
      onError(e)
    }
  }

  return (
    <div className="space-y-5">
      <FeatSection
        title="Черты"
        items={feats.map((cf) => ({ ...cf, is_feat: true }))}
        editing={editing}
        renderName={(cf) => findFeat(cf.feat_id) || `Черта #${cf.feat_id}`}
        onRemove={(cf) => (cf.is_feat ? removeFeat(cf.id) : removeFeature(cf.id))}
      />
      <FeatSection
        title="Свойства"
        items={features.map((cf) => ({ ...cf, is_feat: false }))}
        editing={editing}
        renderName={(cf) => findFeature(cf.feature_id) || `Свойство #${cf.feature_id}`}
        onRemove={(cf) => (cf.is_feat ? removeFeat(cf.id) : removeFeature(cf.id))}
      />

      {editing && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-end gap-2">
            <Field label="Добавить черту">
              <Select value={featId} onChange={(e) => setFeatId(e.target.value)}>
                <option value="">Выберите...</option>
                {lookups.feats.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            </Field>
            <Button onClick={addFeat}>+</Button>
          </div>
          <div className="flex items-end gap-2">
            <Field label="Добавить свойство">
              <Select value={featureId} onChange={(e) => setFeatureId(e.target.value)}>
                <option value="">Выберите...</option>
                {lookups.features.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            </Field>
            <Button onClick={addFeature}>+</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function EquipmentPanel({ character, lookups, editing, onChanged, onError }) {
  const items = character.items ?? []
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const findItem = (idv) => lookups.items.find((x) => x.id === idv)?.name

  const add = async () => {
    if (!itemId) return
    setShowForm(false)
    try {
      await api.characters.items.add(character.id, {
        item_id: Number(itemId),
        quantity: Number(quantity) || 1,
        is_equipped: false,
        is_attuned: false,
      })
      setItemId('')
      await onChanged()
    } catch (e) {
      onError(e)
    }
  }

  const update = async (charItemId, patch) => {
    try {
      await api.characters.items.update(character.id, charItemId, patch)
      await onChanged()
    } catch (e) {
      onError(e)
    }
  }

  const remove = async (charItemId) => {
    try {
      await api.characters.items.remove(character.id, charItemId)
      await onChanged()
    } catch (e) {
      onError(e)
    }
  }

  return (
    <div className="space-y-4">
      {items.length === 0 && <EmptyState text="Инвентарь пуст" />}
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((ci) => (
            <li key={ci.id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-100">
                  {findItem(ci.item_id) || `Предмет #${ci.item_id}`}
                  <span className="ml-2 text-xs font-normal text-stone-400">×{ci.quantity}</span>
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => update(ci.id, { is_equipped: !ci.is_equipped })}
                    className={`sheet-chip ${ci.is_equipped ? 'sheet-chip_on' : ''}`}
                  >
                    <span className="sheet-chip__dot" />
                    Экипировано
                  </button>
                  <button
                    type="button"
                    onClick={() => update(ci.id, { is_attuned: !ci.is_attuned })}
                    className={`sheet-chip ${ci.is_attuned ? 'sheet-chip_on' : ''}`}
                  >
                    <span className="sheet-chip__dot" />
                    Настроено
                  </button>
                </div>
              </div>
              {editing && (
                <button type="button" className="sheet-btn shrink-0" onClick={() => remove(ci.id)}>
                  Удалить
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
        <p className="sheet-section-label !mt-0">Деньги</p>
        <div className="flex gap-5 text-sm">
          <span className="text-stone-200"><span className="text-yellow-300">⛁</span> {character.money_gold ?? 0} зм</span>
          <span className="text-stone-200"><span className="text-stone-300">⛀</span> {character.money_silver ?? 0} см</span>
          <span className="text-stone-200"><span className="text-amber-700">⛁</span> {character.money_copper ?? 0} мм</span>
        </div>
      </div>

      {editing && (
        <div>
          {!showForm ? (
            <button type="button" className="sheet-btn" onClick={() => setShowForm(true)}>
              + Добавить предмет
            </button>
          ) : (
            <div className="grid gap-3 rounded-lg border border-stone-700/70 bg-stone-900/60 p-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Предмет">
                  <Select value={itemId} onChange={(e) => setItemId(e.target.value)}>
                    <option value="">Выберите...</option>
                    {lookups.items.map((it) => (
                      <option key={it.id} value={it.id}>{it.name}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Кол-во"><Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></Field>
              <div className="flex items-end gap-2">
                <Button onClick={add}>Добавить</Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>Отмена</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PersonalityPanel({ character, editing, onSave }) {
  return (
    <div className="space-y-3">
      <TextBlock title="Черты характера" value={character.personality_traits} editing={editing} onSave={onSave('personality_traits')} />
      <TextBlock title="Идеалы" value={character.ideals} editing={editing} onSave={onSave('ideals')} />
      <TextBlock title="Привязанности" value={character.bonds} editing={editing} onSave={onSave('bonds')} />
      <TextBlock title="Слабости" value={character.flaws} editing={editing} onSave={onSave('flaws')} />
    </div>
  )
}

function GoalsPanel({ character, editing, onSave }) {
  return (
    <div className="space-y-3">
      <TextBlock title="История и цели" value={character.backstory} editing={editing} onSave={onSave('backstory')} />
    </div>
  )
}

function NotesPanel({ character, editing, onSave }) {
  return (
    <div className="space-y-3">
      <TextBlock title="Заметки" value={character.notes} editing={editing} onSave={onSave('notes')} />
    </div>
  )
}

function SpellsPanel({ character, lookups, editing, onChangeSlot, onChanged, onError }) {
  const [spellId, setSpellId] = useState('')
  const spells = character.spells ?? []
  const slots = character.spell_slots ?? []

  const byLevel = useMemo(() => {
    const groups = {}
    for (const cs of character.spells ?? []) {
      const lv = cs.spell?.level ?? 'OTHER'
      if (!groups[lv]) groups[lv] = []
      groups[lv].push(cs)
    }
    return groups
  }, [character.spells])

  const add = async () => {
    if (!spellId) return
    try {
      await api.characters.spells.add(character.id, { spell_id: Number(spellId) })
      setSpellId('')
      await onChanged()
    } catch (e) {
      onError(e)
    }
  }

  const remove = async (sid) => {
    try {
      await api.characters.spells.remove(character.id, sid)
      await onChanged()
    } catch (e) {
      onError(e)
    }
  }

  return (
    <div className="space-y-5">
      {slots.length > 0 && (
        <div>
          <p className="sheet-section-label">Слоты заклинаний</p>
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <div key={slot.spell_level} className="sheet-boxed">
                <div className="sheet-boxed__box min-w-0 flex-col !gap-0.5 !px-3">
                  <span className="text-sm">{slot.used} / {slot.total}</span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      disabled={slot.used <= 0}
                      onClick={() => onChangeSlot(slot.spell_level, slot.used - 1)}
                      className="sheet-btn !px-1.5"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      disabled={slot.used >= slot.total}
                      onClick={() => onChangeSlot(slot.spell_level, slot.used + 1)}
                      className="sheet-btn !px-1.5"
                    >
                      +
                    </button>
                  </span>
                </div>
                <span className="sheet-boxed__label">{label(slot.spell_level)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="sheet-section-label">Заклинания</p>
        {spells.length === 0 && <EmptyState text="Заклинаний пока нет" />}
        <div className="space-y-4">
          {SPELL_LEVEL_ORDER.filter((lv) => byLevel[lv]).map((lv) => (
            <div key={lv}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
                {lv === 'CANTRIP' ? 'Заговоры' : label(lv)}
              </p>
              <ul className="space-y-2">
                {byLevel[lv].map((cs) => {
                  const sp = cs.spell || {}
                  return (
                    <li key={cs.spell_id} className="rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-100">{sp.name || `Заклинание #${cs.spell_id}`}</p>
                          <p className="mt-0.5 text-xs text-stone-400">
                            {[sp.school && label(sp.school), sp.cast_time && label(sp.cast_time)].filter(Boolean).join(' · ')}
                          </p>
                          {sp.range_type && (
                            <p className="mt-0.5 text-xs text-stone-400">
                              Дистанция: {label(sp.range_type)}{sp.range_value ? ` (${sp.range_value})` : ''}
                              {sp.duration ? ` · ${label(sp.duration)}` : ''}
                            </p>
                          )}
                        </div>
                        {editing && (
                          <button type="button" className="sheet-btn shrink-0" onClick={() => remove(cs.spell_id)}>
                            Убрать
                          </button>
                        )}
                      </div>
                      {sp.description && <p className="mt-2 text-sm text-stone-400">{sp.description}</p>}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <div className="flex items-end gap-2">
          <Field label="Добавить заклинание">
            <Select value={spellId} onChange={(e) => setSpellId(e.target.value)}>
              <option value="">Выберите...</option>
              {lookups.spells.map((sp) => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </Select>
          </Field>
          <Button onClick={add}>Добавить</Button>
        </div>
      )}
    </div>
  )
}

/* ===== Модалки ===== */

function HpModal({ character, onClose, onDelta, onRest }) {
  const [delta, setDelta] = useState('')
  const apply = () => {
    if (delta === '') return
    onDelta(num(delta))
    setDelta('')
  }
  return (
    <Modal title="Хиты и отдых" onClose={onClose} size="sm">
        <div className="text-center">
          <p className="font-display text-3xl font-bold text-stone-100">
            {character.current_hp}<span className="text-base font-normal text-stone-400"> / {character.max_hp}</span>
          </p>
          {character.temp_hp > 0 && <p className="mt-1 text-sm text-emerald-300">Временные: {character.temp_hp}</p>}
          <p className="mt-1 text-xs text-stone-500">Кость хитов: {character.hit_dice || '—'}</p>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          <button type="button" className="sheet-btn" onClick={() => onDelta(-10)}>-10</button>
          <button type="button" className="sheet-btn" onClick={() => onDelta(-1)}>-1</button>
          <button type="button" className="sheet-btn" onClick={() => onDelta(1)}>+1</button>
          <button type="button" className="sheet-btn" onClick={() => onDelta(10)}>+10</button>
        </div>
        <div className="mt-3 flex gap-2">
          <Input type="number" placeholder="Дельта" value={delta} onChange={(e) => setDelta(e.target.value)} />
          <button type="button" className="sheet-btn sheet-btn_primary" onClick={apply}>Применить</button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-stone-700/70 pt-4">
          <button type="button" className="sheet-btn" onClick={() => onRest('short')}>Короткий отдых</button>
          <button type="button" className="sheet-btn" onClick={() => onRest('long')}>Длинный отдых</button>
        </div>
    </Modal>
  )
}

function ConditionsModal({ character, onClose, onChanged, onError }) {
  const [condition, setCondition] = useState('')
  const [exhaustion, setExhaustion] = useState('')
  const [source, setSource] = useState('')
  const conditions = character.conditions ?? []

  const add = async () => {
    if (!condition) return
    try {
      await api.characters.conditions.add(character.id, {
        condition,
        exhaustion_level: exhaustion ? Number(exhaustion) : null,
        source: source || undefined,
      })
      setExhaustion('')
      setSource('')
      await onChanged()
    } catch (e) {
      onError(e)
    }
  }

  const remove = async (cond) => {
    try {
      await api.characters.conditions.remove(character.id, cond)
      await onChanged()
    } catch (e) {
      onError(e)
    }
  }

  return (
    <Modal title="Состояния" onClose={onClose} size="md">
        {conditions.length === 0 ? (
          <EmptyState text="Нет активных состояний" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {conditions.map((c) => (
              <span key={c.condition} className="sheet-chip sheet-chip_on">
                <span className="sheet-chip__dot" />
                {conditionLabels[c.condition] ?? label(c.condition)}
                {c.exhaustion_level != null && <span className="text-stone-400">Ур. {c.exhaustion_level}</span>}
                {c.source && <span className="text-stone-400">{c.source}</span>}
                <button type="button" className="ml-0.5 text-stone-400 hover:text-red-300" onClick={() => remove(c.condition)} title="Снять состояние">×</button>
              </span>
            ))}
          </div>
        )}
        <div className="mt-5 grid gap-3 border-t border-stone-700/70 pt-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Состояние">
              <Select value={condition} onChange={(e) => setCondition(e.target.value)}>
                <option value="">Выберите...</option>
                {CONDITIONS.map((c) => <option key={c} value={c}>{conditionLabels[c] ?? label(c)}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Уровень истощения">
            <Input type="number" min="1" max="6" value={exhaustion} onChange={(e) => setExhaustion(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button onClick={add} className="w-full">Добавить</Button>
          </div>
          <Field label="Источник">
            <Input value={source} onChange={(e) => setSource(e.target.value)} />
          </Field>
        </div>
    </Modal>
  )
}
