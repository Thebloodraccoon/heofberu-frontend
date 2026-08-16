import { useState } from 'react'
import { charactersApi as api } from '@/features/characters/api.js'
import { Button, EmptyState, Field, Input, Select } from '@/components/ui'

export default function EquipmentPanel({ character, lookups, editing, onChanged, onError }) {
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
