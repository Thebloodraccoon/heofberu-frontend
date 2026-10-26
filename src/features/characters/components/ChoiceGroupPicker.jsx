/* eslint-disable react-refresh/only-export-components */
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { useItemNames, useSkills, useSpellsById } from '@/features/catalog/queries.js'
import { spellLevelLabels, spellSchoolLabels } from '@/lib/i18n/index.js'
import { describeEffectBundle, describeEffectParts } from '@/lib/utils/effectBundle.js'
import { useState } from 'react'
import { ExpandToggle, SpellDetailFetched } from './SpellQuickView.jsx'
import {
  OpenAbilityPicks,
  OpenItemPicks,
  OpenSkillPicks,
  OpenSpellPicks,
  groupComplete,
  isOptionAvailable,
  isOptionPicked,
  optionNeedsAbility,
  optionNeedsItem,
  optionNeedsSkill,
  optionNeedsSpell,
  toggleOption,
  toolRows,
} from './choiceAnswers.jsx'

// Единый вид выбора на персонаже: группа «выберите N из M» карточками с
// отметкой справа. Все выборы персонажа делаются в «Выборах»
// (PendingChoicesModal) — менять вид выборов нужно здесь.

const CHOICE_TYPE_LABELS = {
  ABILITY_SCORE: 'Характеристика',
  SKILL: 'Навык',
  SAVING_THROW: 'Спасбросок',
  ARMOR: 'Доспехи',
  WEAPON: 'Оружие',
  TOOL: 'Инструменты',
  SPELL: 'Заклинание',
}

// «1 вариант / 2 варианта / 5 вариантов».
const variantsWord = (n) => {
  const tens = n % 100
  const ones = n % 10
  if (tens >= 11 && tens <= 14) return 'вариантов'
  if (ones === 1) return 'вариант'
  if (ones >= 2 && ones <= 4) return 'варианта'
  return 'вариантов'
}

// Подпись под названием варианта: для одного конкретного заклинания —
// «8 уровень · Очарование», для прочих вариантов пусто.
function optionMeta(option, spellsById) {
  const spells = option.spell_effects ?? []
  if (spells.length !== 1 || spells[0].spell_id == null) return null
  const spell = spellsById[spells[0].spell_id]
  if (!spell) return null
  return [spellLevelLabels[spell.level], spellSchoolLabels[spell.school]].filter(Boolean).join(' · ')
}

// Справочники для подписей вариантов. Заклинания из вариантов грузим по id
// (имя, уровень, школа) — весь каталог заклинаний ради подписей не нужен.
export function useChoiceCatalogs(groups = []) {
  const { data: skillsCatalog = [] } = useSkills({ size: 100 })
  const spellIds = groups.flatMap((g) =>
    (g.options ?? []).flatMap((o) => (o.spell_effects ?? []).map((e) => e.spell_id)),
  )
  const spellsById = useSpellsById(spellIds)
  const itemNames = useItemNames(
    groups.flatMap((g) =>
      (g.options ?? []).flatMap((o) =>
        [...(o.weapon_effects ?? []), ...(o.armor_effects ?? []), ...toolRows(o)].map((e) => e.item_id),
      ),
    ),
  )
  const names = {
    skillNames: Object.fromEntries(skillsCatalog.map((s) => [s.id, s.name])),
    spellNames: Object.fromEntries(Object.entries(spellsById).map(([id, s]) => [id, s.name])),
    itemNames,
  }
  return { skillsCatalog, spellsById, names }
}

// Заголовок группы: тип, черта и счётчик «0 / 1» (зеленеет, когда набрано).
// open задан — группа сворачивается, слева стрелка.
export function ChoiceGroupHeader({ label, picked, total, done, hint, open }) {
  return (
    <>
      <div className="mb-1 flex items-center gap-3">
        {open !== undefined && (
          <LoreIcon name="chevron" className={`text-stone-500 transition-transform ${open ? 'rotate-90' : ''}`} />
        )}
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">{label}</p>
        <span className="h-px flex-1 bg-stone-700/70" aria-hidden="true" />
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
            done ? 'bg-emerald-500/15 text-emerald-300' : 'bg-stone-800 text-stone-400'
          }`}
        >
          {done && <LoreIcon name="check" className="size-3" />}
          {Math.min(picked, total)} / {total}
        </span>
      </div>
      {hint && <p className="mb-2 text-sm text-stone-400">{hint}</p>}
    </>
  )
}

// Одна карточка варианта. multi — квадратная отметка (выбор нескольких),
// иначе круглая. children — то, что раскрывается под выбранной карточкой
// (выбор навыка/заклинания для открытого варианта). detail — то, что можно
// прочитать, не выбирая (описание заклинания): стрелка стоит вне <label>,
// поэтому чтение не переключает выбор.
export function ChoiceCard({
  name,
  multi = false,
  selected,
  blocked = false,
  locked = false,
  detailName = '',
  title,
  meta,
  note,
  onToggle,
  detail = null,
  detailOpen = false,
  onToggleDetail,
  children,
}) {
  return (
    <div
      className={`rounded-xl border transition ${
        blocked
          ? 'border-dashed border-stone-800 bg-stone-900/30'
          : selected
            ? 'border-ember/80 bg-ember/10'
            : 'border-stone-700 bg-stone-800/40 hover:border-ember/50 hover:bg-stone-800/70'
      }`}
    >
      <div className="flex items-center">
        {locked ? (
          <div className="min-w-0 flex-1 px-3 py-2.5">
            <span className="block break-words text-sm font-medium text-orange-100">{title}</span>
            {meta && <span className="mt-0.5 block text-xs text-stone-400">{meta}</span>}
          </div>
        ) : (
        <label className={`flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 ${blocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          <input
            type={multi ? 'checkbox' : 'radio'}
            name={name}
            checked={selected}
            disabled={blocked}
            onChange={onToggle}
            className="peer sr-only"
          />
          <span className="min-w-0 flex-1">
            <span
              className={`block break-words text-sm font-medium ${
                blocked ? 'text-stone-500' : selected ? 'text-orange-100' : 'text-stone-100'
              }`}
            >
              {title}
            </span>
            {meta && <span className="mt-0.5 block text-xs text-stone-400">{meta}</span>}
            {note && <span className="mt-0.5 block text-xs text-stone-500">{note}</span>}
          </span>
          <span
            className={`flex size-5 shrink-0 items-center justify-center border transition peer-focus-visible:ring-2 peer-focus-visible:ring-ember/60 ${
              multi ? 'rounded' : 'rounded-full'
            } ${selected ? 'border-ember bg-ember text-stone-950' : blocked ? 'border-stone-800' : 'border-stone-600'}`}
            aria-hidden="true"
          >
            {selected && <LoreIcon name="check" className="size-3.5" />}
          </span>
        </label>
        )}
        {detail && (
          <div className="pr-2">
            <ExpandToggle open={detailOpen} onClick={onToggleDetail} name={detailName || (typeof title === 'string' ? title : '')} />
          </div>
        )}
      </div>
      {detail && detailOpen && detail}
      {children && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

// Вариант с одним конкретным заклинанием — его id (для описания под карточкой).
const singleSpellId = (option) => {
  const spells = option.spell_effects ?? []
  return spells.length === 1 && spells[0].spell_id != null ? spells[0].spell_id : null
}

// Название варианта: один эффект — текстом, несколько — плашками (строка через
// запятую из пяти доспехов не читается).
function OptionTitle({ option, names }) {
  const parts = describeEffectParts(option, names)
  if (parts.length <= 1) return parts[0] ?? '—'
  return (
    <span className="flex flex-wrap gap-1.5">
      {parts.map((part, i) => (
        <span key={i} className="rounded bg-stone-800 px-1.5 py-0.5 text-xs font-normal text-stone-200">
          {part}
        </span>
      ))}
    </span>
  )
}

// Подписи для итога группы: к справочникам добавляем то, что игрок назвал из
// allowed_spells / allowed_items (их нет в каталожных names).
function pickNames(group, names) {
  const options = group.options ?? []
  const spells = options.flatMap((o) => o.allowed_spells ?? [])
  const items = options.flatMap((o) => o.allowed_items ?? [])
  return {
    ...names,
    spellNames: { ...names.spellNames, ...Object.fromEntries(spells.map((x) => [x.id, x.name])) },
    itemNames: { ...names.itemNames, ...Object.fromEntries(items.map((x) => [x.id, x.name])) },
  }
}

// Свёрнутая готовая группа — одной строкой: выбранные варианты с тем, что игрок назвал.
export function groupSummary(group, list, names) {
  const named = pickNames(group, names)
  return list
    .map((a) => {
      const option = (group.options ?? []).find((o) => o.id === a.choice_option_id)
      if (!option) return null
      const bundle = {
        ...option,
        picked_skill_id: a.skill_id,
        picked_spell_id: a.spell_id,
        picked_ability: a.ability,
        picked_item_id: a.item_id,
      }
      return describeEffectBundle(bundle, named)
    })
    .filter(Boolean)
    .join('; ')
}

// Группа выбора целиком: заголовок со счётчиком, подсказка и карточки
// вариантов. list — черновик ответов этой группы (см. choiceAnswers.jsx),
// onChange(list) — новый черновик. takenSpellIds / takenSkillIds — заклинания и
// навыки (takenItemIds — инструменты), уже названные в других группах того же гранта (PendingChoicesModal):
// здесь их не предлагаем, иначе бэк ответит 422.
// onToggleOpen задан — группа сворачивается (open — раскрыта ли): свёрнутая
// показывает итог выбора одной строкой. error — подсветка «здесь не всё выбрано»;
// sectionRef — чтобы форма прокрутила к группе.
export function ChoiceGroupPicker({
  group,
  list,
  onChange,
  catalogs,
  takenSpellIds,
  takenSkillIds,
  takenItemIds,
  open = true,
  onToggleOpen,
  error = false,
  sectionRef,
}) {
  const { skillsCatalog, spellsById, names } = catalogs
  const options = group.options ?? []
  const multi = group.pick_count > 1
  const [readingId, setReadingId] = useState(null)
  const done = groupComplete(list, group)
  // Вариантов ровно сколько выбрать и все уже взяты — выбирать нечего: без
  // отметок и подсказки «выберите 1 из 1», остаются только поля открытых вариантов.
  const fixed =
    options.length === group.pick_count &&
    options.every((o) => isOptionAvailable(o) && isOptionPicked(list, o.id))
  const label = CHOICE_TYPE_LABELS[group.choice_type] ?? group.choice_type
  const hint = fixed ? null : `Выберите ${group.pick_count} ${variantsWord(group.pick_count)} из ${options.length}`
  const header = (
    <ChoiceGroupHeader
      label={label}
      picked={list.length}
      total={group.pick_count}
      done={done}
      open={onToggleOpen ? open : undefined}
    />
  )

  return (
    <section
      ref={sectionRef}
      className={`scroll-mt-4 ${error ? '-mx-2 rounded-xl px-2 py-1 ring-1 ring-red-500/60' : ''}`}
    >
      {onToggleOpen ? (
        <button type="button" className="block w-full text-left" aria-expanded={open} onClick={onToggleOpen}>
          {header}
        </button>
      ) : (
        header
      )}
      {error && <p className="mb-2 text-sm text-red-300">Здесь ещё не всё выбрано.</p>}
      {!open && (
        <p className={`text-sm ${done ? 'text-stone-300' : 'text-stone-500'}`}>
          {done ? groupSummary(group, list, names) : 'Ещё не выбрано'}
        </p>
      )}
      {open && hint && <p className="mb-2 text-sm text-stone-400">{hint}</p>}
      {/* Один вариант — одна строка, для всех типов эффектов. */}
      {open && <div className="grid gap-2">
        {options.map((option) => {
          const selected = isOptionPicked(list, option.id)
          const available = isOptionAvailable(option)
          const needsSpell = optionNeedsSpell(option)
          const spellId = singleSpellId(option)
          const extra =
            selected && optionNeedsSkill(option) ? (
              <OpenSkillPicks
                group={group}
                option={option}
                list={list}
                skillsCatalog={skillsCatalog}
                takenSkillIds={takenSkillIds}
                onChange={onChange}
              />
            ) : selected && needsSpell ? (
              <OpenSpellPicks group={group} option={option} list={list} takenSpellIds={takenSpellIds} onChange={onChange} />
            ) : selected && optionNeedsAbility(option) ? (
              <OpenAbilityPicks group={group} option={option} list={list} onChange={onChange} />
            ) : selected && optionNeedsItem(option) ? (
              <OpenItemPicks group={group} option={option} list={list} takenItemIds={takenItemIds} onChange={onChange} />
            ) : null
          return (
            <ChoiceCard
              key={option.id}
              name={`group-${group.id}`}
              multi={multi}
              selected={selected}
              blocked={!available && !selected}
              locked={fixed}
              title={<OptionTitle option={option} names={names} />}
              detailName={spellId != null ? describeEffectBundle(option, names) : ''}
              meta={optionMeta(option, spellsById)}
              note={
                available
                  ? null
                  : needsSpell
                    ? 'Сейчас недоступно: нет подходящих заклинаний, которых у персонажа ещё нет'
                    : 'Сейчас недоступно: не подходит к владениям персонажа'
              }
              onToggle={() => onChange(toggleOption(list, group, option))}
              detail={spellId != null ? <SpellDetailFetched spellId={spellId} /> : null}
              detailOpen={readingId === option.id}
              onToggleDetail={() => setReadingId((current) => (current === option.id ? null : option.id))}
            >
              {extra}
            </ChoiceCard>
          )
        })}
      </div>}
    </section>
  )
}
