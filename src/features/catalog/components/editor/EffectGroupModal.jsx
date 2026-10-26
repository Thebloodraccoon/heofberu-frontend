import SpellPickerModal from './SpellPickerModal.jsx'
import Drawer, { DrawerFooter } from '@/components/ui/Drawer.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { useState } from 'react'
import { Button, Modal } from '@/components/ui'
import { AddButton, EFFECT_TYPES, EMPTY_OPTION_EFFECTS, invalidSpeedRow } from './effectTypeEditors.jsx'
import EffectRowsPicker from './EffectRowsPicker.jsx'
import { hasRowsPicker } from './effectRowPickers.js'
import { TrashIcon } from './editorShared.jsx'
import { spellLevelRangeInverted } from '@/lib/utils/spellFilter.js'
import { NumberStepper } from './LevelField.jsx'

// Один вариант внутри группы выбора: у опции нет названия (ChoiceOptionPayload
// не поддерживает label) — только порядковый номер и строки эффекта того же
// типа, что и вся группа (например, у группы «Характеристики» каждый вариант —
// это набор строк ability_effects).
function ChoiceOption({ index, option, effectType, Editor, onChange, onRemove, onSelectSpell, onOpenPicker }) {
  return (
    <div className="space-y-2 rounded-lg border border-stone-700/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[18px] font-medium text-stone-300">Вариант {index + 1}</p>
        <button
          type="button"
          onClick={onRemove}
          className="catalog-delete-button"
          title="Удалить вариант"
        >
          <TrashIcon />
        </button>
      </div>
      <Editor allowOpen onSelectSpell={onSelectSpell} onOpenPicker={onOpenPicker} rows={option[effectType] ?? []} onChange={(rows) => onChange({ ...option, [effectType]: rows })} />
    </div>
  )
}

// Модальное окно для одной группы эффектов особенности — и статичной, и
// группы выбора. Два шага: сначала выбор типа эффекта (только при добавлении
// новой группы — у существующей тип уже зафиксирован), потом форма.
function EffectScreen({ subtitle, onClose, footer, children, navigating, summary }) {
  return <section className={`catalog-effect-screen${navigating ? ' catalog-effect-screen--picker' : ''}`}>
    {!navigating && <button type="button" className="article-back" onClick={onClose}><LoreIcon name="back" /> К эффектам</button>}
    {!navigating && summary && <div className="mt-3">{summary}</div>}
    {!navigating && subtitle && <p className="mb-4 text-sm text-stone-400">{subtitle}</p>}
    {children}
    {footer && <DrawerFooter className="catalog-effect-actions">{footer}</DrawerFooter>}
  </section>
}

export default function EffectGroupModal({
  inline = false,
  drawer = false,
  summary,
  mode, // 'static' | 'choice'
  effectType: initialType = null,
  availableTypes = [],
  initialRows = [],
  initialGroup = null,
  allowEmpty = false, // статичный список можно сохранить пустым (бонусы расы: убрать все)
  editorProps = {}, // доп. пропсы редактора статичных строк (AbilityEffectsEditor withCap, sectionTitle)
  title = null, // своя шапка панели вместо названия типа эффекта
  onSave,
  onClose,
}) {
  // Выбор «во весь экран панели»: либо заклинание, либо список навыков/
  // спасбросков. target — 'static' или индекс варианта группы выбора.
  const [picker, setPicker] = useState(null)
  const navigating = picker !== null
  const [effectType, setEffectType] = useState(initialType)
  const [rows, setRows] = useState(initialRows)
  const [group, setGroup] = useState(() => initialGroup ?? { pick_count: 1, options: [] })

  const Container = inline ? EffectScreen : drawer ? Drawer : Modal

  const rowsFor = (target) => (target === 'static' ? rows : group.options[target]?.[effectType] ?? [])
  const setRowsFor = (target, next) =>
    target === 'static'
      ? setRows(next)
      : setGroup((current) => ({
          ...current,
          options: current.options.map((option, index) =>
            index === target ? { ...option, [effectType]: next } : option,
          ),
        }))
  // mode — какой экран открыть, если у типа их несколько (у оружия: категории
  // или конкретное оружие); onClick без аргумента-строки даёт экран по умолчанию.
  const openPickerFor = (target) =>
    hasRowsPicker(effectType)
      ? (mode) => setPicker({ kind: 'rows', target, mode: typeof mode === 'string' ? mode : null })
      : undefined

  if (!effectType) {
    return (
      <Container
        className={drawer ? 'catalog-editor-drawer' : undefined}
        closeLabel="Закрыть редактор эффектов"
        summary={summary}
        title={mode === 'static' ? 'Добавить статичный эффект' : 'Добавить выбор эффектов'}
        subtitle="Выберите тип эффекта"
        onClose={onClose}
        size="sm"
      >
        <div className="flex flex-col gap-1.5">
          {availableTypes.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setEffectType(t.key)}
              className="rounded-lg border border-stone-700/60 px-3 py-2 text-left text-sm text-stone-200 transition hover:border-ember/50 hover:bg-stone-800"
            >
              {t.label}
            </button>
          ))}
          {availableTypes.length === 0 && (
            <p className="text-sm text-stone-500">Все типы эффектов уже использованы.</p>
          )}
        </div>
      </Container>
    )
  }

  const typeDef = EFFECT_TYPES.find((t) => t.key === effectType)
  const Editor = typeDef.Editor

  const save = () => {
    if (mode === 'static') onSave(effectType, rows)
    else onSave(effectType, { ...group, effect_type: effectType })
  }

  // «От» выше «до» у фильтра «любого заклинания» бэк не примет (422).
  const invertedSpellRange = (group.options ?? []).some((option) =>
    (option.spell_effects ?? []).some(spellLevelRangeInverted),
  )
  const canSave = mode === 'static'
    ? (allowEmpty || rows.length > 0) && !(effectType === 'speed_effects' && rows.some(invalidSpeedRow))
    : group.options.length > 0 && !invertedSpellRange

  return (
    <Container
      className={drawer ? 'catalog-editor-drawer' : undefined}
      closeLabel="Закрыть редактор эффектов"
      summary={summary}
      navigating={navigating}
      bodyClassName={navigating ? 'grant-picker-body' : undefined}
      title={title ?? typeDef.label}
      subtitle={mode === 'choice' ? 'Группа выбора' : undefined}
      onClose={onClose}
      size="lg"
      scroll
      footer={navigating ? <Button type="button" variant={picker.kind === 'rows' ? undefined : 'ghost'} onClick={() => setPicker(null)}>{picker.kind === 'rows' ? 'Готово' : 'Закрыть'}</Button> :
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" onClick={save} disabled={!canSave}>
            Сохранить
          </Button>
        </>
      }
    >
      {navigating ? (
        picker.kind === 'rows' ? (
          <EffectRowsPicker
            effectType={effectType}
            rows={rowsFor(picker.target)}
            onChange={(next) => setRowsFor(picker.target, next)}
            onClose={() => setPicker(null)}
            mode={picker.mode}
          />
        ) : (
          <SpellPickerModal
            inline
            excludeIds={rowsFor(picker.target).map((row) => row.spell_id)}
            onClose={() => setPicker(null)}
            onPick={(spell) => setRowsFor(picker.target, [...rowsFor(picker.target), { spell_id: spell.id }])}
          />
        )
      ) : mode === 'static' ? (
        // Название раздела («Владение доспехами») видно и в панели — рядом с кнопками «Категория»/«Добавить».
        <Editor {...editorProps} onSelectSpell={() => setPicker({ kind: 'spell', target: 'static' })} onOpenPicker={openPickerFor('static')} rows={rows} onChange={setRows} />
      ) : (
        <div className="space-y-3">
          {/* «Выбрать N» слева, «Добавить» напротив — на одной строке. */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-stone-300">
              Выбрать
              <NumberStepper hideLabel required label="Сколько выбрать" min={1} max={10} value={group.pick_count ?? 1} onChange={(n) => setGroup({ ...group, pick_count: n })} />
            </div>
            <AddButton
              onClick={() => setGroup({ ...group, options: [...group.options, EMPTY_OPTION_EFFECTS()] })}
              title="Добавить"
              ariaLabel="Добавить вариант"
            />
          </div>

          <div className="space-y-3">
            {group.options.map((option, oi) => (
              <ChoiceOption
                key={oi}
                onSelectSpell={() => setPicker({ kind: 'spell', target: oi })}
                onOpenPicker={openPickerFor(oi)}
                index={oi}
                option={option}
                effectType={effectType}
                Editor={Editor}
                onChange={(next) =>
                  setGroup({ ...group, options: group.options.map((o, j) => (j === oi ? next : o)) })
                }
                onRemove={() => setGroup({ ...group, options: group.options.filter((_, j) => j !== oi) })}
              />
            ))}
          </div>
          {group.options.length === 0 && (
            <p className="text-xs text-stone-500">Добавьте хотя бы один вариант выбора.</p>
          )}
        </div>
      )}
    </Container>
  )
}
