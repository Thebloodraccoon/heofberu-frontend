import Drawer from '@/components/ui/Drawer.jsx'
import { useState } from 'react'
import { Button, ErrorBox } from '@/components/ui'
import { TrashIcon } from './editorShared.jsx'
import ItemPickerModal, { ItemKindAddControl } from './ItemPickerModal.jsx'
import { NumberStepper } from './LevelField.jsx'

// Модалка для правки всего списка обязательного снаряжения разом — выдаётся
// игроку целиком, без выбора, поэтому (в отличие от групп выбора) это один
// список, а не набор отдельно редактируемых карточек.
export default function ItemsGrantModal({ title = 'Обязательное снаряжение', value = [], onSave, onClose }) {
  const [rows, setRows] = useState(() =>
    (value ?? []).map((it) => ({ item_id: it.item_id, quantity: it.quantity ?? 1, name: it.item?.name })),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  // Вид предмета, выбор которого открыт (null — список снаряжения).
  const [pickerKind, setPickerKind] = useState(null)
  const pickerOpen = pickerKind != null
  const closePicker = () => setPickerKind(null)

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
    <Drawer
      className="catalog-editor-drawer"
      bodyClassName={pickerOpen ? 'equipment-picker-body' : ''}
      closeLabel="Закрыть редактор снаряжения"
      title={title}
      subtitle="Выдаётся игроку целиком, без выбора"
      onClose={onClose}
      size="lg"
      scroll
      footer={pickerOpen ? <Button type="button" variant="ghost" onClick={closePicker}>Закрыть</Button> :
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
      <div hidden={pickerOpen} className="space-y-3">
        {error && <ErrorBox error={error} onRetry={() => {}} />}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-stone-300">Список снаряжения</span>
          <ItemKindAddControl onPick={setPickerKind} />
        </div>
        <div className="space-y-2">
          {rows.length === 0 && <p className="text-sm text-stone-500">Снаряжения нет</p>}
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-stone-700/60 bg-stone-900/60 p-2">
              <span className="min-w-0 flex-1 truncate text-sm text-stone-200">
                {row.name ?? `предмет #${row.item_id}`}
              </span>
              <NumberStepper hideLabel required label={`Количество: ${row.name ?? `предмет #${row.item_id}`}`} min={1} max={99} suffix="шт." value={Number(row.quantity) || 1} onChange={(n) => setQuantity(i, n)} />
              <button
                type="button"
                onClick={() => remove(i)}
                className="catalog-delete-button"
                title="Удалить"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      </div>

      {pickerOpen && (
        <ItemPickerModal inline kind={pickerKind} excludeIds={usedIds} onPick={add} onClose={closePicker} />
      )}
    </Drawer>
  )
}
