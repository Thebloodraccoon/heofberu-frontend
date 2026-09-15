import { useState } from 'react'
import { Button, Input, Modal } from '@/components/ui'
import { AddButton, EFFECT_TYPES, EMPTY_OPTION_EFFECTS } from './effectTypeEditors.jsx'
import { TrashIcon } from './editorShared.jsx'

// Один вариант внутри группы выбора: у опции нет названия (ChoiceOptionPayload
// не поддерживает label) — только порядковый номер и строки эффекта того же
// типа, что и вся группа (например, у группы «Характеристики» каждый вариант —
// это набор строк ability_effects).
function ChoiceOption({ index, option, effectType, Editor, onChange, onRemove }) {
  return (
    <div className="space-y-2 rounded-lg border border-stone-700/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-stone-300">Вариант {index + 1}</p>
        <button
          type="button"
          onClick={onRemove}
          className="my-[5px] inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded border border-red-800 text-red-300 transition hover:bg-red-950/50"
          title="Удалить вариант"
        >
          <TrashIcon />
        </button>
      </div>
      <Editor rows={option[effectType] ?? []} onChange={(rows) => onChange({ ...option, [effectType]: rows })} />
    </div>
  )
}

// Модальное окно для одной группы эффектов особенности — и статичной, и
// группы выбора. Два шага: сначала выбор типа эффекта (только при добавлении
// новой группы — у существующей тип уже зафиксирован), потом форма.
export default function EffectGroupModal({
  mode, // 'static' | 'choice'
  effectType: initialType = null,
  availableTypes = [],
  initialRows = [],
  initialGroup = null,
  onSave,
  onClose,
}) {
  const [effectType, setEffectType] = useState(initialType)
  const [rows, setRows] = useState(initialRows)
  const [group, setGroup] = useState(() => initialGroup ?? { pick_count: 1, options: [] })

  if (!effectType) {
    return (
      <Modal
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
      </Modal>
    )
  }

  const typeDef = EFFECT_TYPES.find((t) => t.key === effectType)
  const Editor = typeDef.Editor

  const save = () => {
    if (mode === 'static') onSave(effectType, rows)
    else onSave(effectType, { ...group, effect_type: effectType })
  }

  const canSave = mode === 'static' ? rows.length > 0 : group.options.length > 0

  return (
    <Modal
      title={typeDef.label}
      subtitle={mode === 'choice' ? 'Группа выбора' : 'Статичный эффект'}
      onClose={onClose}
      size="lg"
      scroll
      footer={
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
      {mode === 'static' ? (
        <Editor rows={rows} onChange={setRows} />
      ) : (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-stone-300">
            Выбрать
            <Input
              type="number"
              min={1}
              max={10}
              value={group.pick_count ?? 1}
              onChange={(e) => setGroup({ ...group, pick_count: Math.max(1, Number(e.target.value) || 1) })}
              className="input-narrow w-16"
            />
          </label>

          <div className="space-y-3">
            {group.options.map((option, oi) => (
              <ChoiceOption
                key={oi}
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
            <AddButton
              onClick={() => setGroup({ ...group, options: [...group.options, EMPTY_OPTION_EFFECTS()] })}
              title="+ Добавить вариант"
            />
          </div>
          {group.options.length === 0 && (
            <p className="text-xs text-stone-500">Добавьте хотя бы один вариант выбора.</p>
          )}
        </div>
      )}
    </Modal>
  )
}
