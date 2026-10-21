import EditorAddButton from './EditorAddButton.jsx'
/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi as api } from '@/features/catalog/api.js'
import {
  abilityLabels,
  armorProficiencyLabels,
  skillEffectModeHints,
  skillEffectModeLabels,
  spellLevelLabels,
  spellSchoolLabels,
  weaponProficiencyLabels,
} from '@/lib/i18n/index.js'
import { Input, Select } from '@/components/ui'
import { BlurNumberInput, SectionTitle, TrashIcon } from './editorShared.jsx'
import { useClasses, useItemNames, useItemSearch, useSpellNames } from '@/features/catalog/queries.js'
import useDebouncedValue from '@/features/articles/useDebouncedValue.js'
import {
  SPELL_LEVELS,
  SPELL_SCHOOLS,
  isOpenSpellEffect,
  newOpenSpellEffect,
  spellLevelRangeInverted,
} from '@/lib/utils/spellFilter.js'

// Редакторы по одному типу эффекта (характеристики/навыки/спасброски/доспехи/
// оружие/заклинания) — общий строительный блок и для статичных эффектов
// особенности, и для формы одного варианта внутри группы выбора. Вынесены
// сюда, чтобы EffectGroupModal и FeatureEffectsEditor не дублировали код.

export function AddButton({ onClick, disabled, title }) {
  return <EditorAddButton onClick={onClick} disabled={disabled}>{title}</EditorAddButton>
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
        className="catalog-delete-button"
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
export function PickerMenu({ options, onPick, disabled, addLabel, searchable, onSearchChange, onOpenChange, loading = false, hasMore = false, onMore, error, onRetry }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)
  const pos = useMenuPosition(open, ref)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); onOpenChange?.(false) }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, onOpenChange])

  const list = !onSearchChange && q.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()))
    : options

  return (
    <div className="relative inline-block" ref={ref} onKeyDown={(event) => { if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); onOpenChange?.(false); ref.current?.querySelector('button')?.focus() } }}>
      <AddButton onClick={() => { const next = !open; setOpen(next); onOpenChange?.(next) }} disabled={disabled} title={addLabel} />
      {open && pos && (
        <div
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
          className="z-30 max-h-72 w-72 overflow-auto rounded-lg border border-stone-700 bg-stone-900 p-1 shadow-xl"
        >
          {searchable && (options.length > 6 || onSearchChange) && (
            <input
              autoFocus
              type="search"
              className="input-base mb-1 w-full"
              placeholder="Поиск…"
              value={q}
              onChange={(e) => { setQ(e.target.value); onSearchChange?.(e.target.value) }}
            />
          )}
          {!loading && !error && list.length === 0 && <p className="px-2 py-1.5 text-xs text-stone-500">Ничего не найдено</p>}
          <ul>
            {list.map((o) => (
              <li key={o.key}>
                <button
                  type="button"
                  disabled={o.disabled}
                  onClick={() => {
                    onPick(o.key)
                    if (!o.keepOpen) { setOpen(false); onOpenChange?.(false) }
                  }}
                  className="flex w-full items-center justify-between gap-2 truncate rounded px-2 py-1.5 text-left text-sm text-stone-200 transition hover:bg-stone-800 disabled:pointer-events-none disabled:opacity-30"
                >
                  <span className="truncate">{o.label}</span>
                  {o.disabled && <span className="shrink-0 text-xs text-stone-500">добавлено</span>}
                </button>
              </li>
            ))}
          </ul>
          {loading && <p className="px-2 py-2 text-sm text-stone-400">Загружаем…</p>}
          {error && <button type="button" onClick={onRetry} className="px-2 py-2 text-sm text-stone-300">Не удалось загрузить. Повторить</button>}
          {hasMore && <button type="button" disabled={loading} onClick={onMore} className="w-full px-2 py-2 text-sm text-stone-300 hover:bg-stone-800">Показать ещё</button>}
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

export function AbilityEffectsEditor({ rows = [], onChange, onHide, onOpenPicker }) {
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
      addControl={
        // В панели эффектов выбор уезжает на отдельный экран со списком
        // (onOpenPicker); уже добавленную характеристику там выбрать нельзя —
        // у строки своя величина и свой предел.
        onOpenPicker
          ? <AddButton onClick={onOpenPicker} title="+ Увеличение" />
          : <PickerMenu options={options} onPick={add} disabled={usedUp} addLabel="+ Увеличение" />
      }
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

// allowOpen — редактор открыт для варианта группы выбора: там можно добавить
// «любой навык на выбор» (skill_id: null, не больше одного на вариант) —
// конкретный навык игрок назовёт сам, когда будет выбирать вариант.
export function SkillEffectsEditor({ rows = [], onChange, onHide, onOpenPicker, allowOpen = false }) {
  const skillsQ = useQuery({
    queryKey: ['catalog', 'skills', 'all'],
    queryFn: () => api.skills.list({ size: 100 }),
  })
  const skills = (skillsQ.data?.items ?? []).map((s) => ({ id: s.id, name: s.name }))
  const nameOf = (id) =>
    id == null ? 'Любой навык на выбор' : (skills.find((s) => s.id === id)?.name ?? `навык #${id}`)
  const used = new Set(rows.map((r) => r.skill_id))
  const options = skills.map((s) => ({ key: s.id, label: s.name, disabled: used.has(s.id) }))
  const add = (skillId) => onChange([...rows, { skill_id: skillId, mode: 'PROFICIENCY' }])
  const hasOpen = rows.some((r) => r.skill_id == null)

  return (
    <Section
      title="Владение навыками"
      count={rows.length}
      empty="Навыков нет"
      onHide={onHide}
      addControl={
        <>
          {/* В панели эффектов выбор уезжает на отдельный экран со списком и
              поиском (onOpenPicker) — навыков много, в узком меню «+» тесно. */}
          {onOpenPicker
            ? <AddButton onClick={onOpenPicker} title="+ Навык" />
            : <PickerMenu options={options} onPick={add} disabled={skills.length === 0} addLabel="+ Навык" searchable />}
          {allowOpen && <AddButton onClick={() => add(null)} disabled={hasOpen} title="+ Любой навык" />}
        </>
      }
    >
      {skillsQ.isFetching && <p className="pb-1 text-xs text-stone-500">Загрузка списка навыков…</p>}
      {rows.map((row, i) => (
        <RowShell key={i} onRemove={() => onChange(rows.filter((_, j) => j !== i))}>
          <span className="min-w-0 self-center break-words text-sm text-stone-200">{nameOf(row.skill_id)}</span>
          {/* Режиму — две колонки из трёх: подпись выбора не обрезается. */}
          <div className="min-w-0 sm:col-span-2">
            <Select
              value={row.mode ?? 'PROFICIENCY'}
              onChange={(e) => onChange(rows.map((r, j) => (j === i ? { ...r, mode: e.target.value } : r)))}
              title="Что даёт эффект"
            >
              {Object.entries(skillEffectModeLabels).map(([mode, label]) => (
                <option key={mode} value={mode}>
                  {label}
                </option>
              ))}
            </Select>
            {skillEffectModeHints[row.mode ?? 'PROFICIENCY'] && (
              <p className="mt-1 text-xs text-stone-500">{skillEffectModeHints[row.mode ?? 'PROFICIENCY']}</p>
            )}
          </div>
        </RowShell>
      ))}
    </Section>
  )
}

export function SavingThrowEffectsEditor({ rows = [], onChange, onHide, onOpenPicker }) {
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
      addControl={
        onOpenPicker
          ? <AddButton onClick={onOpenPicker} title="+ Спасбросок" />
          : <PickerMenu options={options} onPick={add} disabled={usedUp} addLabel="+ Спасбросок" />
      }
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

// Владение доспехами и оружием: строка — категория (лёгкие, воинское…) или
// конкретный предмет из справочника (item_id). Редактор один, различаются
// подписи и категории — см. ARMOR_EDITOR/WEAPON_EDITOR. В панели эффектов
// каждая кнопка открывает свой экран (EffectRowsPicker, mode 'categories'/'items').
const ARMOR_EDITOR = {
  title: 'Владение доспехами',
  empty: 'Доспехов нет',
  usedUpText: 'Все типы доспехов уже добавлены — повтор невозможен.',
  categoryKey: 'armor_type',
  categoryLabels: armorProficiencyLabels,
  itemTypes: ['ARMOR', 'SHIELD'],
  categoryAddLabel: '+ Категория',
  itemAddLabel: '+ Доспех',
  itemFallback: 'доспех',
}

const WEAPON_EDITOR = {
  title: 'Владение оружием',
  empty: 'Оружия нет',
  categoryKey: 'weapon_category',
  categoryLabels: weaponProficiencyLabels,
  itemTypes: ['WEAPON'],
  categoryAddLabel: '+ Категория',
  itemAddLabel: '+ Оружие',
  itemFallback: 'оружие',
}

function CategoryOrItemEditor({ config, rows = [], onChange, onHide, onOpenPicker }) {
  const { categoryKey, categoryLabels, itemTypes, itemFallback } = config
  const used = new Set(rows.filter((r) => r.item_id == null).map((r) => r[categoryKey]))
  const categoryOptions = Object.entries(categoryLabels).map(([k, v]) => ({ key: k, label: v, disabled: used.has(k) }))
  const usedUp = categoryOptions.every((o) => o.disabled)
  const addCategory = (value) => onChange([...rows, { [categoryKey]: value, item_id: null }])

  const itemNames = useItemNames(rows.map((r) => r.item_id))
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  // Поиск по справочнику дебаунсим: без этого каждая буква — отдельный запрос.
  const debouncedQuery = useDebouncedValue(query.trim(), 300)
  const itemsQ = useItemSearch(itemTypes, debouncedQuery, { enabled: menuOpen && !onOpenPicker })
  const usedItems = new Set(rows.filter((r) => r.item_id != null).map((r) => Number(r.item_id)))
  const itemOptions = (itemsQ.data ?? []).map((item) => ({ key: item.id, label: item.name, disabled: usedItems.has(item.id) }))
  const addItem = (itemId) => onChange([...rows, { [categoryKey]: null, item_id: itemId }])

  return (
    <Section
      title={config.title}
      count={rows.length}
      empty={config.empty}
      onHide={onHide}
      addControl={
        onOpenPicker
          ? <>
              <AddButton onClick={() => onOpenPicker('categories')} title={config.categoryAddLabel} />
              <AddButton onClick={() => onOpenPicker('items')} title={config.itemAddLabel} />
            </>
          : <>
              <PickerMenu options={categoryOptions} onPick={addCategory} disabled={usedUp} addLabel={config.categoryAddLabel} />
              <PickerMenu
                options={itemOptions}
                onPick={addItem}
                addLabel={config.itemAddLabel}
                searchable
                onSearchChange={setQuery}
                onOpenChange={setMenuOpen}
                loading={itemsQ.isFetching}
              />
            </>
      }
    >
      {usedUp && rows.length > 0 && config.usedUpText && (
        <p className="pb-1 text-xs text-stone-500">{config.usedUpText}</p>
      )}
      {rows.map((row, i) => (
        <RowShell key={i} onRemove={() => onChange(rows.filter((_, j) => j !== i))}>
          <span className="min-w-0 self-center truncate text-sm text-stone-200">
            {row.item_id != null
              ? (itemNames[Number(row.item_id)] ?? `${itemFallback} #${row.item_id}`)
              : (categoryLabels[row[categoryKey]] ?? row[categoryKey])}
          </span>
          <BlankSlot />
          <BlankSlot />
        </RowShell>
      ))}
    </Section>
  )
}

export function ArmorEffectsEditor(props) {
  return <CategoryOrItemEditor config={ARMOR_EDITOR} {...props} />
}

export function WeaponEffectsEditor(props) {
  return <CategoryOrItemEditor config={WEAPON_EDITOR} {...props} />
}

// Кнопка-переключатель фильтра («чип»): школа, класс.
function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs transition ${
        active
          ? 'border-ember/70 bg-ember/15 text-orange-100'
          : 'border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200'
      }`}
    >
      {children}
    </button>
  )
}

function FilterCheckbox({ checked, onChange, children }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-300">
      <input type="checkbox" className="mt-0.5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  )
}

const toggleIn = (list = [], value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

// «Любое заклинание на выбор» — пустая ячейка, которую игрок заполнит сам,
// когда будет выбирать вариант. Фильтр сужает, что можно выбрать; пустой
// фильтр — любое заклинание из справочника (кроме уже известных персонажу).
function OpenSpellRow({ row, onChange, onRemove, classes }) {
  // Сохранённая строка несёт summary (текст условий с бэка); любая правка
  // его сбрасывает — дальше видны только выбранные сейчас условия.
  const set = (patch) => onChange({ ...row, ...patch, summary: undefined })
  const summaryText = (row.summary ?? []).join('; ')
  const inverted = spellLevelRangeInverted(row)

  return (
    <div className="space-y-3 rounded-lg border border-ember/40 bg-ember/5 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-100">Любое заклинание на выбор</p>
          {summaryText && <p className="mt-0.5 text-xs text-stone-400">{summaryText}</p>}
        </div>
        <button type="button" onClick={onRemove} className="catalog-delete-button" title="Удалить">
          <TrashIcon />
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="text-xs text-stone-400">
          <span className="mb-1 block">Уровень от</span>
          <Select value={row.min_level ?? ''} onChange={(e) => set({ min_level: e.target.value || null })}>
            <option value="">Любой</option>
            {SPELL_LEVELS.map((level) => (
              <option key={level} value={level}>
                {spellLevelLabels[level]}
              </option>
            ))}
          </Select>
        </div>
        <div className="text-xs text-stone-400">
          <span className="mb-1 block">Уровень до</span>
          <Select value={row.max_level ?? ''} onChange={(e) => set({ max_level: e.target.value || null })}>
            <option value="">Любой</option>
            {SPELL_LEVELS.map((level) => (
              <option key={level} value={level}>
                {spellLevelLabels[level]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {inverted && <p className="text-xs text-red-300">«От» не может быть выше «до».</p>}

      <div className="space-y-1.5">
        <FilterCheckbox checked={Boolean(row.castable_only)} onChange={(v) => set({ castable_only: v })}>
          Только уровня, который персонаж может накладывать (заговоры — всегда)
        </FilterCheckbox>
        <FilterCheckbox checked={Boolean(row.ritual_only)} onChange={(v) => set({ ritual_only: v })}>
          Только ритуалы
        </FilterCheckbox>
      </div>

      <div>
        <p className="mb-1.5 text-xs text-stone-400">Школы (ни одной — любая)</p>
        <div className="flex flex-wrap gap-1.5">
          {SPELL_SCHOOLS.map((school) => (
            <FilterChip
              key={school}
              active={(row.schools ?? []).includes(school)}
              onClick={() => set({ schools: toggleIn(row.schools, school) })}
            >
              {spellSchoolLabels[school]}
            </FilterChip>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs text-stone-400">Из списков классов (ни одного — любой класс)</p>
        <div className="flex flex-wrap gap-1.5">
          {classes.map((c) => (
            <FilterChip
              key={c.id}
              active={(row.class_ids ?? []).includes(c.id)}
              onClick={() => set({ class_ids: toggleIn(row.class_ids, c.id) })}
            >
              {c.name}
            </FilterChip>
          ))}
          {classes.length === 0 && <span className="text-xs text-stone-500">Загрузка классов…</span>}
        </div>
      </div>
    </div>
  )
}

// allowOpen — редактор открыт для варианта группы выбора: там можно добавить
// «любое заклинание на выбор» (spell_id: null, не больше одного на вариант) —
// само заклинание игрок выберет, когда будет выбирать вариант.
export function SpellEffectsEditor({ rows = [], onChange, onHide, onSelectSpell, allowOpen = false }) {
  const spellNames = useSpellNames(rows.map((row) => row.spell_id))
  const { data: classes = [] } = useClasses({ size: 100 })
  const nameOf = (id) => spellNames[Number(id)] ?? `заклинание #${id}`
  const hasOpen = rows.some(isOpenSpellEffect)
  const remove = (i) => onChange(rows.filter((_, j) => j !== i))

  return <Section title="Заклинания" count={rows.length} empty="Заклинаний нет" onHide={onHide}
    addControl={
      <>
        <AddButton onClick={onSelectSpell} title="Добавить заклинание" />
        {allowOpen && (
          <AddButton onClick={() => onChange([...rows, newOpenSpellEffect()])} disabled={hasOpen} title="+ Любое заклинание" />
        )}
      </>
    }>
    {rows.map((row, i) =>
      isOpenSpellEffect(row) ? (
        <OpenSpellRow
          key={i}
          row={row}
          classes={classes}
          onChange={(next) => onChange(rows.map((r, j) => (j === i ? next : r)))}
          onRemove={() => remove(i)}
        />
      ) : (
        <RowShell key={i} onRemove={() => remove(i)}>
          <span className="min-w-0 self-center truncate text-sm text-stone-200">{nameOf(row.spell_id)}</span>
          <BlankSlot />
          <BlankSlot />
        </RowShell>
      ),
    )}
  </Section>
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
