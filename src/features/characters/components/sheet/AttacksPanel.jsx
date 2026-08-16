import { useState } from 'react'
import { charactersApi as api } from '@/features/characters/api.js'
import { label } from '@/lib/i18n/index.js'
import { STATS } from '@/lib/utils/ability.js'
import { Button, EmptyState, Field, Input, Select } from '@/components/ui'
import { RollButton, TextBlock } from '@/components/sheet/primitives.jsx'
import { ATTACK_TYPES, DAMAGE_TYPES, DICE_TYPES, num } from './constants.js'

export default function AttacksPanel({ character, editing, rollsOn, attackBonus, onRoll, onSaveTraits, onChanged, onError }) {
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
