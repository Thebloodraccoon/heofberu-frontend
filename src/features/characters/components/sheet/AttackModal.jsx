import { useState } from 'react'
import { charactersApi } from '@/features/characters/api.js'
import { label } from '@/lib/i18n/index.js'
import { STATS } from '@/lib/utils/ability.js'
import { Button, Field, Input, Modal, Select } from '@/components/ui'
import { ATTACK_TYPES, DAMAGE_TYPES, DICE_TYPES, num } from './constants.js'

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

/**
 * Create/edit attack modal — same field set as the GM constructor.
 * Pass ``attack`` to edit an existing row, omit it to create a new one.
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
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

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
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          <Field label="Бонус атаки">
            <Input type="number" value={form.bonus_attack} onChange={set('bonus_attack')} />
          </Field>
          <Field label="Бонус урона">
            <Input type="number" value={form.bonus_damage} onChange={set('bonus_damage')} />
          </Field>
          <Field label="Дистанция">
            <Input value={form.range} onChange={set('range')} />
          </Field>
          <Field label="Заметки">
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
