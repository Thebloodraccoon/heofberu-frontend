import { useState } from 'react'
import { Button, ErrorBox, Input, Modal } from '@/components/ui'
import { AddButton } from './effectTypeEditors.jsx'
import { TrashIcon } from './editorShared.jsx'
import ItemPickerModal from './ItemPickerModal.jsx'

// Модалка для одной группы «снаряжение на выбор» — по аналогии с
// EffectGroupModal у эффектов особенности: список групп живёт в родителе,
// правка конкретной группы (или создание новой) — здесь.
export default function ItemChoiceGroupModal({ initialGroup = null, onSave, onClose }) {
  const [group, setGroup] = useState(() => ({
    pick_count: initialGroup?.pick_count ?? 1,
    options: (initialGroup?.options ?? []).map((o) => ({
      item_id: o.item_id,
      quantity: o.quantity ?? 1,
      name: o.item?.name,
    })),
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const usedIds = new Set(group.options.map((o) => o.item_id))
  const addOption = (item) =>
    setGroup((g) => ({ ...g, options: [...g.options, { item_id: item.id, quantity: 1, name: item.name }] }))
  const setOptionQuantity = (oi, v) =>
    setGroup((g) => ({
      ...g,
      options: g.options.map((o, j) => (j === oi ? { ...o, quantity: Math.max(1, Number(v) || 1) } : o)),
    }))
  const removeOption = (oi) => setGroup((g) => ({ ...g, options: g.options.filter((_, j) => j !== oi) }))

  const canSave = group.options.length > 0

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(group)
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  return (
    <Modal
      title={initialGroup ? 'Изменить группу выбора' : 'Новая группа выбора'}
      subtitle="Игрок выбирает N предметов из перечисленных вариантов"
      onClose={onClose}
      size="lg"
      scroll
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button type="button" onClick={save} disabled={saving || !canSave}>
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <ErrorBox error={error} onRetry={() => {}} />}
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm text-stone-300">
            Выбрать
            <Input
              type="number"
              min={1}
              max={10}
              value={group.pick_count}
              onChange={(e) => setGroup((g) => ({ ...g, pick_count: Math.max(1, Number(e.target.value) || 1) }))}
              className="input-narrow w-16"
            />
          </label>
          <AddButton onClick={() => setPickerOpen(true)} title="+ Добавить вариант" />
        </div>

        <div className="space-y-2">
          {group.options.map((o, oi) => (
            <div key={oi} className="flex items-center gap-2 rounded-lg border border-stone-700/60 bg-stone-900/60 p-2">
              <span className="min-w-0 flex-1 truncate text-sm text-stone-200">
                {o.name ?? `предмет #${o.item_id}`}
              </span>
              <input
                type="number"
                min={1}
                value={o.quantity}
                onChange={(e) => setOptionQuantity(oi, e.target.value)}
                className="w-16 rounded border border-stone-700 bg-stone-800/70 px-1 py-0.5 text-center text-sm text-stone-100 outline-none focus:border-ember"
              />
              <span className="text-xs text-stone-400">шт.</span>
              <button
                type="button"
                onClick={() => removeOption(oi)}
                className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded border border-red-800 text-red-300 transition hover:bg-red-950/50"
                title="Убрать"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
        {group.options.length === 0 && (
          <p className="text-xs text-stone-500">Добавьте хотя бы один вариант выбора.</p>
        )}
      </div>

      {pickerOpen && (
        <ItemPickerModal excludeIds={usedIds} onPick={addOption} onClose={() => setPickerOpen(false)} />
      )}
    </Modal>
  )
}
