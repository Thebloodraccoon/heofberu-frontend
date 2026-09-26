/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi as api } from '@/features/catalog/api.js'
import {
  abilityLabels,
  armorProficiencyLabels,
  weaponProficiencyLabels,
} from '@/lib/i18n/index.js'
import { Input } from '@/components/ui'
import { BlurNumberInput, SectionTitle, TrashIcon } from './editorShared.jsx'
import { useSpellNames } from '@/features/catalog/queries.js'
import SpellPickerModal from './SpellPickerModal.jsx'

// Редакторы по одному типу эффекта (характеристики/навыки/спасброски/доспехи/
// оружие/заклинания) — общий строительный блок и для статичных эффектов
// особенности, и для формы одного варианта внутри группы выбора. Вынесены
// сюда, чтобы EffectGroupModal и FeatureEffectsEditor не дублировали код.

export function AddButton({ onClick, disabled, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800 disabled:pointer-events-none disabled:opacity-40"
    >
      {title}
    </button>
  )
}

export function RowShell({ children, onRemove }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-stone-700/60 bg-stone-900/60 p-2">
      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {children}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded border border-red-800 text-red-300 transition hover:bg-red-950/50"
        title="Удалить"
      >
        <TrashIcon />
      </button>
    </div>
  )
}

export function BlankSlot() {
  return <span />
}

const MENU_WIDTH = 288 // w-72
const MENU_MARGIN = 8

// Координаты всплывающего меню в viewport (position: fixed) — так оно не
// обрезается overflow-auto модалки/скролл-контейнера и не уезжает за правый
// край экрана: если места справа от кнопки не хватает, разворачивается влево.
function useMenuPosition(open, anchorRef) {
  const [pos, setPos] = useState(null)
  useEffect(() => {
    if (!open || !anchorRef.current) {
      setPos(null)
      return
    }
    const rect = anchorRef.current.getBoundingClientRect()
    const fitsRight = rect.left + MENU_WIDTH <= window.innerWidth - MENU_MARGIN
    const left = fitsRight
      ? rect.left
      : Math.max(MENU_MARGIN, window.innerWidth - MENU_WIDTH - MENU_MARGIN)
    setPos({ top: rect.bottom + 4, left })
  }, [open, anchorRef])
  return pos
}

// Всплывающее меню «что доступно добавить» — открывается кнопкой «+», без
// нативного <select>. Уже добавленные варианты показаны серым и недоступны
// для повторного выбора (дублирование владений/эффектов невозможно).
export function PickerMenu({ options, onPick, disabled, addLabel, searchable }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)
  const pos = useMenuPosition(open, ref)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const list = q.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()))
    : options

  return (
    <div className="relative inline-block" ref={ref}>
      <AddButton onClick={() => setOpen((v) => !v)} disabled={disabled} title={addLabel} />
      {open && pos && (
        <div
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
          className="z-30 max-h-72 w-72 overflow-auto rounded-lg border border-stone-700 bg-stone-900 p-1 shadow-xl"
        >
          {searchable && options.length > 6 && (
            <input
              autoFocus
              type="search"
              className="input-base mb-1 w-full"
              placeholder="Поиск…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          )}
          {list.length === 0 && <p className="px-2 py-1.5 text-xs text-stone-500">Ничего не найдено</p>}
          <ul>
            {list.map((o) => (
              <li key={o.key}>
                <button
                  type="button"
                  disabled={o.disabled}
                  onClick={() => {
                    onPick(o.key)
                    if (!o.keepOpen) setOpen(false)
                  }}
                  className="flex w-full items-center justify-between gap-2 truncate rounded px-2 py-1.5 text-left text-sm text-stone-200 transition hover:bg-stone-800 disabled:pointer-events-none disabled:opacity-30"
                >
                  <span className="truncate">{o.label}</span>
                  {o.disabled && <span className="shrink-0 text-xs text-stone-500">добавлено</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function Section({ title, count, empty, addControl, onHide, children }) {
  return (
    <div>
      <SectionTitle
        button={
          <>
            {onHide && count === 0 && (
              <button
                type="button"
                onClick={onHide}
                className="my-[5px] mr-1 rounded border border-stone-700 px-2 py-1 text-xs text-stone-400 transition hover:bg-stone-800"
              >
                Скрыть
              </button>
            )}
            {addControl}
          </>
        }
      >
        {title}
      </SectionTitle>
      {count === 0 ? (
        <p className="text-sm text-stone-500">{empty}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  )
}

export function AbilityEffectsEditor({ rows = [], onChange, onHide }) {
  const used = new Set(rows.map((r) => r.ability))
  const options = Object.entries(abilityLabels).map(([k, v]) => ({
    key: k,
    label: v,
    disabled: used.has(k),
  }))
  const usedUp = options.every((o) => o.disabled)
  const add = (ability) => onChange([...rows, { ability, amount: 1, new_cap: null }])

  return (
    <Section
      title="Изменение характеристик"
      count={rows.length}
      empty="Увеличений нет"
      onHide={onHide}
      addControl={<PickerMenu options={options} onPick={add} disabled={usedUp} addLabel="+ Увеличение" />}
    >
      {usedUp && rows.length > 0 && (
        <p className="pb-1 text-xs text-stone-500">
          Все доступные характеристики уже использованы — каждая может встретиться только раз.
        </p>
      )}
      {rows.map((row, i) => (
        <RowShell key={i} onRemove={() => onChange(rows.filter((_, j) => j !== i))}>
          <span className="min-w-0 self-center truncate text-sm text-stone-200">
            {abilityLabels[row.ability] ?? row.ability}
          </span>
          <BlurNumberInput
            min={-5}
            max={5}
            value={row.amount}
            onChange={(next) => onChange(rows.map((r, j) => (j === i ? { ...r, amount: Number(next) || 0 } : r)))}
            className="input-base"
            title="Величина бонуса"
          />
          <Input
            type="number"
            min={20}
            max={30}
            value={row.new_cap ?? ''}
            onChange={(e) =>
              onChange(
                rows.map((r, j) =>
                  j === i
                    ? { ...r, new_cap: e.target.value === '' ? null : Math.min(30, Math.max(20, Number(e.target.value))) }
                    : r,
                ),
              )
            }
            placeholder="новый макс."
            title="Новый предел характеристики (20–30)"
          />
        </RowShell>
      ))}
    </Section>
  )
}

export function SkillEffectsEditor({ rows = [], onChange, onHide }) {
  const skillsQ = useQuery({
    queryKey: ['catalog', 'skills', 'all'],
    queryFn: () => api.skills.list({ size: 100 }),
  })
  const skills = (skillsQ.data?.items ?? []).map((s) => ({ id: s.id, name: s.name }))
  const nameOf = (id) => skills.find((s) => s.id === id)?.name ?? `навык #${id}`
  const used = new Set(rows.map((r) => r.skill_id))
  const options = skills.map((s) => ({ key: s.id, label: s.name, disabled: used.has(s.id) }))
  const add = (skillId) => onChange([...rows, { skill_id: skillId, grants_expertise: false }])

  return (
    <Section
      title="Владение навыками"
      count={rows.length}
      empty="Навыков нет"
      onHide={onHide}
      addControl={
        <PickerMenu options={options} onPick={add} disabled={skills.length === 0} addLabel="+ Навык" searchable />
      }
    >
      {skillsQ.isFetching && <p className="pb-1 text-xs text-stone-500">Загрузка списка навыков…</p>}
      {rows.map((row, i) => (
        <RowShell key={i} onRemove={() => onChange(rows.filter((_, j) => j !== i))}>
          <span className="min-w-0 self-center truncate text-sm text-stone-200">{nameOf(row.skill_id)}</span>
          <label className="flex items-center gap-2 truncate text-sm text-stone-300">
            <input
              type="checkbox"
              checked={!!row.grants_expertise}
              onChange={(e) =>
                onChange(rows.map((r, j) => (j === i ? { ...r, grants_expertise: e.target.checked } : r)))
              }
              className="checkbox-base"
            />
            Экспертиза
          </label>
          <BlankSlot />
        </RowShell>
      ))}
    </Section>
  )
}

export function SavingThrowEffectsEditor({ rows = [], onChange, onHide }) {
  const used = new Set(rows.map((r) => r.ability))
  const options = Object.entries(abilityLabels).map(([k, v]) => ({ key: k, label: v, disabled: used.has(k) }))
  const usedUp = options.every((o) => o.disabled)
  const add = (ability) => onChange([...rows, { ability }])

  return (
    <Section
      title="Проверки спасброска"
      count={rows.length}
      empty="Спасбросков нет"
      onHide={onHide}
      addControl={<PickerMenu options={options} onPick={add} disabled={usedUp} addLabel="+ Спасбросок" />}
    >
      {usedUp && rows.length > 0 && (
        <p className="pb-1 text-xs text-stone-500">Все характеристики уже добавлены — повтор невозможен.</p>
      )}
      {rows.map((row, i) => (
        <RowShell key={i} onRemove={() => onChange(rows.filter((_, j) => j !== i))}>
          <span className="min-w-0 self-center truncate text-sm text-stone-200">
            {abilityLabels[row.ability] ?? row.ability}
          </span>
          <BlankSlot />
          <BlankSlot />
        </RowShell>
      ))}
    </Section>
  )
}

export function ArmorEffectsEditor({ rows = [], onChange, onHide }) {
  const used = new Set(rows.map((r) => r.armor_type))
  const options = Object.entries(armorProficiencyLabels).map(([k, v]) => ({ key: k, label: v, disabled: used.has(k) }))
  const usedUp = options.every((o) => o.disabled)
  const add = (armorType) => onChange([...rows, { armor_type: armorType }])

  return (
    <Section
      title="Владение доспехами"
      count={rows.length}
      empty="Доспехов нет"
      onHide={onHide}
      addControl={<PickerMenu options={options} onPick={add} disabled={usedUp} addLabel="+ Доспех" />}
    >
      {usedUp && rows.length > 0 && (
        <p className="pb-1 text-xs text-stone-500">Все типы доспехов уже добавлены — повтор невозможен.</p>
      )}
      {rows.map((row, i) => (
        <RowShell key={i} onRemove={() => onChange(rows.filter((_, j) => j !== i))}>
          <span className="min-w-0 self-center truncate text-sm text-stone-200">
            {armorProficiencyLabels[row.armor_type] ?? row.armor_type}
          </span>
          <BlankSlot />
          <BlankSlot />
        </RowShell>
      ))}
    </Section>
  )
}

export function WeaponEffectsEditor({ rows = [], onChange, onHide }) {
  const usedCategories = new Set(rows.filter((r) => r.item_id == null).map((r) => r.weapon_category))
  const categoryOptions = Object.entries(weaponProficiencyLabels).map(([k, v]) => ({
    key: k,
    label: v,
    disabled: usedCategories.has(k),
  }))
  const addCategory = (cat) => onChange([...rows, { weapon_category: cat, item_id: null }])

  return (
    <Section
      title="Владение оружием"
      count={rows.length}
      empty="Оружия нет"
      onHide={onHide}
      addControl={
        <PickerMenu
          options={categoryOptions}
          onPick={addCategory}
          disabled={categoryOptions.every((o) => o.disabled)}
          addLabel="+ Категория"
        />
      }
    >
      {rows.map((row, i) => (
        <RowShell key={i} onRemove={() => onChange(rows.filter((_, j) => j !== i))}>
          <span className="min-w-0 self-center truncate text-sm text-stone-200">
            {row.item_id != null
              ? (row.itemName ?? `предмет #${row.item_id}`)
              : (weaponProficiencyLabels[row.weapon_category] ?? row.weapon_category)}
          </span>
          <BlankSlot />
          <BlankSlot />
        </RowShell>
      ))}
    </Section>
  )
}

export function SpellEffectsEditor({ rows = [], onChange, onHide }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const spellNames = useSpellNames(rows.map((r) => r.spell_id))
  const nameOf = (id) => spellNames[Number(id)] ?? `заклинание #${id}`
  const add = (sp) => onChange([...rows, { spell_id: sp.id }])

  return (
    <>
      <Section
        title="Заклинания"
        count={rows.length}
        empty="Заклинаний нет"
        onHide={onHide}
        addControl={<AddButton onClick={() => setPickerOpen(true)} title="+ Заклинание" />}
      >
        {rows.map((row, i) => (
          <RowShell key={i} onRemove={() => onChange(rows.filter((_, j) => j !== i))}>
            <span className="min-w-0 self-center truncate text-sm text-stone-200">{nameOf(row.spell_id)}</span>
            <BlankSlot />
            <BlankSlot />
          </RowShell>
        ))}
      </Section>
      {pickerOpen && (
        <SpellPickerModal
          excludeIds={rows.map((r) => r.spell_id)}
          onPick={add}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  )
}

// Каталог статичных типов эффектов: используется и для корневых эффектов
// особенности, и для эффекта, привязанного к группе выбора.
export const EFFECT_TYPES = [
  { key: 'ability_effects', label: 'Изменение характеристик', Editor: AbilityEffectsEditor },
  { key: 'skill_effects', label: 'Владение навыками', Editor: SkillEffectsEditor },
  { key: 'saving_throw_effects', label: 'Проверки спасброска', Editor: SavingThrowEffectsEditor },
  { key: 'armor_effects', label: 'Владение доспехами', Editor: ArmorEffectsEditor },
  { key: 'weapon_effects', label: 'Владение оружием', Editor: WeaponEffectsEditor },
  { key: 'spell_effects', label: 'Заклинания', Editor: SpellEffectsEditor },
]

export const EMPTY_OPTION_EFFECTS = () => ({
  ability_effects: [],
  skill_effects: [],
  saving_throw_effects: [],
  armor_effects: [],
  weapon_effects: [],
  spell_effects: [],
})
