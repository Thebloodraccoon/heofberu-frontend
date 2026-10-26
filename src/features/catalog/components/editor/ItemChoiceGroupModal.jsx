import Drawer from '@/components/ui/Drawer.jsx'
import { useState } from 'react'
import { Button, ErrorBox } from '@/components/ui'
import { armorCategoryLabels, itemKindLabels, toolCategoryLabels, weaponProficiencyLabels } from '@/lib/i18n/index.js'
import { describeItemFilter } from '@/lib/utils/effectBundle.js'
import { TrashIcon } from './editorShared.jsx'
import ItemPickerModal, { ItemKindAddControl } from './ItemPickerModal.jsx'
import { NumberStepper } from './LevelField.jsx'
import ChipGroup from '@/components/ui/ChipGroup.jsx'

// Вид предмета фильтра и поле его категории (у прочих предметов фильтра нет).
const FILTER_CATEGORY = {
  WEAPON: { key: 'weapon_category', labels: weaponProficiencyLabels },
  ARMOR: { key: 'armor_category', labels: armorCategoryLabels },
  TOOL: { key: 'tool_category', labels: toolCategoryLabels },
}

// Вариант-фильтр «любой предмет вида»: игрок назовёт конкретный предмет при
// создании персонажа (item_id: null + kind и необязательная категория).
function FilterOptionForm({ onAdd }) {
  const [kind, setKind] = useState('WEAPON')
  const [category, setCategory] = useState('')
  const cat = FILTER_CATEGORY[kind]
  const add = () =>
    onAdd({
      item_id: null,
      kind,
      weapon_category: null,
      armor_category: null,
      tool_category: null,
      ...(cat && category ? { [cat.key]: category } : {}),
      quantity: 1,
    })
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-stone-700 p-2">
      <span className="text-sm text-stone-400">Любой предмет:</span>
      <ChipGroup label="Вид предмета" options={Object.keys(FILTER_CATEGORY).map((value) => ({ value, label: itemKindLabels[value] }))} value={kind} onChange={(next) => { setKind(next); setCategory('') }} />
      {cat && (
        <ChipGroup label="Категория" emptyLabel="Любая" options={[{ value: '', label: 'Любая' }, ...Object.entries(cat.labels).map(([value, label]) => ({ value, label }))]} value={category} onChange={setCategory} />
      )}
      <Button type="button" size="xs" onClick={add}>Добавить</Button>
    </div>
  )
}

// Модалка для одной группы «снаряжение на выбор» — по аналогии с
// EffectGroupModal у эффектов особенности: список групп живёт в родителе,
// правка конкретной группы (или создание новой) — здесь.
export default function ItemChoiceGroupModal({ initialGroup = null, onSave, onClose }) {
  const [group, setGroup] = useState(() => ({
    pick_count: initialGroup?.pick_count ?? 1,
    options: (initialGroup?.options ?? []).map((o) => ({
      item_id: o.item_id,
      kind: o.kind ?? null,
      weapon_category: o.weapon_category ?? null,
      armor_category: o.armor_category ?? null,
      tool_category: o.tool_category ?? null,
      quantity: o.quantity ?? 1,
      name: o.item?.name,
    })),
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  // Вид предмета, выбор которого открыт (null — список вариантов).
  const [pickerKind, setPickerKind] = useState(null)
  const pickerOpen = pickerKind != null
  const closePicker = () => setPickerKind(null)
  const [filterOpen, setFilterOpen] = useState(false)

  const usedIds = new Set(group.options.filter((o) => o.item_id != null).map((o) => o.item_id))
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
    <Drawer
      className="catalog-editor-drawer"
      bodyClassName={pickerOpen ? 'equipment-picker-body' : ''}
      closeLabel="Закрыть редактор снаряжения"
      title={initialGroup ? 'Изменить группу выбора' : 'Новая группа выбора'}
      subtitle="Игрок выбирает N предметов из перечисленных вариантов"
      onClose={onClose}
      size="lg"
      scroll
      footer={pickerOpen ? <Button type="button" variant="ghost" onClick={closePicker}>Закрыть</Button> :
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
      <div hidden={pickerOpen} className="space-y-3">
        {error && <ErrorBox error={error} onRetry={() => {}} />}
        <div className="flex items-center gap-2 text-sm text-stone-300">
          Выбрать
          <NumberStepper hideLabel required label="Сколько выбрать" min={1} max={10} value={group.pick_count ?? 1} onChange={(n) => setGroup((g) => ({ ...g, pick_count: n }))} />
        </div>
        <div className="flex flex-wrap gap-2">
          <ItemKindAddControl
            extra={{ FILTER: 'Любой предмет вида' }}
            onPick={(value) => (value === 'FILTER' ? setFilterOpen(true) : setPickerKind(value))}
          />
        </div>
        {filterOpen && (
          <FilterOptionForm
            onAdd={(option) => {
              setGroup((g) => ({ ...g, options: [...g.options, option] }))
              setFilterOpen(false)
            }}
          />
        )}

        <div className="space-y-2">
          {group.options.map((o, oi) => (
            <div key={oi} className="flex items-center gap-2 rounded-lg border border-stone-700/60 bg-stone-900/60 p-2">
              <span className="min-w-0 flex-1 truncate text-sm text-stone-200">
                {o.item_id == null ? describeItemFilter(o) : (o.name ?? `предмет #${o.item_id}`)}
              </span>
              <NumberStepper hideLabel required label="Количество" min={1} max={99} suffix="шт." value={Number(o.quantity) || 1} onChange={(n) => setOptionQuantity(oi, n)} />
              <button
                type="button"
                onClick={() => removeOption(oi)}
                className="catalog-delete-button"
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
        <ItemPickerModal inline kind={pickerKind} excludeIds={usedIds} onPick={addOption} onClose={closePicker} />
      )}
    </Drawer>
  )
}
