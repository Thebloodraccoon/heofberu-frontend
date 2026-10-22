/* eslint-disable react-refresh/only-export-components */
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { useItemNames, useSkills, useSpells, useSpellsById } from '@/features/catalog/queries.js'
import { spellLevelLabels, spellSchoolLabels } from '@/lib/i18n/index.js'
import { describeEffectBundle } from '@/lib/utils/effectBundle.js'
import { useState } from 'react'
import { ExpandToggle, SpellDetailFetched } from './SpellQuickView.jsx'
import {
  OpenAbilityPicks,
  OpenSkillPicks,
  OpenSpellPicks,
  groupComplete,
  isOptionAvailable,
  isOptionPicked,
  optionNeedsAbility,
  optionNeedsSkill,
  optionNeedsSpell,
  toggleOption,
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

// Справочники для подписей вариантов. Каталог заклинаний приходит одной
// страницей (100) — заклинания из вариантов догружаем по id, чтобы не терять
// их имена, уровень и школу на длинном списке.
export function useChoiceCatalogs(groups = []) {
  const { data: skillsCatalog = [] } = useSkills({ size: 100 })
  const { data: spellsCatalog = [] } = useSpells({ size: 100 })
  const spellIds = groups.flatMap((g) =>
    (g.options ?? []).flatMap((o) => (o.spell_effects ?? []).map((e) => e.spell_id)),
  )
  const spellsById = useSpellsById(spellIds)
  const itemNames = useItemNames(
    groups.flatMap((g) =>
      (g.options ?? []).flatMap((o) => [...(o.weapon_effects ?? []), ...(o.armor_effects ?? [])].map((e) => e.item_id)),
    ),
  )
  const names = {
    skillNames: Object.fromEntries(skillsCatalog.map((s) => [s.id, s.name])),
    spellNames: {
      ...Object.fromEntries(spellsCatalog.map((s) => [s.id, s.name])),
      ...Object.fromEntries(Object.entries(spellsById).map(([id, s]) => [id, s.name])),
    },
    itemNames,
  }
  return { skillsCatalog, spellsCatalog, spellsById, names }
}

// Заголовок группы: тип, черта и счётчик «0 / 1» (зеленеет, когда набрано).
export function ChoiceGroupHeader({ label, picked, total, done, hint }) {
  return (
    <>
      <div className="mb-1 flex items-center gap-3">
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
        {detail && (
          <div className="pr-2">
            <ExpandToggle open={detailOpen} onClick={onToggleDetail} name={typeof title === 'string' ? title : ''} />
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

// Группа выбора целиком: заголовок со счётчиком, подсказка и карточки
// вариантов. list — черновик ответов этой группы (см. choiceAnswers.jsx),
// onChange(list) — новый черновик. takenSpellIds / takenSkillIds — заклинания и
// навыки, уже названные в других группах того же гранта (PendingChoicesModal):
// здесь их не предлагаем, иначе бэк ответит 422.
export function ChoiceGroupPicker({ group, list, onChange, catalogs, takenSpellIds, takenSkillIds }) {
  const { skillsCatalog, spellsById, names } = catalogs
  const options = group.options ?? []
  const multi = group.pick_count > 1
  const [readingId, setReadingId] = useState(null)

  return (
    <section>
      <ChoiceGroupHeader
        label={CHOICE_TYPE_LABELS[group.choice_type] ?? group.choice_type}
        picked={list.length}
        total={group.pick_count}
        done={groupComplete(list, group)}
        hint={`Выберите ${group.pick_count} ${variantsWord(group.pick_count)} из ${options.length}`}
      />
      {/* Один вариант — одна строка, для всех типов эффектов. */}
      <div className="grid gap-2">
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
            ) : null
          return (
            <ChoiceCard
              key={option.id}
              name={`group-${group.id}`}
              multi={multi}
              selected={selected}
              blocked={!available && !selected}
              title={describeEffectBundle(option, names)}
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
      </div>
    </section>
  )
}
