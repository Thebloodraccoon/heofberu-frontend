import { useState } from 'react'
import { charactersApi } from '@/features/characters/api.js'
import { useCharacterItems, useCharacterSpells } from '@/features/characters/queries.js'
import { diceTypeLabels, label } from '@/lib/i18n/index.js'
import { STATS } from '@/lib/utils/ability.js'
import { Button, Field, Input, Modal, Select } from '@/components/ui'
import { ATTACK_TYPES, DAMAGE_TYPES, DICE_TYPES, num } from './constants.js'

const SOURCES = [
  { value: 'manual', label: 'Вручную' },
  { value: 'weapon', label: 'Оружие из инвентаря' },
  { value: 'spell', label: 'Заклинание' },
]

const EMPTY = {
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
}

const damageText = (count, dice, dmgType) =>
  count && dice
    ? `${count}${diceTypeLabels[dice] ?? dice}${dmgType ? ` ${label(dmgType).toLowerCase()}` : ''}`
    : null

function ItemAttackOption({ ci, onPick }) {
  const item = ci.item || {}
  if (item.item_type !== 'WEAPON') return null
  const dmg = damageText(item.damage_dice_count, item.damage_dice_type, item.damage_type)
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(ci, item)}
        className="flex w-full items-center gap-2 rounded border border-stone-800 bg-stone-900/40 px-3 py-2 text-left transition hover:border-ember/60 hover:bg-stone-900"
      >
        <span className="min-w-0 flex-1 truncate text-sm text-stone-100">{item.name || `Предмет #${ci.item_id}`}</span>
        {dmg && <span className="shrink-0 text-xs text-stone-400">{dmg}</span>}
        {ci.is_equipped && (
          <span className="sheet-chip sheet-chip_on !py-0.5 text-[11px]"><span className="sheet-chip__dot" />Экип.</span>
        )}
      </button>
    </li>
  )
}

function SpellAttackOption({ cs, onPick }) {
  const sp = cs.spell || {}
  const dmg = damageText(sp.damage_dice_count, sp.damage_dice_type, sp.damage_type)
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(sp)}
        className="flex w-full items-center gap-2 rounded border border-stone-800 bg-stone-900/40 px-3 py-2 text-left transition hover:border-ember/60 hover:bg-stone-900"
      >
        <span className="min-w-0 flex-1 truncate text-sm text-stone-100">{sp.name || `Заклинание #${cs.spell_id}`}</span>
        <span className="shrink-0 text-xs text-stone-400">
          {[dmg, sp.level ? label(sp.level) : ''].filter(Boolean).join(' · ') || label(sp.school)}
        </span>
      </button>
    </li>
  )
}

/**
 * Create/edit attack modal — same field set as the GM constructor.
 * Pass ``attack`` to edit an existing row, omit it to create a new one.
 * Fields can be prefilled from an inventory weapon or a known spell.
 */
export default function AttackModal({ characterId, attack = null, onClose, onSaved, onError }) {
  const editing = !!attack
  const [form, setForm] = useState(
    editing
      ? {
          ...EMPTY,
          ...attack,
          is_proficient: Boolean(attack.is_proficient),
        }
      : EMPTY,
  )
  const [saving, setSaving] = useState(false)
  const [source, setSource] = useState('manual')
  const { data: items = [] } = useCharacterItems(characterId)
  const { data: spells = [] } = useCharacterSpells(characterId)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const applyPick = (fields) => {
    setForm((f) => ({ ...f, ...fields }))
    setSource('manual')
  }

  const applyWeapon = (ci, item) => {
    const properties = (item.weapon_properties ?? '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    applyPick({
      name: item.name || `Оружие #${ci.item_id}`,
      attack_type: 'MELEE_ATTACK',
      damage_dice_count: num(item.damage_dice_count),
      damage_dice_type: item.damage_dice_type || null,
      damage_type: item.damage_type || null,
      notes: properties.length ? `Свойства: ${properties.map((p) => label(p)).join(', ')}` : '',
    })
  }

  const applySpell = (sp) => {
    const range = sp.range_type
      ? `${label(sp.range_type)}${sp.range_value != null && sp.range_value !== '' ? ` ${sp.range_value}` : ''}`
      : ''
    applyPick({
      name: sp.name || 'Заклинание',
      attack_type: sp.attack_type || 'RANGED_ATTACK',
      damage_dice_count: num(sp.damage_dice_count),
      damage_dice_type: sp.damage_dice_type || null,
      damage_type: sp.damage_type || null,
      range,
      notes: `Заклинание · ${[label(sp.school), sp.level ? label(sp.level) : ''].filter(Boolean).join(' · ')}`,
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name?.trim()) return
    setSaving(true)
    const body = {
      name: form.name.trim(),
      attack_type: form.attack_type,
      ability: form.ability,
      is_proficient: form.is_proficient === true || form.is_proficient === 'true',
      bonus_attack: num(form.bonus_attack) ?? 0,
      bonus_damage: num(form.bonus_damage) ?? 0,
      damage_dice_count: num(form.damage_dice_count),
      damage_dice_type: form.damage_dice_type || null,
      damage_type: form.damage_type || null,
      range: form.range || '',
      notes: form.notes || '',
    }
    try {
      if (editing) await charactersApi.attacks.update(characterId, attack.id, body)
      else await charactersApi.attacks.add(characterId, body)
      onSaved()
      onClose()
    } catch (err) {
      onError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={editing ? 'Изменить атаку' : 'Новая атака'} onClose={onClose} size="lg">
      <p className="-mt-1 mb-3 text-xs text-stone-500">
        Заполните поля вручную или подставьте данные из оружия в инвентаре либо из заклинания.
      </p>

      <div className="mb-4">
        <p className="text-label mb-1.5">Заполнить из</p>
        <div className="flex flex-wrap gap-1.5">
          {SOURCES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSource(opt.value)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                source === opt.value
                  ? 'bg-ember text-white'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {source === 'weapon' && (
          <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded border border-stone-700/60 bg-stone-900/50 p-2">
            {(items ?? []).length === 0 ? (
              <li className="px-1 py-1 text-xs text-stone-500">Инвентарь пуст</li>
            ) : (
              items.map((ci) => <ItemAttackOption key={ci.id} ci={ci} onPick={applyWeapon} />)
            )}
          </ul>
        )}
        {source === 'spell' && (
          <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded border border-stone-700/60 bg-stone-900/50 p-2">
            {(spells ?? []).length === 0 ? (
              <li className="px-1 py-1 text-xs text-stone-500">Заклинаний пока нет</li>
            ) : (
              spells.map((cs) => <SpellAttackOption key={cs.spell_id} cs={cs} onPick={applySpell} />)
            )}
          </ul>
        )}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <p className="col-span-full mt-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Основное
          </p>
          <Field label="Название *">
            <Input required value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Тип">
            <Select value={form.attack_type} onChange={set('attack_type')}>
              {ATTACK_TYPES.map((t) => (
                <option key={t} value={t}>{label(t)}</option>
              ))}
            </Select>
          </Field>
          <Field label="Характеристика">
            <Select value={form.ability} onChange={set('ability')}>
              {STATS.map((s) => (
                <option key={s.code} value={s.code}>{s.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Владение">
            <Select value={String(form.is_proficient)} onChange={set('is_proficient')}>
              <option value="true">Да</option>
              <option value="false">Нет</option>
            </Select>
          </Field>
          <Field label="Бонус атаки">
            <Input type="number" value={form.bonus_attack} onChange={set('bonus_attack')} />
          </Field>
          <Field label="Дистанция">
            <Input value={form.range} onChange={set('range')} />
          </Field>

          <p className="col-span-full mt-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Урон
          </p>
          <Field label="Кол-во костей">
            <Input type="number" min="0" value={form.damage_dice_count} onChange={set('damage_dice_count')} />
          </Field>
          <Field label="Кость">
            <Select value={form.damage_dice_type} onChange={set('damage_dice_type')}>
              {DICE_TYPES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          </Field>
          <Field label="Тип урона">
            <Select value={form.damage_type} onChange={set('damage_type')}>
              {DAMAGE_TYPES.map((d) => (
                <option key={d} value={d}>{label(d)}</option>
              ))}
            </Select>
          </Field>
          <Field label="Бонус урона">
            <Input type="number" value={form.bonus_damage} onChange={set('bonus_damage')} />
          </Field>
          <Field label="Заметки" className="sm:col-span-2">
            <Input value={form.notes} onChange={set('notes')} />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 pt-3">
          <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
          <Button type="submit" disabled={saving}>
            {editing ? 'Сохранить' : 'Добавить атаку'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}