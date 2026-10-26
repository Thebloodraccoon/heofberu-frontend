import { useId, useState } from 'react'
import { Input, RichText } from '@/components/ui'
import { normalizeScaling, scalingError, scalingMarkdown, stepBelowMin } from '@/lib/utils/featureScaling.js'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import EditorAddButton from './EditorAddButton.jsx'
import { SectionTitle, TrashIcon } from './editorShared.jsx'
import LevelField from './LevelField.jsx'

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
    onChange({ ...draft, steps: [...steps, { level, value: '' }] })
  }

  const start = () => {
    setExpanded(true)
    onChange({ label: draft.label ?? '', steps: steps.length > 0 ? steps : [{ level: minLevel ?? 1, value: '' }] })
  }

  const clear = () => {
    setExpanded(false)
    onChange(EMPTY)
  }

  // Справа в шапке: «Добавить», а когда строка есть — на том же месте «Убрать».
  const headerButton = expanded
    ? <button type="button" onClick={clear} className="catalog-add-button" aria-label="Убрать строку"><LoreIcon name="close" />Убрать</button>
    : <EditorAddButton onClick={start} aria-label="Добавить строку">Добавить</EditorAddButton>

  return (
    <section>
      <SectionTitle button={headerButton}>Растёт с уровнем</SectionTitle>

      {!expanded ? (
        <p className="text-sm text-stone-400">
          С уровнем меняется одна величина — кость, число очков, бонус? Опишите лесенку, и на листе персонажа
          покажется значение для его уровня.
          <span className="mt-0.5 block text-xs text-stone-500">Например: Доп. хиты — 1к6 → 1к8 → 1к10 → 1к12</span>
        </p>
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
                  {/* Порядок ступеней — по уровню: пересортировка, когда фокус ушёл из поля. */}
                  <div onBlur={sortOnBlur} className={`shrink-0 ${stepBelowMin(step, minLevel) ? 'rounded ring-1 ring-red-500' : ''}`}>
                    <LevelField hideLabel required suffix="" label={`Уровень ступени ${i + 1}`} min={minLevel ?? 1} value={step.level ?? null} onChange={(level) => setStep(i, { level })} />
                  </div>
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
