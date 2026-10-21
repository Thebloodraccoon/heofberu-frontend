import { useId, useState } from 'react'
import { Input, RichText } from '@/components/ui'
import { normalizeScaling, scalingError, scalingMarkdown, stepBelowMin } from '@/lib/utils/featureScaling.js'
import EditorAddButton from './EditorAddButton.jsx'
import { SectionTitle, TrashIcon } from './editorShared.jsx'

const LEVEL_MAX = 20
const EMPTY = { label: '', steps: [] }

// Ступени по уровню, недозаполненные (без уровня) — в конце, порядок ввода сохраняем.
const sortSteps = (steps) =>
  steps
    .map((step, i) => ({ step, i }))
    .sort((a, b) => (a.step.level ?? Infinity) - (b.step.level ?? Infinity) || a.i - b.i)
    .map(({ step }) => step)

// Черновик растущей строки особенности: { label, steps: [{ level, value }] }
// — по строке на ступень. minLevel — уровень самой особенности (если есть):
// раньше него строка начинаться не может.
// (см. lib/utils/featureScaling.js). Контролируемый — наружу уходит каждый
// ввод, нормализацию и сохранение делает FeaturesModal. actions — кнопки
// «Сохранить/Отменить» в режиме правки: под карточкой, чтобы снятую строку
// («Убрать строку» сворачивает карточку) тоже можно было сохранить.
export default function FeatureScalingEditor({ value, onChange, minLevel = null, actions = null }) {
  const draft = value ?? EMPTY
  const steps = draft.steps ?? []
  const hasContent = steps.length > 0 || (draft.label ?? '') !== ''
  const [expanded, setExpanded] = useState(hasContent)
  const [focusIndex, setFocusIndex] = useState(null)
  const labelId = useId()
  const error = scalingError(draft, minLevel)
  const preview = normalizeScaling(draft)

  const setLabel = (label) => onChange({ ...draft, label })
  const setStep = (i, patch) => onChange({ ...draft, steps: steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) })
  const removeStep = (i) => onChange({ ...draft, steps: steps.filter((_, j) => j !== i) })
  const sortOnBlur = () => onChange({ ...draft, steps: sortSteps(steps) })

  const addStep = () => {
    const last = steps.reduce((max, s) => (s.level != null && s.level > max ? s.level : max), 0)
    const level = last > 0 ? Math.min(LEVEL_MAX, last + 1) : minLevel ?? 1
    setFocusIndex(steps.length)
    onChange({ ...draft, steps: [...steps, { level, value: '' }] })
  }

  const start = () => {
    setExpanded(true)
    setFocusIndex(0)
    onChange({ label: draft.label ?? '', steps: steps.length > 0 ? steps : [{ level: minLevel ?? 1, value: '' }] })
  }

  const clear = () => {
    setExpanded(false)
    onChange(EMPTY)
  }

  const removeButton = expanded && (
    <button type="button" onClick={clear} className="text-xs text-stone-500 transition hover:text-red-300">
      Убрать строку
    </button>
  )

  return (
    <section>
      <SectionTitle button={removeButton}>Растёт с уровнем</SectionTitle>

      {!expanded ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-stone-700 px-4 py-3">
          <p className="min-w-0 flex-1 text-sm text-stone-400">
            С уровнем меняется одна величина — кость, число очков, бонус? Опишите лесенку, и на листе персонажа
            покажется значение для его уровня.
            <span className="mt-0.5 block text-xs text-stone-500">Например: Доп. хиты — 1к6 → 1к8 → 1к10 → 1к12</span>
          </p>
          <EditorAddButton onClick={start}>Добавить строку</EditorAddButton>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
          <div>
            <label htmlFor={labelId} className="mb-1 block text-xs text-stone-400">
              Что растёт
            </label>
            <div className="flex items-center gap-2">
              <Input
                id={labelId}
                className="min-w-0 flex-1"
                value={draft.label ?? ''}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Например, Доп. хиты"
                maxLength={100}
              />
              {steps.length < LEVEL_MAX && (
                <EditorAddButton onClick={addStep} className="shrink-0">
                  Уровень
                </EditorAddButton>
              )}
            </div>
          </div>

          <div>
            <span className="mb-1 block text-xs text-stone-400">
              Значения по уровням
              {minLevel != null && <span className="text-stone-500"> · не раньше {minLevel}-го — с него даётся умение</span>}
            </span>
            <ul className="space-y-1.5">
              {steps.map((step, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="shrink-0 text-xs text-stone-500">с</span>
                  <Input
                    type="number"
                    min={minLevel ?? 1}
                    max={LEVEL_MAX}
                    className={`!w-16 shrink-0 text-center ${stepBelowMin(step, minLevel) ? '!border-red-500' : ''}`}
                    value={step.level ?? ''}
                    onChange={(e) => setStep(i, { level: e.target.value === '' ? null : Number(e.target.value) })}
                    onBlur={sortOnBlur}
                    autoFocus={focusIndex === i}
                    aria-label={`Уровень ступени ${i + 1}`}
                  />
                  <span className="shrink-0 text-xs text-stone-500">ур. →</span>
                  <Input
                    className="min-w-0 flex-1 font-semibold"
                    value={step.value ?? ''}
                    onChange={(e) => setStep(i, { value: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && i === steps.length - 1) {
                        e.preventDefault()
                        addStep()
                      }
                    }}
                    placeholder="Например, 1к6"
                    maxLength={100}
                    aria-label={`Значение ступени ${i + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    className="catalog-delete-button shrink-0"
                    title="Убрать уровень"
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs text-stone-500">Enter в последнем значении добавляет следующий уровень.</p>
          </div>

          {error ? (
            <p className="text-xs text-red-400">{error}</p>
          ) : (
            preview && (
              <div className="rounded-md border border-stone-800 bg-stone-950/40 px-3 py-2">
                <span className="mb-0.5 block text-[11px] uppercase tracking-wide text-stone-500">Так увидят в каталоге</span>
                <RichText value={scalingMarkdown(preview)} className="text-sm text-stone-300" />
              </div>
            )
          )}
        </div>
      )}

      {actions && <div className="mt-2 flex justify-end gap-2">{actions}</div>}
    </section>
  )
}
