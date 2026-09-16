import { useState } from 'react'
import { Button, ErrorBox, Modal } from '@/components/ui'
import { AddButton } from './effectTypeEditors.jsx'
import { TrashIcon } from './editorShared.jsx'
import ItemPickerModal from './ItemPickerModal.jsx'

// Модалка для правки всего списка обязательного снаряжения разом — выдаётся
// игроку целиком, без выбора, поэтому (в отличие от групп выбора) это один
// список, а не набор отдельно редактируемых карточек.
export default function ItemsGrantModal({ title = 'Обязательное снаряжение', value = [], onSave, onClose }) {
  const [rows, setRows] = useState(() =>
    (value ?? []).map((it) => ({ item_id: it.item_id, quantity: it.quantity ?? 1, name: it.item?.name })),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const usedIds = new Set(rows.map((r) => r.item_id))
  const add = (item) => setRows((r) => [...r, { item_id: item.id, quantity: 1, name: item.name }])
  const setQuantity = (i, v) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, quantity: Math.max(1, Number(v) || 1) } : row)))
  const remove = (i) => setRows((r) => r.filter((_, j) => j !== i))

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(rows.map(({ item_id, quantity }) => ({ item_id, quantity })))
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  return (
    <Modal
      title={title}
      subtitle="Выдаётся игроку целиком, без выбора"
      onClose={onClose}
      size="lg"
      scroll
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <ErrorBox error={error} onRetry={() => {}} />}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-stone-300">Список снаряжения</span>
          <AddButton onClick={() => setPickerOpen(true)} title="+ Добавить предмет" />
        </div>
        <div className="space-y-2">
          {rows.length === 0 && <p className="text-sm text-stone-500">Снаряжения нет</p>}
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-stone-700/60 bg-stone-900/60 p-2">
              <span className="min-w-0 flex-1 truncate text-sm text-stone-200">
                {row.name ?? `предмет #${row.item_id}`}
              </span>
              <input
                type="number"
                min={1}
                value={row.quantity}
                onChange={(e) => setQuantity(i, e.target.value)}
                title="Количество"
                className="h-[40px] w-24 rounded border border-stone-700 bg-stone-800/70 px-1 text-center text-sm text-stone-100 outline-none focus:border-ember"
              />
              <span className="text-xs text-stone-400">шт.</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded border border-red-800 text-red-300 transition hover:bg-red-950/50"
                title="Удалить"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      </div>

      {pickerOpen && (
        <ItemPickerModal excludeIds={usedIds} onPick={add} onClose={() => setPickerOpen(false)} />
      )}
    </Modal>
  )
}
