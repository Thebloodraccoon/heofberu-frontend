import EditorAddButton from './EditorAddButton.jsx'
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  abilityLabels,
  armorClassModeLabels,
  armorProficiencyLabels,
  effectConditionLabels,
  skillEffectModeHints,
  skillEffectModeLabels,
  speedEffectModeLabels,
  speedTypeLabels,
  spellLevelLabels,
  spellSchoolLabels,
  sentenceCase,
  toolCategoryLabels,
  weaponProficiencyLabels,
} from '@/lib/i18n/index.js'
import { describeArmorClassEffect, describeSpeedEffect, describeToolEffect } from '@/lib/utils/effectBundle.js'
import { normalizeEffects } from '@/lib/utils/featureEffects.js'
import { Button, Select } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import EditorFieldControl, { BlurNumberInput, SectionTitle, TrashIcon } from './editorShared.jsx'
import LevelField, { NumberStepper } from './LevelField.jsx'
import ChipGroup from '@/components/ui/ChipGroup.jsx'
import { useClasses, useItemNames, useSkills, useSpellNames } from '@/features/catalog/queries.js'
import {
  SPELL_LEVELS,
  SPELL_SCHOOLS,
  describeOpenSpell,
  isOpenSpellEffect,
  newOpenSpellEffect,
  spellLevelRangeInverted,
} from '@/lib/utils/spellFilter.js'

// Редакторы по одному типу эффекта (характеристики/навыки/спасброски/доспехи/
// оружие/заклинания) — общий строительный блок и для статичных эффектов
// особенности, и для формы одного варианта внутри группы выбора. Вынесены
// сюда, чтобы EffectGroupModal и FeatureEffectsEditor не дублировали код.

export function AddButton({ onClick, disabled, title, ariaLabel }) {
  return <EditorAddButton onClick={onClick} disabled={disabled} aria-label={ariaLabel}>{title}</EditorAddButton>
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
export function PickerMenu({ options, onPick, disabled, addLabel, ariaLabel, searchable, onSearchChange, onOpenChange, loading = false, hasMore = false, onMore, error, onRetry }) {
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
      <AddButton onClick={() => { const next = !open; setOpen(next); onOpenChange?.(next) }} disabled={disabled} title={addLabel} ariaLabel={ariaLabel} />
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

// Статичный эффект: заголовок панели — уже имя типа, в разделе его не повторяем
// (EffectGroupModal оборачивает редактор в SectionTitleHidden).
export const SectionTitleHidden = createContext(false)

// forceTitle — показать title и внутри панели (там, где тип уже в шапке, но раздел назван иначе).
export function Section({ title, count, empty, addControl, onHide, forceTitle = false, children }) {
  const hideTitle = useContext(SectionTitleHidden) && !forceTitle
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
        {hideTitle ? null : title}
      </SectionTitle>
      {count === 0 ? (
        <p className="text-sm text-stone-500">{empty}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  )
}

// allowOpen — вариант группы выбора: можно добавить «любую характеристику на
// выбор» (ability: null, не больше одной на вариант) — игрок назовёт её сам.
// withCap=false — без «нового максимума»; sectionTitle — своё название раздела, видимое и в
// панели (бонусы характеристик расы/подрасы).
export function AbilityEffectsEditor({ rows = [], onChange, onHide, onOpenPicker, allowOpen = false, withCap = true, sectionTitle }) {
  const used = new Set(rows.map((r) => r.ability))
  const options = Object.entries(abilityLabels).map(([k, v]) => ({
    key: k,
    label: v,
    disabled: used.has(k),
  }))
  const usedUp = options.every((o) => o.disabled)
  const add = (ability) => onChange([...rows, { ability, amount: 1, new_cap: null }])
  const hasOpen = rows.some((r) => r.ability == null)

  return (
    <Section
      title={sectionTitle ?? 'Изменение характеристик'}
      forceTitle={!!sectionTitle}
      count={rows.length}
      empty="Увеличений нет"
      onHide={onHide}
      addControl={
        // В панели эффектов выбор уезжает на отдельный экран со списком
        // (onOpenPicker); уже добавленную характеристику там выбрать нельзя —
        // у строки своя величина и свой предел.
        <>
          {onOpenPicker
            ? <AddButton onClick={onOpenPicker} title="Добавить" ariaLabel="Добавить увеличение" />
            : <PickerMenu options={options} onPick={add} disabled={usedUp} addLabel="Добавить" ariaLabel="Добавить увеличение" />}
          {allowOpen && <AddButton onClick={() => add(null)} disabled={hasOpen} title="+ Любая характеристика" />}
        </>
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
            {row.ability == null ? 'Любая на выбор' : abilityLabels[row.ability] ?? row.ability}
          </span>
          <NumberStepper hideLabel required label="Величина бонуса" min={-5} max={5} value={Number(row.amount) || 0} onChange={(amount) => onChange(rows.map((r, j) => (j === i ? { ...r, amount } : r)))} />
          {withCap ? (
            <NumberStepper hideLabel label="Новый предел характеристики (20–30)" min={20} max={30} emptyText="новый макс." value={row.new_cap ?? null} onChange={(new_cap) => onChange(rows.map((r, j) => (j === i ? { ...r, new_cap } : r)))} />
          ) : <BlankSlot />}
        </RowShell>
      ))}
    </Section>
  )
}

// allowOpen — редактор открыт для варианта группы выбора: там можно добавить
// «любой навык на выбор» (skill_id: null, не больше одного на вариант) —
// конкретный навык игрок назовёт сам, когда будет выбирать вариант.
export function SkillEffectsEditor({ rows = [], onChange, onHide, onOpenPicker, allowOpen = false }) {
  const skillsQ = useSkills()
  const skills = (skillsQ.data ?? []).map((s) => ({ id: s.id, name: s.name }))
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
            ? <AddButton onClick={onOpenPicker} title="Добавить" ariaLabel="Добавить навык" />
            : <PickerMenu options={options} onPick={add} disabled={skills.length === 0} addLabel="Добавить" ariaLabel="Добавить навык" searchable />}
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

// allowOpen — вариант группы выбора: «любой спасбросок на выбор» (ability: null).
export function SavingThrowEffectsEditor({ rows = [], onChange, onHide, onOpenPicker, allowOpen = false }) {
  const used = new Set(rows.map((r) => r.ability))
  const options = Object.entries(abilityLabels).map(([k, v]) => ({ key: k, label: v, disabled: used.has(k) }))
  const usedUp = options.every((o) => o.disabled)
  const add = (ability) => onChange([...rows, { ability }])
  const hasOpen = rows.some((r) => r.ability == null)

  return (
    <Section
      title="Проверки спасброска"
      count={rows.length}
      empty="Спасбросков нет"
      onHide={onHide}
      addControl={
        <>
          {onOpenPicker
            ? <AddButton onClick={onOpenPicker} title="Добавить" ariaLabel="Добавить спасбросок" />
            : <PickerMenu options={options} onPick={add} disabled={usedUp} addLabel="Добавить" ariaLabel="Добавить спасбросок" />}
          {allowOpen && <AddButton onClick={() => add(null)} disabled={hasOpen} title="+ Любой спасбросок" />}
        </>
      }
    >
      {usedUp && rows.length > 0 && (
        <p className="pb-1 text-xs text-stone-500">Все характеристики уже добавлены — повтор невозможен.</p>
      )}
      {rows.map((row, i) => (
        <RowShell key={i} onRemove={() => onChange(rows.filter((_, j) => j !== i))}>
          <span className="min-w-0 self-center truncate text-sm text-stone-200">
            {row.ability == null ? 'Любой на выбор' : abilityLabels[row.ability] ?? row.ability}
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
  kinds: ['ARMOR'],
  categoryAddLabel: '+ Категория',
  itemAddLabel: 'Добавить',
  itemAddAria: 'Добавить доспех',
  itemFallback: 'доспех',
}

const WEAPON_EDITOR = {
  title: 'Владение оружием',
  empty: 'Оружия нет',
  categoryKey: 'weapon_category',
  categoryLabels: weaponProficiencyLabels,
  kinds: ['WEAPON'],
  categoryAddLabel: '+ Категория',
  itemAddLabel: 'Добавить',
  itemAddAria: 'Добавить оружие',
  itemFallback: 'оружие',
}

// Строка — категория или конкретный предмет; выбор — экранами панели эффектов
// (onOpenPicker('categories' | 'items')): поиск, фильтры и подгрузка там.
function CategoryOrItemEditor({ config, rows = [], onChange, onHide, onOpenPicker }) {
  const { categoryKey, categoryLabels, itemFallback } = config
  const itemNames = useItemNames(rows.map((r) => r.item_id))
  const usedUp = Object.keys(categoryLabels).every((k) => rows.some((r) => r.item_id == null && r[categoryKey] === k))

  return (
    <Section
      title={config.title}
      count={rows.length}
      empty={config.empty}
      onHide={onHide}
      addControl={
        <>
          <AddButton onClick={() => onOpenPicker?.('categories')} title={config.categoryAddLabel} />
          <AddButton onClick={() => onOpenPicker?.('items')} title={config.itemAddLabel} ariaLabel={config.itemAddAria} />
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

// Инструменты. Фиксированный эффект — только конкретные инструменты. В варианте
// выбора два режима (чипы): «Любой» — открытый выбор игрока (item_id: null),
// при желании сужённый до вида (tool_category; ни одного — любой инструмент),
// и «Инструмент» — конкретные инструменты из справочника (экран 'items').
// Строки наружу те же, что и раньше; смена режима заменяет строки варианта.
export function ToolEffectsEditor({ rows = [], onChange, onOpenPicker, allowOpen = false }) {
  const hideTitle = useContext(SectionTitleHidden)
  const itemNames = useItemNames(rows.map((r) => r.item_id))
  const openRow = rows.find((r) => r.item_id == null)
  const [mode, setMode] = useState(openRow ? 'any' : 'item')
  const anyMode = allowOpen && mode === 'any'
  const itemRows = rows.filter((r) => r.item_id != null)
  const remove = (row) => onChange(rows.filter((r) => r !== row))
  const setCategory = (category) => onChange([{ tool_category: category, item_id: null }])
  const chooseAny = () => {
    setMode('any')
    if (!openRow) setCategory(null)
  }
  const chooseItem = () => {
    setMode('item')
    onChange(itemRows)
  }

  return (
    <div>
      <SectionTitle button={!anyMode && <AddButton onClick={() => onOpenPicker?.('items')} title="Добавить" ariaLabel="Добавить инструмент" />}>
        {hideTitle ? null : 'Владение инструментами'}
      </SectionTitle>
      {allowOpen && (
        <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Какой инструмент">
          <FilterChip active={anyMode} onClick={chooseAny}>Любой</FilterChip>
          <FilterChip active={!anyMode} onClick={chooseItem}>Инструмент</FilterChip>
        </div>
      )}
      {anyMode ? (
        <div className="space-y-2">
          <p className="text-xs text-stone-400">Вид инструмента (ни одного — любой)</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Вид инструмента">
            {Object.entries(toolCategoryLabels).map(([value, text]) => (
              <FilterChip
                key={value}
                active={openRow?.tool_category === value}
                onClick={() => setCategory(openRow?.tool_category === value ? null : value)}
              >
                {text}
              </FilterChip>
            ))}
          </div>
          <EffectPreview>{sentenceCase(describeToolEffect(openRow))}</EffectPreview>
        </div>
      ) : itemRows.length === 0 ? (
        <p className="text-sm text-stone-500">Инструментов нет</p>
      ) : (
        <div className="space-y-2">
          {itemRows.map((row) => (
            <RowShell key={row.item_id} onRemove={() => remove(row)}>
              <span className="min-w-0 self-center truncate text-sm text-stone-200">{describeToolEffect(row, itemNames)}</span>
              <BlankSlot />
              <BlankSlot />
            </RowShell>
          ))}
        </div>
      )}
    </div>
  )
}

// Подписанное поле строки эффекта скорости/КД.
// group — внутри чипы/−/+: div, а не label (label отдаёт :hover первой кнопке).
function LabeledField({ label, children, className = '', group = false }) {
  const Tag = group ? 'div' : 'label'
  return (
    <Tag className={`flex min-w-0 flex-col gap-1 text-xs text-stone-500 ${className}`}>
      {label}
      {children}
    </Tag>
  )
}

// Итог строки человеческим языком — та же формулировка, что в сводке и на листе.
function EffectPreview({ children }) {
  return <p className="rounded bg-stone-800/60 px-2 py-1 text-sm text-stone-200">{children}</p>
}

// Общие поля эффектов скорости и КД: когда действует и с какого уровня.
function ConditionField({ row, set }) {
  return (
    <LabeledField group label="Когда действует">
      <ChipGroup label="Когда действует" options={Object.entries(effectConditionLabels).map(([value, label]) => ({ value, label }))} value={row.condition ?? 'NONE'} onChange={(condition) => set({ condition })} />
    </LabeledField>
  )
}

function MinLevelField({ row, set }) {
  return (
    <LabeledField group label="С уровня персонажа">
      <LevelField hideLabel label="С уровня персонажа" emptyText="Всегда" value={row.min_level ?? null} onChange={(level) => set({ min_level: level })} />
    </LabeledField>
  )
}

// Список эффектов скорости/КД: строка — итог человеческим языком + «Изменить»
// (форма во выезжающей панели справа) + корзина. «+ …» открывает ту же панель
// для новой строки. Черновик живёт в панели: «Отмена» его отбрасывает, «Готово»
// кладёт в rows через onChange — данные наружу те же, что и раньше.
function DrawerRowsEditor({ rows, onChange, onHide, title, empty, addLabel, drawerTitle, newRow, describe, invalid = () => false, Form }) {
  const [editing, setEditing] = useState(null) // { index: number | null, draft }
  const set = (patch) => setEditing((e) => ({ ...e, draft: { ...e.draft, ...patch } }))
  const done = () => {
    const { index, draft } = editing
    onChange(index == null ? [...rows, draft] : rows.map((r, j) => (j === index ? draft : r)))
    setEditing(null)
  }
  return (
    <>
    <Section title={title} count={rows.length} empty={empty} onHide={onHide}
      addControl={<AddButton onClick={() => setEditing({ index: null, draft: newRow() })} title="Добавить" ariaLabel={`Добавить: ${addLabel}`} />}>
      {rows.map((row, i) => (
        <div key={row.id ?? `new-${i}`} className="flex items-center gap-2 rounded-lg border border-stone-700/60 bg-stone-900/60 p-2">
          <span className={`min-w-0 flex-1 text-sm ${invalid(row) ? 'text-red-300' : 'text-stone-200'}`}>{describe(row)}</span>
          <Button type="button" variant="ghost" size="xs" onClick={() => setEditing({ index: i, draft: row })} aria-label={`Изменить: ${describe(row)}`}>
            Изменить
          </Button>
          <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="catalog-delete-button" title="Удалить">
            <TrashIcon />
          </button>
        </div>
      ))}
    </Section>
    {/* Вне Section: у пустого списка Section не рисует детей, а новая строка — тоже через панель. */}
    {editing && (
        <Drawer
          title={drawerTitle}
          closeLabel={`Закрыть: ${drawerTitle}`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Отмена</Button>
              <Button type="button" onClick={done} disabled={invalid(editing.draft)}>Готово</Button>
            </>
          }
        >
          <div className="grid gap-3">
            <Form row={editing.draft} set={set} />
            <EffectPreview>{describe(editing.draft)}</EffectPreview>
          </div>
        </Drawer>
      )}
    </>
  )
}

// Две строки: что за скорость и что с ней сделать; затем условие, под ним значение и уровень.
// Строка полей формы; не помещается (−/+ уровня, чипы) — переносится.
const FORM_ROW = 'flex flex-wrap items-end gap-3'

function SpeedForm({ row, set }) {
  const mode = row.mode ?? 'BONUS'
  const needsValue = mode === 'BONUS' || mode === 'SET'
  return (
    <>
      <div className="grid gap-3">
        {mode !== 'IGNORE_ARMOR_PENALTY' && (
          <LabeledField group label="Скорость">
            <EditorFieldControl field={{ type: 'chips', label: 'Скорость', options: Object.entries(speedTypeLabels).map(([value, label]) => ({ value, label })) }} value={row.speed_type ?? 'WALK'} onChange={(speed_type) => set({ speed_type })} />
          </LabeledField>
        )}
        <LabeledField group label="Действие">
          <EditorFieldControl field={{ type: 'chips', label: 'Действие', options: Object.entries(speedEffectModeLabels).map(([value, label]) => ({ value, label })) }} value={mode} onChange={(next) => set({ mode: next })} />
        </LabeledField>
      </div>
      <ConditionField row={row} set={set} />
      <div className={FORM_ROW}>
        {needsValue && (
          <LabeledField label={mode === 'SET' ? 'Не меньше, фт' : 'Прибавка, фт'}>
            <BlurNumberInput min={-200} max={200} value={row.value} onChange={(next) => set({ value: Number(next) || 0 })} className="input-base" />
          </LabeledField>
        )}
        <MinLevelField row={row} set={set} />
      </div>
      {invalidSpeedRow(row) && (
        <p className="text-xs text-red-300">
          {mode === 'SET' ? 'Для «Не меньше» нужна скорость больше 0.' : 'Выберите вид скорости, отличный от ходьбы.'}
        </p>
      )}
    </>
  )
}

// Скорость (только фиксированный эффект): что сделать с одним видом скорости.
export function SpeedEffectsEditor({ rows = [], onChange, onHide }) {
  return (
    <DrawerRowsEditor
      rows={rows}
      onChange={onChange}
      onHide={onHide}
      title="Скорость"
      empty="Эффектов скорости нет"
      addLabel="Скорость"
      drawerTitle="Эффект скорости"
      newRow={() => ({ speed_type: 'WALK', mode: 'BONUS', value: 10, condition: 'NONE', min_level: null })}
      describe={describeSpeedEffect}
      invalid={invalidSpeedRow}
      Form={SpeedForm}
    />
  )
}

const toggleAbility = (list = [], value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

// Сначала условие, под ним значение и уровень одной строкой; ниже — вид эффекта
// (бонус / формула) и доп. настройки формулы; итог-строка — ниже формы.
function ArmorClassForm({ row, set }) {
  const formula = row.mode === 'FORMULA'
  return (
    <>
      <ConditionField row={row} set={set} />
      <div className={FORM_ROW}>
        <LabeledField label={formula ? 'Основа КД' : 'Прибавка к КД'}>
          <BlurNumberInput min={-30} max={30} value={row.value} onChange={(next) => set({ value: Number(next) || 0 })} className="input-base" />
        </LabeledField>
        <MinLevelField row={row} set={set} />
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Вид эффекта КД">
        {Object.entries(armorClassModeLabels).map(([value, text]) => (
          <FilterChip
            key={value}
            active={(row.mode ?? 'BONUS') === value}
            onClick={() => set(value === 'FORMULA' ? { mode: 'FORMULA', value: 10 } : { mode: 'BONUS', value: 1, abilities: [] })}
          >
            {text}
          </FilterChip>
        ))}
      </div>
      {formula && (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-stone-500">+ модификаторы:</span>
            {Object.entries(abilityLabels).map(([ability, text]) => (
              <FilterChip key={ability} active={(row.abilities ?? []).includes(ability)} onClick={() => set({ abilities: toggleAbility(row.abilities, ability) })}>
                {text}
              </FilterChip>
            ))}
          </div>
          <FilterCheckbox checked={row.allows_shield ?? true} onChange={(allows_shield) => set({ allows_shield })}>
            Щит прибавляется к этой основе
          </FilterCheckbox>
        </>
      )}
    </>
  )
}

// КД (только фиксированный эффект): бонус «+N» или своя основа «база +
// модификаторы» (Защита без доспехов: 10 + Ловкость + Телосложение) — тогда
// лист возьмёт лучшую из основ (доспех / без доспеха / формулы).
export function ArmorClassEffectsEditor({ rows = [], onChange, onHide }) {
  return (
    <DrawerRowsEditor
      rows={rows}
      onChange={onChange}
      onHide={onHide}
      title="Класс доспеха"
      empty="Эффектов КД нет"
      addLabel="КД"
      drawerTitle="Эффект КД"
      newRow={() => ({ mode: 'BONUS', value: 1, abilities: [], allows_shield: true, condition: 'NONE', min_level: null })}
      describe={describeArmorClassEffect}
      Form={ArmorClassForm}
    />
  )
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

// Флажок-карточка — как у флагов свойства оружия (WeaponPropertiesPicker).
function FilterCheckbox({ checked, onChange, children }) {
  return (
    <label className="flex w-full cursor-pointer items-center gap-2 rounded border border-stone-700 bg-stone-800/70 px-3 py-2">
      <input type="checkbox" className="size-4 shrink-0 accent-ember" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm text-stone-200">{children}</span>
    </label>
  )
}

const toggleIn = (list = [], value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

// Короткое описание фильтра до сохранения (summary с бэка сбрасывается
// первой же правкой): уровни, флаги, школы, классы — части списком.
function draftFilterParts(row, classes) {
  const levels = [row.min_level, row.max_level].map((level) => (level ? spellLevelLabels[level] : '…'))
  const classNames = (row.class_ids ?? []).map((id) => classes.find((c) => c.id === id)?.name ?? `#${id}`)
  return [
    row.min_level && row.min_level === row.max_level
      ? levels[0]
      : row.min_level || row.max_level ? `уровень: ${levels.join(' – ')}` : null,
    row.castable_only ? 'если есть ячейки' : null,
    row.ritual_only ? 'ритуал' : null,
    (row.schools ?? []).length ? `школа: ${row.schools.map((s) => spellSchoolLabels[s]).join(', ')}` : null,
    classNames.length ? `классы: ${classNames.join(', ')}` : null,
  ].filter(Boolean)
}

// Как вариант увидит игрок — та же формулировка, что в сводке эффектов.
const openSpellPreview = (row, classes) => sentenceCase(describeOpenSpell({ summary: row.summary ?? draftFilterParts(row, classes) }))

// «Любое заклинание на выбор» — пустая ячейка, которую игрок заполнит сам,
// когда будет выбирать вариант. В строке — описание фильтра и кнопка
// «Настройки», сам фильтр — в панели справа поверх редактора. Пустой
// фильтр — любое заклинание из справочника (кроме уже известных персонажу).
function OpenSpellRow({ row, onChange, onRemove, classes }) {
  const [open, setOpen] = useState(false)
  // Сохранённая строка несёт summary (текст условий с бэка); любая правка
  // его сбрасывает — дальше видно описание текущего черновика.
  const set = (patch) => onChange({ ...row, ...patch, summary: undefined })
  const summaryText = (row.summary ?? draftFilterParts(row, classes)).join('; ')
  const inverted = spellLevelRangeInverted(row)

  return (
    <div className="flex items-start gap-2 rounded-lg border border-ember/40 bg-ember/5 p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-100">Любое заклинание на выбор</p>
        <p className={`mt-0.5 text-xs ${inverted ? 'text-red-300' : 'text-stone-400'}`}>
          {inverted ? '«От» не может быть выше «до» — откройте настройки.' : summaryText || 'Без ограничений'}
        </p>
      </div>
      <Button type="button" variant="ghost" size="xs" onClick={() => setOpen(true)}>
        Настройки
      </Button>
      <button type="button" onClick={onRemove} className="catalog-delete-button" title="Удалить">
        <TrashIcon />
      </button>
      {open && (
        <OpenSpellFilterPopup
          row={row}
          set={set}
          classes={classes}
          inverted={inverted}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

// Фильтр «любого заклинания» — выезжающая справа панель обычной ширины (это не
// панель одних фильтров) поверх панели эффектов; внизу — как вариант увидит
// игрок. Esc закрывает только её (стек Drawer).
function OpenSpellFilterPopup({ row, set, classes, inverted, onClose }) {
  return (
    <Drawer
      title="Любое заклинание на выбор"
      subtitle="Что игрок сможет выбрать"
      onClose={onClose}
      className="catalog-nested-drawer"
      bodyClassName="space-y-4"
      closeLabel="Закрыть настройки"
      footer={
        <Button type="button" onClick={onClose} disabled={inverted}>
          Готово
        </Button>
      }
    >
      {/* Как уровень у заклинания: полосы «[Любой][Заговор][1]…[9]». */}
      <div className="grid gap-3">
        {[['min_level', 'Уровень от'], ['max_level', 'Уровень до']].map(([key, text]) => (
          <LabeledField key={key} group label={text}>
            <EditorFieldControl
              field={{ type: 'chips', label: text, emptyLabel: 'Любой', options: [{ value: '', label: 'Любой' }, ...SPELL_LEVELS.map((level, i) => ({ value: level, label: i ? String(i) : spellLevelLabels[level] }))] }}
              value={row[key] ?? ''}
              onChange={(next) => set({ [key]: next || null })}
            />
          </LabeledField>
        ))}
      </div>
      {inverted && <p className="text-xs text-red-300">«От» не может быть выше «до».</p>}

      <div className="space-y-2">
        <FilterCheckbox checked={Boolean(row.castable_only)} onChange={(v) => set({ castable_only: v })}>
          Только если у персонажа есть ячейки этого уровня (заговоры — всегда)
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

      <div>
        <p className="mb-1.5 text-xs text-stone-400">Как увидит игрок</p>
        <EffectPreview>{openSpellPreview(row, classes)}</EffectPreview>
      </div>
    </Drawer>
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
        <AddButton onClick={onSelectSpell} title="Добавить" ariaLabel="Добавить заклинание" />
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
  { key: 'tool_effects', label: 'Владение инструментами', Editor: ToolEffectsEditor },
  { key: 'spell_effects', label: 'Заклинания', Editor: SpellEffectsEditor },
  // staticOnly — в группах выбора не бывает (у бэка нет такого choice_type).
  { key: 'speed_effects', label: 'Скорость', Editor: SpeedEffectsEditor, staticOnly: true },
  { key: 'armor_class_effects', label: 'Класс доспеха', Editor: ArmorClassEffectsEditor, staticOnly: true },
]

export const EMPTY_OPTION_EFFECTS = () => normalizeEffects()

// Строка скорости, которую бэк не примет (422): SET без положительного
// значения или «равна ходьбе» у самой ходьбы.
export const invalidSpeedRow = (row) =>
  (row.mode === 'SET' && !(Number(row.value) > 0)) || (row.mode === 'EQUAL_TO_WALK' && (row.speed_type ?? 'WALK') === 'WALK')
