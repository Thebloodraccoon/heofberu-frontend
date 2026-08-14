import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/endpoints.js'
import { label } from '../labels.js'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBox,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
} from '../components/ui.jsx'

const STATS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
const STAT_LABELS = {
  strength: 'СИЛ',
  dexterity: 'ЛОВ',
  constitution: 'ТЕЛ',
  intelligence: 'ИНТ',
  wisdom: 'МДР',
  charisma: 'ХАР',
}
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

const mod = (score) => Math.floor((score - 10) / 2)
const num = (v) => (v === '' || v === undefined || v === null ? null : Number(v))

export default function CharacterDetailPage() {
  const { id } = useParams()
  const [character, setCharacter] = useState(null)
  const [error, setError] = useState(null)
  const [lookups, setLookups] = useState({ races: [], classes: [], backgrounds: [], skills: [], spells: [], items: [], feats: [], features: [], subraces: [] })
  const [tab, setTab] = useState('overview')

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

  const load = useCallback(async () => {
    try {
      setCharacter(await api.characters.get(id))
    } catch (e) {
      setError(e)
    }
  }, [id])

  const tabs = [
    ['overview', 'Обзор'],
    ['spells', 'Заклинания'],
    ['attacks', 'Атаки'],
    ['items', 'Предметы'],
    ['feats', 'Черты и свойства'],
    ['conditions', 'Условия'],
  ]

  if (error) return <ErrorBox error={error} onRetry={load} />
  if (!character) return <Spinner />

  const cls = lookups.classes.find((x) => x.id === character.class_id)
  const race = lookups.races.find((x) => x.id === character.race_id)
  const bg = lookups.backgrounds.find((x) => x.id === character.background_id)
  const subcls = cls?.subclasses?.find((x) => String(x.id) === String(character.subclass_id))
  const subrace = lookups.subraces.find((x) => x.id === character.subrace_id)

  return (
    <div>
      <div className="mb-4">
        <Link to="/characters" className="text-sm text-ember hover:underline">
          ← Назад к персонажам
        </Link>
      </div>

      <PageHeader
        title={character.name}
        subtitle={
          [
            cls?.name && `Класс ${cls.name}`,
            subcls?.name,
            race?.name,
            subrace?.name,
            bg?.name,
            character.level && `Уровень ${character.level}`,
          ]
            .filter(Boolean)
            .join(' · ')
        }
        actions={<Badge tone="accent">HP {character.current_hp}/{character.max_hp}</Badge>}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              tab === key
                ? 'bg-ember text-white'
                : 'border border-stone-700 text-stone-300 hover:bg-stone-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab character={character} lookups={lookups} onChanged={load} />}
      {tab === 'spells' && <SpellsTab character={character} lookups={lookups} onChanged={load} />}
      {tab === 'attacks' && <AttacksTab character={character} lookups={lookups} onChanged={load} />}
      {tab === 'items' && <ItemsTab character={character} lookups={lookups} onChanged={load} />}
      {tab === 'feats' && <FeatsTab character={character} lookups={lookups} onChanged={load} />}
      {tab === 'conditions' && <ConditionsTab character={character} onChanged={load} />}
    </div>
  )
}

function OverviewTab({ character, lookups, onChanged }) {
  const [delta, setDelta] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const find = (kind, idv) => lookups[kind].find((x) => x.id === idv)?.name

  const hpDelta = async (value) => {
    setBusy(true)
    setError(null)
    try {
      await api.characters.hp(character.id, { delta: value })
      onChanged()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const doRest = async (type) => {
    setBusy(true)
    setError(null)
    try {
      await api.characters.rest(character.id, { type })
      onChanged()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const applyDelta = async () => {
    if (!delta) return
    setBusy(true)
    setError(null)
    try {
      await api.characters.hp(character.id, { delta: num(delta) })
      setDelta('')
      onChanged()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const spellSlots = character.spell_slots ?? []
  const saves = character.saving_throw_proficiencies ?? []
  const skills = character.skill_proficiencies ?? []
  const abilityTotals = character.ability_scores || {}

  const changeSlot = async (level, used) => {
    setBusy(true)
    setError(null)
    try {
      await api.characters.spellSlots.update(character.id, { level, used })
      onChanged()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {error && <ErrorBox error={error} />}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="mb-3 text-base font-semibold text-stone-100">Хиты</h2>
          <div className="text-center">
            <p className="text-4xl font-bold text-stone-100">
              {character.current_hp}
              <span className="text-lg font-normal text-stone-400"> / {character.max_hp}</span>
            </p>
            {character.temp_hp > 0 && (
              <p className="mt-1 text-sm text-emerald-300">Временные: {character.temp_hp}</p>
            )}
            <p className="mt-2 text-xs text-stone-500">Кость хитов: {character.hit_dice || '—'}</p>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            <Button variant="ghost" disabled={busy} onClick={() => hpDelta(-10)}>-10</Button>
            <Button variant="ghost" disabled={busy} onClick={() => hpDelta(-1)}>-1</Button>
            <Button variant="ghost" disabled={busy} onClick={() => hpDelta(1)}>+1</Button>
            <Button variant="ghost" disabled={busy} onClick={() => hpDelta(10)}>+10</Button>
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              type="number"
              placeholder="Дельта"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
            />
            <Button variant="ghost" disabled={busy} onClick={applyDelta}>Применить</Button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-stone-700/70 pt-4">
            <Button variant="ghost" disabled={busy} onClick={() => doRest('short')}>
              Короткий отдых
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => doRest('long')}>
              Длинный отдых
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-base font-semibold text-stone-100">Характеристики</h2>
          <div className="grid grid-cols-3 gap-2">
            {STATS.map((s) => {
              const total = abilityTotals[`${s}_total`] ?? character[s]
              return (
                <div key={s} className="rounded border border-stone-700/70 bg-stone-800/50 p-2 text-center">
                  <p className="text-xs font-medium uppercase text-stone-400">{STAT_LABELS[s]}</p>
                  <p className="text-xl font-bold text-stone-100">{total ?? '—'}</p>
                  <p className="text-xs text-stone-500">{total != null ? (mod(total) >= 0 ? '+' : '') + mod(total) : ''}</p>
                </div>
              )
            })}
          </div>
          <dl className="mt-4 space-y-1.5 text-sm">
            <InfoRow label="КД" value={character.armor_class} />
            <InfoRow label="Скорость" value={character.speed} />
            <InfoRow label="Инициатива" value={character.initiative_bonus} />
            <InfoRow label="Пассивное восприятие" value={character.passive_perception_bonus} />
            <InfoRow label="Щит" value={character.shield} />
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-base font-semibold text-stone-100">Спасброски</h2>
          {saves.length === 0 && <EmptyState text="Нет спасбросков" />}
          <div className="flex flex-wrap gap-1.5">
            {saves.map((s) => (
              <Badge key={s.ability} tone="accent">{label(s.ability)}</Badge>
            ))}
          </div>
          <h2 className="mb-3 mt-5 text-base font-semibold text-stone-100">Владение навыками</h2>
          {skills.length === 0 && <EmptyState text="Нет навыков" />}
          <ul className="space-y-1 text-sm text-stone-300">
            {skills.map((sk) => (
              <li key={sk.skill_id} className="flex items-center justify-between">
                <span>{find('skills', sk.skill_id) || `Навык #${sk.skill_id}`}</span>
                {sk.is_expertise && <Badge tone="good">Экспертиза</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-base font-semibold text-stone-100">Слоты заклинаний</h2>
        {spellSlots.length === 0 && <EmptyState text="Нет слотов заклинаний" />}
        <div className="flex flex-wrap gap-3">
          {spellSlots.map((slot) => (
            <div
              key={slot.spell_level}
              className="rounded border border-stone-700/70 bg-stone-800/50 px-4 py-2 text-center"
            >
              <p className="text-xs font-medium text-stone-400">{label(slot.spell_level)}</p>
              <p className="text-lg font-bold text-stone-100">
                {slot.used} / {slot.total}
              </p>
              <div className="mt-1 flex gap-1">
                <button
                  type="button"
                  disabled={busy || slot.used <= 0}
                  onClick={() => changeSlot(slot.spell_level, slot.used - 1)}
                  className="rounded bg-stone-700 px-2 py-0.5 text-xs hover:bg-stone-600 disabled:opacity-40"
                >
                  −
                </button>
                <button
                  type="button"
                  disabled={busy || slot.used >= slot.total}
                  onClick={() => changeSlot(slot.spell_level, slot.used + 1)}
                  className="rounded bg-stone-700 px-2 py-0.5 text-xs hover:bg-stone-600 disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-base font-semibold text-stone-100">Деньги</h2>
          <div className="flex gap-6 text-sm">
            <span><span className="text-yellow-300">⛁</span> {character.money_gold ?? 0} зм</span>
            <span><span className="text-stone-300">⛀</span> {character.money_silver ?? 0} см</span>
            <span><span className="text-amber-700">⛁</span> {character.money_copper ?? 0} мм</span>
          </div>
          <h2 className="mb-2 mt-5 text-base font-semibold text-stone-100">Личность</h2>
          <TextSection title="Черты характера" value={character.personality_traits} />
          <TextSection title="Идеалы" value={character.ideals} />
          <TextSection title="Привязанности" value={character.bonds} />
          <TextSection title="Слабости" value={character.flaws} />
          <TextSection title="Прочие владения" value={character.proficiencies} />
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-base font-semibold text-stone-100">История</h2>
          <TextSection title="Особенности" value={character.traits} />
          <TextSection title="Предыстория" value={character.backstory} />
          <TextSection title="Заметки" value={character.notes} />
        </Card>
      </div>
    </div>
  )
}

function TextSection({ title, value }) {
  if (!value) return null
  return (
    <div className="mb-3">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{title}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm text-stone-300">{value}</p>
    </div>
  )
}

function InfoRow({ label, value }) {
  if (value === null || value === undefined) return null
  return (
    <div className="flex justify-between">
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-medium text-stone-200">{value}</dd>
    </div>
  )
}

function SectionCard({ title, children, action }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-stone-100">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  )
}

function SpellsTab({ character, lookups, onChanged }) {
  const [spellId, setSpellId] = useState('')
  const [error, setError] = useState(null)
  const spells = character.spells ?? []

  const add = async () => {
    if (!spellId) return
    setError(null)
    try {
      await api.characters.spells.add(character.id, { spell_id: Number(spellId) })
      setSpellId('')
      onChanged()
    } catch (e) {
      setError(e)
    }
  }

  const remove = async (sid) => {
    setError(null)
    try {
      await api.characters.spells.remove(character.id, sid)
      onChanged()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <SectionCard
      title="Заклинания персонажа"
      action={
        <div className="flex gap-2">
          <Select value={spellId} onChange={(e) => setSpellId(e.target.value)} className="w-56">
            <option value="">Добавить заклинание...</option>
            {lookups.spells.map((sp) => (
              <option key={sp.id} value={sp.id}>{sp.name}</option>
            ))}
          </Select>
          <Button variant="ghost" onClick={add}>Добавить</Button>
        </div>
      }
    >
      {error && <div className="mb-3"><ErrorBox error={error} /></div>}
      {spells.length === 0 && <EmptyState text="Заклинаний пока нет" />}
      <div className="space-y-3">
        {spells.map((cs) => {
          const sp = cs.spell || {}
          return (
            <div key={cs.spell_id} className="rounded border border-stone-700/70 bg-stone-800/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-stone-100">{sp.name || `Заклинание #${cs.spell_id}`}</p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {[sp.school && label(sp.school), sp.level && label(sp.level), sp.cast_time && label(sp.cast_time)].filter(Boolean).join(' · ')}
                  </p>
                  {sp.range_type && (
                    <p className="mt-0.5 text-xs text-stone-400">
                      Дистанция: {label(sp.range_type)}{sp.range_value ? ` (${sp.range_value})` : ''}
                      {sp.duration ? ` · Длительность: ${label(sp.duration)}` : ''}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(cs.spell_id)}
                  className="rounded border border-red-800 px-2 py-1 text-xs text-red-300 hover:bg-red-950/50"
                >
                  Убрать
                </button>
              </div>
              {sp.description && <p className="mt-2 text-sm text-stone-400">{sp.description}</p>}
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

function AttacksTab({ character, onChanged }) {
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
  const [error, setError] = useState(null)
  const attacks = character.attacks ?? []

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const add = async (e) => {
    e.preventDefault()
    setError(null)
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
      onChanged()
    } catch (err) {
      setError(err)
    }
  }

  const remove = async (attackId) => {
    setError(null)
    try {
      await api.characters.attacks.remove(character.id, attackId)
      onChanged()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <SectionCard title="Атаки">
      {error && <div className="mb-3"><ErrorBox error={error} /></div>}
      {attacks.length === 0 && <EmptyState text="Атак пока нет" />}
      <div className="space-y-3">
        {attacks.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 rounded border border-stone-700/70 bg-stone-800/40 p-3">
            <div>
              <p className="font-medium text-stone-100">{a.name}</p>
              <p className="mt-0.5 text-sm text-stone-400">
                {label(a.attack_type)} · {a.ability}
                {a.damage_dice_count && a.damage_dice_type
                  ? ` · ${a.damage_dice_count}${a.damage_dice_type} ${a.damage_type ? label(a.damage_type).toLowerCase() : ''}`
                  : ''}
                {a.bonus_attack ? ` · бонус атаки ${a.bonus_attack}` : ''}
              </p>
              {a.range && <p className="text-xs text-stone-500">Дистанция: {a.range}</p>}
            </div>
            <button
              type="button"
              onClick={() => remove(a.id)}
              className="rounded border border-red-800 px-2 py-1 text-xs text-red-300 hover:bg-red-950/50"
            >
              Удалить
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="mt-5 grid gap-3 border-t border-stone-700/70 pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Название *"><Input required value={form.name} onChange={set('name')} /></Field>
        <Field label="Тип">
          <Select value={form.attack_type} onChange={set('attack_type')}>
            {ATTACK_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
          </Select>
        </Field>
        <Field label="Характеристика">
          <Select value={form.ability} onChange={set('ability')}>
            {STATS.map((s) => <option key={s} value={s.toUpperCase()}>{s}</option>)}
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
        <div className="flex items-end">
          <Button type="submit" className="w-full">Добавить атаку</Button>
        </div>
      </form>
    </SectionCard>
  )
}

function ItemsTab({ character, lookups, onChanged }) {
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [isEquipped, setIsEquipped] = useState(false)
  const [isAttuned, setIsAttuned] = useState(false)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState(null)
  const items = character.items ?? []
  const findItem = (itemIdV) => lookups.items.find((x) => x.id === itemIdV)?.name

  const add = async () => {
    if (!itemId) return
    setError(null)
    try {
      await api.characters.items.add(character.id, {
        item_id: Number(itemId),
        quantity: Number(quantity) || 1,
        is_equipped: isEquipped,
        is_attuned: isAttuned,
        notes: notes || undefined,
      })
      setItemId('')
      setNotes('')
      onChanged()
    } catch (e) {
      setError(e)
    }
  }

  const update = async (charItemId, patch) => {
    setError(null)
    try {
      await api.characters.items.update(character.id, charItemId, patch)
      onChanged()
    } catch (e) {
      setError(e)
    }
  }

  const remove = async (charItemId) => {
    setError(null)
    try {
      await api.characters.items.remove(character.id, charItemId)
      onChanged()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <SectionCard title="Инвентарь">
      {error && <div className="mb-3"><ErrorBox error={error} /></div>}
      {items.length === 0 && <EmptyState text="Инвентарь пуст" />}
      <div className="space-y-3">
        {items.map((ci) => (
          <div key={ci.id} className="flex items-center justify-between gap-3 rounded border border-stone-700/70 bg-stone-800/40 p-3">
            <div className="min-w-0">
              <p className="font-medium text-stone-100">
                {findItem(ci.item_id) || `Предмет #${ci.item_id}`}
                <span className="ml-2 text-sm font-normal text-stone-400">×{ci.quantity}</span>
              </p>
              <div className="mt-1.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => update(ci.id, { is_equipped: !ci.is_equipped })}
                  className={`rounded px-2 py-0.5 text-xs ${ci.is_equipped ? 'bg-ember text-white' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'}`}
                >
                  Экипировано
                </button>
                <button
                  type="button"
                  onClick={() => update(ci.id, { is_attuned: !ci.is_attuned })}
                  className={`rounded px-2 py-0.5 text-xs ${ci.is_attuned ? 'bg-emerald-800 text-emerald-200' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'}`}
                >
                  Настроено
                </button>
              </div>
              {ci.notes && <p className="mt-1 text-xs text-stone-500">{ci.notes}</p>}
            </div>
            <button
              type="button"
              onClick={() => remove(ci.id)}
              className="rounded border border-red-800 px-2 py-1 text-xs text-red-300 hover:bg-red-950/50"
            >
              Удалить
            </button>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-3 border-t border-stone-700/70 pt-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
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
        <Field label="Экипировано">
          <Select value={String(isEquipped)} onChange={(e) => setIsEquipped(e.target.value === 'true')}>
            <option value="false">Нет</option>
            <option value="true">Да</option>
          </Select>
        </Field>
        <Field label="Настроено">
          <Select value={String(isAttuned)} onChange={(e) => setIsAttuned(e.target.value === 'true')}>
            <option value="false">Нет</option>
            <option value="true">Да</option>
          </Select>
        </Field>
        <div className="flex items-end">
          <Button onClick={add} className="w-full">Добавить</Button>
        </div>
      </div>
    </SectionCard>
  )
}

function FeatsTab({ character, lookups, onChanged }) {
  const [featId, setFeatId] = useState('')
  const [featureId, setFeatureId] = useState('')
  const [error, setError] = useState(null)
  const feats = character.feats ?? []
  const features = character.features ?? []
  const findFeat = (idv) => lookups.feats.find((x) => x.id === idv)?.name
  const findFeature = (idv) => lookups.features.find((x) => x.id === idv)?.name

  const addFeat = async () => {
    if (!featId) return
    setError(null)
    try {
      await api.characters.feats.add(character.id, { feat_id: Number(featId) })
      setFeatId('')
      onChanged()
    } catch (e) {
      setError(e)
    }
  }

  const addFeature = async () => {
    if (!featureId) return
    setError(null)
    try {
      await api.characters.features.add(character.id, { feature_id: Number(featureId) })
      setFeatureId('')
      onChanged()
    } catch (e) {
      setError(e)
    }
  }

  const removeFeat = async (cfId) => {
    setError(null)
    try {
      await api.characters.feats.remove(character.id, cfId)
      onChanged()
    } catch (e) {
      setError(e)
    }
  }

  const removeFeature = async (cfId) => {
    setError(null)
    try {
      await api.characters.features.remove(character.id, cfId)
      onChanged()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SectionCard
        title="Черты"
        action={
          <div className="flex gap-2">
            <Select value={featId} onChange={(e) => setFeatId(e.target.value)} className="w-52">
              <option value="">Добавить...</option>
              {lookups.feats.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
            <Button variant="ghost" onClick={addFeat}>+</Button>
          </div>
        }
      >
        {error && <div className="mb-3"><ErrorBox error={error} /></div>}
        {feats.length === 0 && <EmptyState text="Черты не выбраны" />}
        <ul className="space-y-2">
          {feats.map((cf) => (
            <li key={cf.id} className="flex items-center justify-between gap-2 rounded border border-stone-700/70 bg-stone-800/40 px-3 py-2">
              <span className="text-sm text-stone-200">{findFeat(cf.feat_id) || `Черта #${cf.feat_id}`}</span>
              <button
                type="button"
                onClick={() => removeFeat(cf.id)}
                className="rounded border border-red-800 px-2 py-0.5 text-xs text-red-300 hover:bg-red-950/50"
              >
                Убрать
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Свойства"
        action={
          <div className="flex gap-2">
            <Select value={featureId} onChange={(e) => setFeatureId(e.target.value)} className="w-52">
              <option value="">Добавить...</option>
              {lookups.features.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
            <Button variant="ghost" onClick={addFeature}>+</Button>
          </div>
        }
      >
        {features.length === 0 && <EmptyState text="Свойства не добавлены" />}
        <ul className="space-y-2">
          {features.map((cf) => (
            <li key={cf.id} className="flex items-center justify-between gap-2 rounded border border-stone-700/70 bg-stone-800/40 px-3 py-2">
              <span className="text-sm text-stone-200">{findFeature(cf.feature_id) || `Свойство #${cf.feature_id}`}</span>
              <button
                type="button"
                onClick={() => removeFeature(cf.id)}
                className="rounded border border-red-800 px-2 py-0.5 text-xs text-red-300 hover:bg-red-950/50"
              >
                Убрать
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  )
}

function ConditionsTab({ character, onChanged }) {
  const [condition, setCondition] = useState('')
  const [exhaustion, setExhaustion] = useState('')
  const [source, setSource] = useState('')
  const [error, setError] = useState(null)
  const conditions = character.conditions ?? []

  const add = async () => {
    if (!condition) return
    setError(null)
    try {
      await api.characters.conditions.add(character.id, {
        condition,
        exhaustion_level: exhaustion ? Number(exhaustion) : null,
        source: source || undefined,
      })
      setExhaustion('')
      setSource('')
      onChanged()
    } catch (e) {
      setError(e)
    }
  }

  const remove = async (cond) => {
    setError(null)
    try {
      await api.characters.conditions.remove(character.id, cond)
      onChanged()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <SectionCard title="Состояния">
      {error && <div className="mb-3"><ErrorBox error={error} /></div>}
      {conditions.length === 0 && <EmptyState text="Нет активных состояний" />}
      <div className="flex flex-wrap gap-2">
        {conditions.map((c) => (
          <div key={c.condition} className="flex items-center gap-2 rounded bg-stone-800/60 px-3 py-1.5 text-sm">
            <span className="font-medium text-stone-200">{label(c.condition)}</span>
            {c.exhaustion_level != null && <Badge tone="bad">Ур. {c.exhaustion_level}</Badge>}
            {c.source && <span className="text-xs text-stone-500">{c.source}</span>}
            <button
              type="button"
              onClick={() => remove(c.condition)}
              className="ml-1 text-stone-500 hover:text-red-300"
              title="Снять состояние"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-3 border-t border-stone-700/70 pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Состояние">
          <Select value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="">Выберите...</option>
            {CONDITIONS.map((c) => <option key={c} value={c}>{label(c)}</option>)}
          </Select>
        </Field>
        <Field label="Уровень истощения">
          <Input type="number" min="1" max="6" value={exhaustion} onChange={(e) => setExhaustion(e.target.value)} />
        </Field>
        <Field label="Источник">
          <Input value={source} onChange={(e) => setSource(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <Button onClick={add} className="w-full">Добавить</Button>
        </div>
      </div>
    </SectionCard>
  )
}
