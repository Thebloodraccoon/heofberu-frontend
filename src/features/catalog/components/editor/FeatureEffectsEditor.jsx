import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi as api } from '@/features/catalog/api.js'
import {
  abilityLabels,
  armorProficiencyLabels,
  weaponProficiencyLabels,
} from '@/lib/i18n/index.js'
import { Input } from '@/components/ui'
import { normalizeEffectsTree } from '@/lib/utils/featureEffects.js'
import { SectionTitle, TrashIcon } from './editorShared.jsx'

function AddButton({ onClick, disabled, title }) {
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

function RowShell({ children, onRemove }) {
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

function BlankSlot() {
  return <span />
}

// Всплывающее меню «что доступно добавить» — открывается кнопкой «+», без
// нативного <select>. Уже добавленные варианты показаны серым и недоступны
// для повторного выбора (дублирование владений/эффектов невозможно).
function PickerMenu({ options, onPick, disabled, addLabel, searchable }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)

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
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-72 w-72 overflow-auto rounded-lg border border-stone-700 bg-stone-900 p-1 shadow-xl">
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

function Section({ title, count, empty, addControl, onRemoveAll, onHide, children }) {
  return (
    <div className="pt-3">
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
            {onRemoveAll && count > 0 && (
              <button
                type="button"
                onClick={onRemoveAll}
                className="my-[5px] mr-1 rounded border border-red-800 px-2 py-1 text-xs text-red-300 transition hover:bg-red-950/50"
              >
                Очистить
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

// --- Фиксированные эффекты -------------------------------------------------

function AbilityEffectsEditor({ rows = [], onChange, onHide }) {
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
      onRemoveAll={() => onChange([])}
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
          <Input
            type="number"
            min={-5}
            max={5}
            value={row.amount}
            onChange={(e) => onChange(rows.map((r, j) => (j === i ? { ...r, amount: Number(e.target.value) || 0 } : r)))}
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

function SkillEffectsEditor({ rows = [], onChange, onHide }) {
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
      onRemoveAll={() => onChange([])}
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

function SavingThrowEffectsEditor({ rows = [], onChange, onHide }) {
  const used = new Set(rows.map((r) => r.ability))
  const options = Object.entries(abilityLabels).map(([k, v]) => ({ key: k, label: v, disabled: used.has(k) }))
  const usedUp = options.every((o) => o.disabled)
  const add = (ability) => onChange([...rows, { ability }])

  return (
    <Section
      title="Проверки спасброска"
      count={rows.length}
      empty="Спасбросков нет"
      onRemoveAll={() => onChange([])}
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

function ArmorEffectsEditor({ rows = [], onChange, onHide }) {
  const used = new Set(rows.map((r) => r.armor_type))
  const options = Object.entries(armorProficiencyLabels).map(([k, v]) => ({ key: k, label: v, disabled: used.has(k) }))
  const usedUp = options.every((o) => o.disabled)
  const add = (armorType) => onChange([...rows, { armor_type: armorType }])

  return (
    <Section
      title="Владение доспехами"
      count={rows.length}
      empty="Доспехов нет"
      onRemoveAll={() => onChange([])}
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

// Всплывающее меню поиска конкретного предмета/заклинания (без нативного select).
function SearchMenu({ addLabel, placeholder, search, onPick, excludeIds, keepOpen }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const resultsQ = useQuery({
    queryKey: ['catalog', 'ref-menu', placeholder, query.trim()],
    enabled: open && query.trim().length > 0,
    queryFn: () => search({ search: query.trim(), size: 8 }),
  })
  const results = (resultsQ.data?.items ?? []).filter((item) => !excludeIds.has(item.id))

  return (
    <div className="relative inline-block" ref={ref}>
      <AddButton onClick={() => setOpen((v) => !v)} title={addLabel} />
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-lg border border-stone-700 bg-stone-900 p-1 shadow-xl">
          <input
            autoFocus
            type="search"
            className="input-base mb-1 w-full"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className="max-h-56 overflow-auto">
            {resultsQ.isFetching && <li className="px-2 py-1.5 text-xs text-stone-500">Поиск…</li>}
            {!resultsQ.isFetching && query.trim() && results.length === 0 && (
              <li className="px-2 py-1.5 text-xs text-stone-500">Ничего не найдено</li>
            )}
            {results.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="block w-full truncate rounded px-2 py-1.5 text-left text-sm text-stone-200 transition hover:bg-stone-800"
                  onClick={() => {
                    onPick(item.id, item.name)
                    setQuery('')
                    if (!keepOpen) setOpen(false)
                  }}
                >
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function WeaponEffectsEditor({ rows = [], onChange, onHide }) {
  const usedCategories = new Set(rows.filter((r) => r.item_id == null).map((r) => r.weapon_category))
  const usedItemIds = new Set(rows.filter((r) => r.item_id != null).map((r) => r.item_id))
  const categoryOptions = Object.entries(weaponProficiencyLabels).map(([k, v]) => ({
    key: k,
    label: v,
    disabled: usedCategories.has(k),
  }))
  const addCategory = (cat) => onChange([...rows, { weapon_category: cat, item_id: null }])
  const addItem = (id, name) => onChange([...rows, { item_id: id, weapon_category: null, itemName: name }])

  return (
    <Section
      title="Владение оружием"
      count={rows.length}
      empty="Оружия нет"
      onRemoveAll={() => onChange([])}
      onHide={onHide}
      addControl={
        <div className="flex flex-wrap gap-1">
          <PickerMenu
            options={categoryOptions}
            onPick={addCategory}
            disabled={categoryOptions.every((o) => o.disabled)}
            addLabel="+ Категория"
          />
          <SearchMenu
            addLabel="+ Конкретное оружие"
            placeholder="Поиск оружия…"
            search={api.items.list}
            onPick={addItem}
            excludeIds={usedItemIds}
          />
        </div>
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

function SpellEffectsEditor({ rows = [], onChange, onHide }) {
  const spellsQ = useQuery({
    queryKey: ['catalog', 'spells', 'all'],
    queryFn: () => api.spells.list({ size: 200 }),
  })
  const spells = (spellsQ.data?.items ?? []).map((s) => ({ id: s.id, name: s.name }))
  const nameOf = (id) => spells.find((s) => s.id === id)?.name ?? `заклинание #${id}`
  const used = new Set(rows.map((r) => r.spell_id))
  const options = spells.map((s) => ({ key: s.id, label: s.name, disabled: used.has(s.id), keepOpen: true }))
  const add = (spellId) => onChange([...rows, { spell_id: spellId }])

  return (
    <Section
      title="Заклинания"
      count={rows.length}
      empty="Заклинаний нет"
      onRemoveAll={() => onChange([])}
      onHide={onHide}
      addControl={
        <PickerMenu options={options} onPick={add} disabled={spells.length === 0} addLabel="+ Заклинание" searchable />
      }
    >
      {spellsQ.isFetching && <p className="pb-1 text-xs text-stone-500">Загрузка списка заклинаний…</p>}
      {rows.map((row, i) => (
        <RowShell key={i} onRemove={() => onChange(rows.filter((_, j) => j !== i))}>
          <span className="min-w-0 self-center truncate text-sm text-stone-200">{nameOf(row.spell_id)}</span>
          <BlankSlot />
          <BlankSlot />
        </RowShell>
      ))}
    </Section>
  )
}

// Каталог статичных типов эффектов: используется и для корневых эффектов
// особенности, и для эффекта, привязанного к группе выбора.
const EFFECT_TYPES = [
  { key: 'ability_effects', label: 'Изменение характеристик', Editor: AbilityEffectsEditor },
  { key: 'skill_effects', label: 'Владение навыками', Editor: SkillEffectsEditor },
  { key: 'saving_throw_effects', label: 'Проверки спасброска', Editor: SavingThrowEffectsEditor },
  { key: 'armor_effects', label: 'Владение доспехами', Editor: ArmorEffectsEditor },
  { key: 'weapon_effects', label: 'Владение оружием', Editor: WeaponEffectsEditor },
  { key: 'spell_effects', label: 'Заклинания', Editor: SpellEffectsEditor },
]

// Список статичных эффектов особенности: по умолчанию скрыт (описание
// сразу заканчивается кнопкой «+ Добавить статичный эффект»); выбранный тип
// раскрывается только после того, как GM явно его добавил. Пустой,
// только что раскрытый тип можно свернуть обратно кнопкой «Скрыть».
function EffectTypesEditor({ getRows, setRows }) {
  const [active, setActive] = useState(
    () => new Set(EFFECT_TYPES.filter((t) => getRows(t.key).length > 0).map((t) => t.key)),
  )
  const addOptions = EFFECT_TYPES.map((t) => ({ key: t.key, label: t.label, disabled: active.has(t.key) }))
  const allActive = addOptions.every((o) => o.disabled)

  return (
    <div className="space-y-1">
      {EFFECT_TYPES.filter((t) => active.has(t.key)).map((t) => (
        <t.Editor
          key={t.key}
          rows={getRows(t.key)}
          onChange={(rows) => setRows(t.key, rows)}
          onHide={
            getRows(t.key).length === 0
              ? () =>
                  setActive((prev) => {
                    const next = new Set(prev)
                    next.delete(t.key)
                    return next
                  })
              : undefined
          }
        />
      ))}
      <div className="pt-3">
        <PickerMenu
          options={addOptions}
          onPick={(key) => setActive((prev) => new Set(prev).add(key))}
          disabled={allActive}
          addLabel="+ Добавить статичный эффект"
        />
      </div>
    </div>
  )
}

// --- Группы выбора ---------------------------------------------------------

// В отличие от корневых статичных эффектов, группа выбора теперь всегда
// привязана к ОДНОМУ типу эффекта — так «Выбор» читается как «выберите один
// вариант из N», а не превращается в произвольный набор из шести типов.
function inferGroupEffectType(group) {
  if (group.effect_type) return group.effect_type
  for (const t of EFFECT_TYPES) {
    if ((group.options ?? []).some((o) => (o[t.key] ?? []).length > 0)) return t.key
  }
  return EFFECT_TYPES[0].key
}

const EMPTY_OPTION_EFFECTS = () => ({
  label: '',
  ability_effects: [],
  skill_effects: [],
  saving_throw_effects: [],
  armor_effects: [],
  weapon_effects: [],
  spell_effects: [],
})

function ChoiceGroupEditor({ group, onGroupChange, onRemove }) {
  const effectType = inferGroupEffectType(group)
  const typeLabel = EFFECT_TYPES.find((t) => t.key === effectType)?.label ?? effectType
  const OptionEditor = EFFECT_TYPES.find((t) => t.key === effectType)?.Editor

  const patchGroup = (changes) => onGroupChange({ ...group, ...changes })
  const patchOption = (oi, changes) =>
    patchGroup({
      options: (group.options ?? []).map((o, j) => (j === oi ? { ...o, ...changes } : o)),
    })

  return (
    <div className="space-y-3 rounded-lg border border-gold/30 bg-stone-900/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded border border-gold/40 bg-gold/10 px-2 py-1 text-xs font-medium text-gold">
          {typeLabel}
        </span>
        <Input
          value={group.label}
          onChange={(e) => patchGroup({ label: e.target.value })}
          placeholder="Название группы, например «Выберите навык»"
          className="min-w-[220px] flex-1"
        />
        <label className="flex items-center gap-2 text-sm text-stone-300">
          Выбрать
          <Input
            type="number"
            min={1}
            max={10}
            value={group.pick_count ?? 1}
            onChange={(e) => patchGroup({ pick_count: Math.max(1, Number(e.target.value) || 1) })}
            className="input-narrow w-16"
          />
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="my-[5px] inline-flex h-[40px] w-[40px] items-center justify-center rounded border border-red-800 text-red-300 transition hover:bg-red-950/50"
          title="Удалить группу"
        >
          <TrashIcon />
        </button>
      </div>

      <div className="space-y-3">
        {(group.options ?? []).map((option, oi) => (
          <div key={oi} className="space-y-2 rounded-lg border border-stone-700/60 p-3">
            <div className="flex items-center gap-2">
              <Input
                value={option.label}
                onChange={(e) => patchOption(oi, { label: e.target.value })}
                placeholder="Название варианта, например «Скрытность»"
                className="min-w-[200px] flex-1"
              />
              <button
                type="button"
                onClick={() => patchGroup({ options: (group.options ?? []).filter((_, j) => j !== oi) })}
                className="my-[5px] inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded border border-red-800 text-red-300 transition hover:bg-red-950/50"
                title="Удалить вариант"
              >
                <TrashIcon />
              </button>
            </div>
            <OptionEditor
              rows={option[effectType] ?? []}
              onChange={(r) => patchOption(oi, { [effectType]: r })}
            />
          </div>
        ))}
        <AddButton
          onClick={() => patchGroup({ options: [...(group.options ?? []), EMPTY_OPTION_EFFECTS()] })}
          title="+ Добавить вариант"
        />
      </div>
    </div>
  )
}

// --- Корень ----------------------------------------------------------------

export default function FeatureEffectsEditor({ value, onChange }) {
  const tree = normalizeEffectsTree(value)
  const setFixed = (key, rows) => onChange({ ...tree, [key]: rows })
  const groups = tree.choice_groups

  const usedGroupTypes = new Set(groups.map((g) => inferGroupEffectType(g)))
  const groupTypeOptions = EFFECT_TYPES.map((t) => ({
    key: t.key,
    label: t.label,
    disabled: usedGroupTypes.has(t.key),
  }))
  const allGroupTypesUsed = groupTypeOptions.every((o) => o.disabled)

  return (
    <div className="space-y-4">
      <EffectTypesEditor getRows={(k) => tree[k]} setRows={setFixed} />

      <div className="pt-3">
        <SectionTitle
          button={
            <PickerMenu
              options={groupTypeOptions}
              onPick={(effectType) =>
                onChange({ ...tree, choice_groups: [...groups, { effect_type: effectType, pick_count: 1, label: '', options: [] }] })
              }
              disabled={allGroupTypesUsed}
              addLabel="+ Добавить выбор"
            />
          }
        >
          Группы выбора
        </SectionTitle>
        <p className="pb-2 text-xs text-stone-500">
          Особенность выдаёт игроку выбор «N из M» по одному типу эффекта — сначала выберите тип, затем добавьте
          варианты (каждый вариант — конкретное значение этого типа). Для каждого типа эффекта может быть только
          одна группа выбора.
        </p>
        {groups.length === 0 ? (
          <p className="text-sm text-stone-500">Групп выбора нет — особенность применяется автоматически.</p>
        ) : (
          <div className="space-y-3">
            {groups.map((group, gi) => (
              <ChoiceGroupEditor
                key={gi}
                group={group}
                onGroupChange={(g) => onChange({ ...tree, choice_groups: groups.map((gr, j) => (j === gi ? g : gr)) })}
                onRemove={() => onChange({ ...tree, choice_groups: groups.filter((_, j) => j !== gi) })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
