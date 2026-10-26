/* eslint-disable react-refresh/only-export-components */
import { Fragment, useState } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { abilityLabels, spellLevelLabels } from '@/lib/i18n/index.js'
import { spellMetaText } from '@/lib/utils/spellFilter.js'
import { ExpandToggle, SpellDetailFetched } from './SpellQuickView.jsx'
import ChipGroup from '@/components/ui/ChipGroup.jsx'
import SheetDrawer from '@/components/sheet/SheetDrawer.jsx'

const SPELL_LEVELS = ['CANTRIP', ...Array.from({ length: 9 }, (_, i) => `LEVEL_${i + 1}`)]

// Черновик ответов на ОДНУ группу выбора — список записей
// { key, choice_option_id, skill_id, spell_id, ability, item_id }. Ключ свой у каждой записи:
// открытый вариант («любой навык на выбор») можно взять несколько раз с
// разными навыками («два любых навыка» = один вариант, pick_count = 2),
// поэтому одного choice_option_id для адресации записи мало.
// Используются «Выборами» (PendingChoicesModal) через ChoiceGroupPicker.

let lastKey = 0
const newAnswer = (optionId) => ({ key: ++lastKey, choice_option_id: optionId, skill_id: null, spell_id: null, ability: null, item_id: null })

// Навык у открытого варианта называет игрок. Ожидающие выборы несут флаг
// needs_skill, а варианты из деталей черты (каталог) — нет: там узнаём по
// эффекту навыка без skill_id.
export const optionNeedsSkill = (option) =>
  option.needs_skill ?? (option.skill_effects ?? []).some((effect) => effect.skill_id == null)

// То же для «любого заклинания на выбор» (заклинание без spell_id).
export const optionNeedsSpell = (option) =>
  option.needs_spell ?? (option.spell_effects ?? []).some((effect) => effect.spell_id == null)

// То же для «любой характеристики / любого спасброска на выбор» (ability: null).
const abilityRows = (option) => [...(option.ability_effects ?? []), ...(option.saving_throw_effects ?? [])]
export const optionNeedsAbility = (option) =>
  option.needs_ability ?? abilityRows(option).some((effect) => effect.ability == null)

// Эффекты-инструменты варианта: плоский tool_effects (если httpClient его
// разложил) или группа tool из effects.
export const toolRows = (option) =>
  option.tool_effects ?? (option.effects ?? []).filter((g) => g.effect_type === 'tool').flatMap((g) => g.items ?? [])

// То же для «любого инструмента на выбор» (инструмент без item_id).
export const optionNeedsItem = (option) =>
  option.needs_item ?? toolRows(option).some((effect) => effect.item_id == null)

// Бэк сверяет варианты навыков с остальными источниками персонажа: available:
// false — вариант сейчас взять нельзя (экспертиза без владения, владение,
// которое уже есть, и т.п.). У каталожных вариантов поля нет — считаем доступным.
export const isOptionAvailable = (option) => option.available !== false

export const isOptionPicked = (list, optionId) => list.some((a) => a.choice_option_id === optionId)

// Группа без настоящего выбора (вариантов ровно pick_count) — предвыбираем
// все её доступные варианты сразу, иначе кнопка «Подтвердить» остаётся
// заблокированной, а игроку не очевидно, что тут вообще нужно что-то кликнуть.
export function initialAnswers(groups = []) {
  const init = {}
  for (const group of groups) {
    const options = group.options ?? []
    if (options.length > 0 && options.length === group.pick_count && options.every(isOptionAvailable)) {
      init[group.id] = options.map((option) => newAnswer(option.id))
    }
  }
  return init
}

export function toggleOption(list, group, option) {
  if (isOptionPicked(list, option.id)) return list.filter((a) => a.choice_option_id !== option.id)
  if (!isOptionAvailable(option)) return list
  const next = group.pick_count === 1 ? [] : list
  if (next.length >= group.pick_count) return list
  return [...next, newAnswer(option.id)]
}

export const addAnswer = (list, group, option) =>
  list.length >= group.pick_count ? list : [...list, newAnswer(option.id)]

export const removeAnswer = (list, key) => list.filter((a) => a.key !== key)

export const patchAnswer = (list, key, patch) => list.map((a) => (a.key === key ? { ...a, ...patch } : a))

// Бэк может прислать обновлённый список допустимых (allowed_spells /
// allowed_skill_ids) уже после ответа игрока — выбранное могло из него выпасть.
// Списка нет — не проверяем.
const isAllowedSpell = (option, spellId) =>
  !Array.isArray(option.allowed_spells) || option.allowed_spells.some((s) => s.id === spellId)
const isAllowedSkill = (option, skillId) =>
  !Array.isArray(option.allowed_skill_ids) || option.allowed_skill_ids.includes(skillId)
const isAllowedItem = (option, itemId) =>
  !Array.isArray(option.allowed_items) || option.allowed_items.some((i) => i.id === itemId)

export function groupComplete(list, group) {
  if (list.length !== group.pick_count) return false
  return list.every((a) => {
    const option = (group.options ?? []).find((o) => o.id === a.choice_option_id)
    if (!option) return false
    if (optionNeedsSkill(option) && (a.skill_id == null || !isAllowedSkill(option, a.skill_id))) return false
    if (optionNeedsSpell(option) && (a.spell_id == null || !isAllowedSpell(option, a.spell_id))) return false
    if (optionNeedsAbility(option) && a.ability == null) return false
    if (optionNeedsItem(option) && (a.item_id == null || !isAllowedItem(option, a.item_id))) return false
    return true
  })
}

export const toAnswerItems = (groupId, list) =>
  list.map((a) => ({
    choice_group_id: groupId,
    choice_option_id: a.choice_option_id,
    ...(a.skill_id != null ? { skill_id: a.skill_id } : {}),
    ...(a.spell_id != null ? { spell_id: a.spell_id } : {}),
    ...(a.ability != null ? { ability: a.ability } : {}),
    ...(a.item_id != null ? { item_id: a.item_id } : {}),
  }))

// Каркас выбора для открытого варианта («любой навык» / «любое заклинание»):
// по записи на каждую ячейку, «+ Ещё …», пока группа не набрала pick_count, и
// «Убрать» у записи, когда их больше одной. Что показывать внутри записи, решает
// renderEntry({ entry, taken, update, remove }): taken — значения поля field,
// уже занятые другими записями этого варианта или другими группами гранта
// (takenElsewhere), update(patch) — правка этой записи.
const EMPTY_TAKEN = new Set()

export function OpenPickList({
  group,
  option,
  list,
  onChange,
  field,
  takenElsewhere = EMPTY_TAKEN,
  addLabel,
  className,
  renderEntry,
}) {
  const entries = list.filter((a) => a.choice_option_id === option.id)

  return (
    <div className={className}>
      {entries.map((entry) => {
        const taken = new Set([...entries.filter((e) => e.key !== entry.key).map((e) => e[field]), ...takenElsewhere])
        return (
          <Fragment key={entry.key}>
            {renderEntry({
              entry,
              taken,
              update: (patch) => onChange(patchAnswer(list, entry.key, patch)),
              remove: entries.length > 1 ? () => onChange(removeAnswer(list, entry.key)) : null,
            })}
          </Fragment>
        )
      })}
      {group.pick_count > 1 && list.length < group.pick_count && (
        <Button type="button" variant="ghost" size="xs" onClick={() => onChange(addAnswer(list, group, option))}>
          {addLabel}
        </Button>
      )}
    </div>
  )
}

// Выбор навыка для каждой записи открытого варианта: по одному селекту на
// запись. Список навыков сужен до allowed_skill_ids (если бэк его прислал), и
// навык, уже названный в другой записи этого варианта или в другой группе
// гранта (takenSkillIds), повторно не предлагается.
export function OpenSkillPicks({ group, option, list, skillsCatalog, takenSkillIds, onChange }) {
  const allowed = Array.isArray(option.allowed_skill_ids) ? new Set(option.allowed_skill_ids) : null

  return (
    <OpenPickList
      group={group}
      option={option}
      list={list}
      onChange={onChange}
      field="skill_id"
      takenElsewhere={takenSkillIds}
      addLabel="+ Ещё навык"
      className="mt-1.5 space-y-1.5"
      renderEntry={({ entry, taken, update, remove }) => (
        <div className="flex items-center gap-2">
          <Select
            className="min-w-0 flex-1"
            value={entry.skill_id ?? ''}
            onChange={(e) => update({ skill_id: e.target.value ? Number(e.target.value) : null })}
            placeholder="Выберите навык…"
          >
            {skillsCatalog
              .filter((s) => (!allowed || allowed.has(s.id)) && !taken.has(s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </Select>
          {remove && (
            <Button type="button" variant="ghost" size="xs" onClick={remove}>
              Убрать
            </Button>
          )}
        </div>
      )}
    />
  )
}

// Выбор характеристики для каждой записи открытого варианта («любая
// характеристика / любой спасбросок на выбор») — чипами. Характеристику, которую
// вариант уже называет сам или которая выбрана в другой записи, повторно не
// предлагаем — бэк такое не примет.
export function OpenAbilityPicks({ group, option, list, onChange }) {
  const own = new Set(abilityRows(option).map((effect) => effect.ability).filter(Boolean))

  return (
    <OpenPickList
      group={group}
      option={option}
      list={list}
      onChange={onChange}
      field="ability"
      addLabel="+ Ещё характеристика"
      className="mt-1.5 space-y-1.5"
      renderEntry={({ entry, taken, update, remove }) => (
        <div className="flex items-center gap-2">
          <ChipGroup
            label="Характеристика"
            className="min-w-0 flex-1"
            options={Object.entries(abilityLabels)
              .filter(([key]) => !own.has(key) && (!taken.has(key) || key === entry.ability))
              .map(([value, label]) => ({ value, label }))}
            value={entry.ability ?? ''}
            onChange={(ability) => update({ ability })}
          />
          {remove && (
            <Button type="button" variant="ghost" size="xs" onClick={remove}>
              Убрать
            </Button>
          )}
        </div>
      )}
    />
  )
}

// Выбор инструмента для каждой записи открытого варианта («любой музыкальный
// инструмент»): кандидаты — allowed_items от бэка; уже названный в другой записи
// или группе гранта (takenItemIds) инструмент повторно не предлагаем.
export function OpenItemPicks({ group, option, list, takenItemIds, onChange }) {
  const allowed = option.allowed_items ?? []

  return (
    <OpenPickList
      group={group}
      option={option}
      list={list}
      onChange={onChange}
      field="item_id"
      takenElsewhere={takenItemIds}
      addLabel="+ Ещё инструмент"
      className="mt-1.5 space-y-1.5"
      renderEntry={({ entry, taken, update, remove }) => (
        <div className="flex items-center gap-2">
          <Select
            className="min-w-0 flex-1"
            value={entry.item_id ?? ''}
            onChange={(e) => update({ item_id: e.target.value ? Number(e.target.value) : null })}
            placeholder="Выберите инструмент…"
          >
            {allowed
              .filter((it) => !taken.has(it.id))
              .map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name}
                </option>
              ))}
          </Select>
          {remove && (
            <Button type="button" variant="ghost" size="xs" onClick={remove}>
              Убрать
            </Button>
          )}
        </div>
      )}
    />
  )
}

// Список подходящих заклинаний — отдельной панелью поверх «Выборов» (в самой
// группе сотня строк перегружает форму): поиск, уровни чипами (если их больше
// одного), любое можно раскрыть и прочитать, не выбирая.
function SpellPickDrawer({ spells, onPick, onClose }) {
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const levels = [...new Set(spells.map((s) => s.level))].sort((x, y) => SPELL_LEVELS.indexOf(x) - SPELL_LEVELS.indexOf(y))
  const q = query.trim().toLowerCase()
  const shown = spells.filter((s) => (!level || s.level === level) && (!q || s.name.toLowerCase().includes(q)))

  return (
    <SheetDrawer
      title="Выбор заклинания"
      subtitle={`Подходит: ${spells.length}`}
      onClose={onClose}
      footer={<Button variant="ghost" onClick={onClose}>Отмена</Button>}
    >
      <div className="space-y-3">
        <Input type="search" placeholder="Найти заклинание…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {levels.length > 1 && (
          <ChipGroup
            label="Уровень"
            emptyLabel="Все"
            options={[{ value: '', label: 'Все' }, ...levels.map((l) => ({ value: l, label: spellLevelLabels[l] ?? l }))]}
            value={level}
            onChange={setLevel}
          />
        )}
        <ul className="space-y-1">
          {shown.map((spell) => {
            const open = expandedId === spell.id
            return (
              <li key={spell.id} className={`rounded-md ${open ? 'bg-stone-800/50' : ''}`}>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onPick(spell.id)}
                    className="flex min-w-0 flex-1 items-baseline justify-between gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-stone-800"
                  >
                    <span className="min-w-0 truncate text-sm text-stone-100">{spell.name}</span>
                    <span className="shrink-0 text-xs text-stone-500">{spellMetaText(spell)}</span>
                  </button>
                  <ExpandToggle open={open} onClick={() => setExpandedId(open ? null : spell.id)} name={spell.name} />
                </div>
                {open && (
                  <>
                    <SpellDetailFetched spellId={spell.id} />
                    <div className="flex justify-end px-3 pb-2">
                      <Button type="button" size="xs" onClick={() => onPick(spell.id)}>
                        Выбрать
                      </Button>
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ul>
        {shown.length === 0 && <p className="px-2 py-1.5 text-xs text-stone-500">Ничего не найдено</p>}
      </div>
    </SheetDrawer>
  )
}

// Одна «пустая ячейка» открытого варианта: пока заклинание не выбрано — кнопка
// «Выбрать заклинание» (список — в SpellPickDrawer), после — карточка выбранного
// с «Изменить». Описание выбранного раскрывается стрелкой.
function OpenSpellEntry({ spells, picked, onPick, onRemove }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const removeButton = onRemove && (
    <Button type="button" variant="ghost" size="xs" onClick={onRemove}>
      Убрать
    </Button>
  )

  return (
    <>
      {picked ? (
        <div className="rounded-lg border border-ember/50 bg-stone-900/60">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-orange-100">{picked.name}</p>
              <p className="text-xs text-stone-400">{spellMetaText(picked)}</p>
            </div>
            <ExpandToggle open={detailOpen} onClick={() => setDetailOpen((v) => !v)} name={picked.name} />
            <Button type="button" variant="ghost" size="xs" onClick={() => setPickerOpen(true)}>
              Изменить
            </Button>
            {removeButton}
          </div>
          {detailOpen && <SpellDetailFetched spellId={picked.id} />}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="xs" onClick={() => setPickerOpen(true)} disabled={spells.length === 0}>
            Выбрать заклинание
          </Button>
          <span className="text-xs text-stone-500">{spells.length ? `подходит: ${spells.length}` : 'подходящих нет'}</span>
          {removeButton}
        </div>
      )}
      {pickerOpen && (
        <SpellPickDrawer
          spells={spells}
          onPick={(spellId) => {
            onPick(spellId)
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  )
}

// Выбор заклинания для каждой записи открытого варианта («любое заклинание на
// выбор»): по ячейке на запись. Заклинание, уже выбранное в другой ячейке или в
// другой группе гранта (takenSpellIds), повторно не предлагается.
export function OpenSpellPicks({ group, option, list, takenSpellIds, onChange }) {
  const allowed = option.allowed_spells ?? []
  const byId = new Map(allowed.map((s) => [s.id, s]))

  return (
    <OpenPickList
      group={group}
      option={option}
      list={list}
      onChange={onChange}
      field="spell_id"
      takenElsewhere={takenSpellIds}
      addLabel="+ Ещё заклинание"
      className="mt-1.5 space-y-2"
      renderEntry={({ entry, taken, update, remove }) => (
        <OpenSpellEntry
          spells={allowed.filter((s) => !taken.has(s.id))}
          picked={byId.get(entry.spell_id)}
          onPick={(spellId) => update({ spell_id: spellId })}
          onRemove={remove}
        />
      )}
    />
  )
}
