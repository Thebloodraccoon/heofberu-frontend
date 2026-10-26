import { useState } from 'react'
import Drawer from '@/components/ui/Drawer.jsx'
import { Button, ConfirmDialog, DiceField, ErrorBox, Field, Input, RichText, RichTextEditor } from '@/components/ui'
import EditorAddButton from './EditorAddButton.jsx'
import { PencilIcon, SectionTitle } from './editorShared.jsx'
import { weaponPropertyGaps } from '@/lib/utils/weaponProperties.js'
import { useCreateWeaponProperty, useDeleteWeaponProperty, useUpdateWeaponProperty, useWeaponProperties } from '@/features/catalog/queries.js'
import OptionsPicker from './OptionsPicker.jsx'

const EMPTY_DRAFT = { name: '', description: '', requires_range: false, requires_versatile_damage: false }

// Свойство общего словаря во второй выезжающей панели поверх списка: без property —
// новое (POST, созданное сразу выбирается у оружия), с property — правка (PATCH) и
// «Удалить» (DELETE; 409, пока свойство стоит у какого-то оружия).
function PropertyPanel({ property, onCreated, onDeleted, onClose }) {
  const [draft, setDraft] = useState(() => (property
    ? { name: property.name, description: property.description ?? '', requires_range: !!property.requires_range, requires_versatile_damage: !!property.requires_versatile_damage }
    : EMPTY_DRAFT))
  const [confirming, setConfirming] = useState(false)
  const create = useCreateWeaponProperty()
  const update = useUpdateWeaponProperty()
  const remove = useDeleteWeaponProperty()
  const save = property ? update : create
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const submit = async () => {
    const body = { ...draft, name: draft.name.trim() }
    if (property) await update.mutateAsync({ id: property.id, body })
    else onCreated(await create.mutateAsync(body))
    onClose()
  }
  const destroy = async () => {
    setConfirming(false)
    await remove.mutateAsync(property.id)
    onDeleted(property.id)
    onClose()
  }
  const error = save.error ?? remove.error

  return (
    <Drawer
      title={property ? `Свойство: ${property.name}` : 'Новое свойство оружия'}
      subtitle={property ? 'Правка в общем словаре — меняется у всего оружия с этим свойством' : 'Появится в общем словаре свойств'}
      closeLabel={property ? 'Закрыть: свойство' : 'Закрыть: новое свойство'}
      onClose={onClose}
      footer={
        <>
          {property && (
            <Button type="button" variant="ghost" className="mr-auto" onClick={() => setConfirming(true)} disabled={remove.isPending}>
              {remove.isPending ? 'Удаляем…' : 'Удалить'}
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
          <Button type="button" onClick={() => submit().catch(() => {})} disabled={!draft.name.trim() || save.isPending}>
            {save.isPending ? 'Сохраняем…' : property ? 'Сохранить' : 'Создать'}
          </Button>
        </>
      }
    >
      {/* Поля — как в форме редактора: Field + Input, описание — Markdown-редактор, флажки — карточки-чекбоксы. */}
      <div className="grid gap-4">
        {error && <ErrorBox error={error} />}
        <Field label="Название *">
          <Input value={draft.name} maxLength={100} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Описание">
          <RichTextEditor value={draft.description} onChange={(e) => set({ description: e.target.value })} rows={4} ariaLabel="Описание свойства" />
        </Field>
        {[
          ['requires_range', 'Требует дистанцию (метательное, боеприпас)'],
          ['requires_versatile_damage', 'Требует урон двумя руками (универсальное)'],
        ].map(([key, text]) => (
          <label key={key} className="flex w-full cursor-pointer items-center gap-2 rounded border border-stone-700 bg-stone-800/70 px-3 py-2">
            <input type="checkbox" checked={draft[key]} onChange={(e) => set({ [key]: e.target.checked })} className="size-4 accent-ember" />
            <span className="text-sm text-stone-200">{text}</span>
          </label>
        ))}
      </div>
      {confirming && (
        <ConfirmDialog
          title="Удалить свойство?"
          message={<>Свойство <span className="font-semibold text-stone-100">«{property.name}»</span> пропадёт из словаря. Удалить можно, только если его нет ни у одного оружия.</>}
          onCancel={() => setConfirming(false)}
          onConfirm={() => destroy().catch(() => {})}
        />
      )}
    </Drawer>
  )
}

// Редактор словаря свойств — отдельная панель (кнопка в шапке блока): список
// свойств, карандаш открывает PropertyPanel (правка и удаление). Выбор свойств
// у оружия и «Добавить» — в обычной панели «Изменить».
function PropertiesEditorPanel({ properties, onEdit, onClose }) {
  return (
    <Drawer
      title="Редактор свойств"
      subtitle="Общий словарь — правка меняет свойство у всего оружия"
      closeLabel="Закрыть: редактор свойств"
      bodyClassName="grant-picker-body"
      onClose={onClose}
      footer={<Button type="button" variant="ghost" onClick={onClose}>Закрыть</Button>}
    >
      <div className="grant-picker-list space-y-2 pr-1">
        {properties.length === 0 && <p className="text-sm text-stone-500">Свойств нет</p>}
        {properties.map((p) => (
          <div key={p.id} className="flex items-start gap-2 rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-stone-100">{p.name}</p>
              {p.description && <RichText value={p.description} className="mt-1 text-xs text-stone-400" />}
            </div>
            <button
              type="button"
              onClick={() => onEdit(p)}
              className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded border border-stone-700 text-stone-300 transition hover:bg-stone-800"
              title="Редактировать"
              aria-label={`Редактировать свойство: ${p.name}`}
            >
              <PencilIcon />
            </button>
          </div>
        ))}
      </div>
    </Drawer>
  )
}

const NO_VERSATILE = { versatile_dice_count: '', versatile_dice_type: '' }

// Свойства оружия — мультивыбор из словаря GET /items/properties (форма
// хранит property_ids). Подсказывает, каким выбранным свойствам не хватает
// дистанции или урона двумя руками — иначе бэк ответит 422. Урон двумя руками
// (versatile_dice_*) правится здесь же и виден, только пока выбрано свойство с
// requires_versatile_damage; снятие такого свойства сбрасывает кости (уйдут null).
// Свойство с невыполненным требованием остаётся выбранным локально и сохраняется
// одним PATCH вместе с костями/дистанцией, как только их заполнят.
export default function WeaponPropertiesPicker({ value = [], onChange, onFormChange = () => {}, form = {} }) {
  const { data: properties = [], error, refetch } = useWeaponProperties()
  const [panel, setPanel] = useState(null) // { property } — null у нового свойства
  const [managing, setManaging] = useState(false)
  // Пока требования не выполнены, property_ids не уходят на сервер (lib/utils/weaponProperties.js:weaponWithhold).
  const { range: needRange, versatile: needVersatile } = weaponPropertyGaps({ ...form, property_ids: value }, properties)
  const versatileIds = new Set(properties.filter((p) => p.requires_versatile_damage).map((p) => p.id))
  const showVersatile = value.some((id) => versatileIds.has(id))
  const setIds = (next) => {
    onChange(next)
    if (showVersatile && !next.some((id) => versatileIds.has(id))) onFormChange(NO_VERSATILE)
  }
  const toggle = (id) => setIds(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])

  return (
    <div className="space-y-2">
      {error && <ErrorBox error={error} onRetry={refetch} />}
      <OptionsPicker
        drawer
        label="Свойства оружия"
        empty="Свойств нет"
        chosenAsRows
        options={properties.map((p) => ({ value: p.id, label: p.name, description: p.description }))}
        selected={value}
        onToggle={toggle}
        onClear={() => setIds([])}
        drawerActions={<EditorAddButton onClick={() => setPanel({ property: null })} aria-label="Добавить свойство">Добавить</EditorAddButton>}
        headerActions={
          <button type="button" className="catalog-add-button" onClick={() => setManaging(true)}>
            Редактор свойств
          </button>
        }
      />
      {needRange.length > 0 && <p className="text-xs text-ember">{needRange.join(', ')}: укажите дистанцию (вкладка «Характеристики») — свойство сохранится вместе с ней.</p>}
      {showVersatile && (
        <div className="space-y-2 pt-2">
          <SectionTitle>Урон двумя руками — для свойства «Универсальное»</SectionTitle>
          <DiceField
            label="Кость урона двумя руками"
            count={form.versatile_dice_count ?? ''}
            type={form.versatile_dice_type ?? ''}
            optional
            onChange={({ count, type }) => onFormChange({ versatile_dice_count: count === '' ? '' : String(count), versatile_dice_type: type })}
          />
        </div>
      )}
      {needVersatile.length > 0 && <p className="text-xs text-ember">{needVersatile.join(', ')}: укажите урон двумя руками — свойство сохранится вместе с ним.</p>}
      {managing && <PropertiesEditorPanel properties={properties} onEdit={(property) => setPanel({ property })} onClose={() => setManaging(false)} />}
      {panel && (
        <PropertyPanel
          property={panel.property}
          onCreated={(p) => onChange([...value, p.id])}
          onDeleted={(id) => value.includes(id) && setIds(value.filter((v) => v !== id))}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  )
}
